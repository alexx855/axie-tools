# Axie Tools Release Workflow

Axie Tools intentionally uses repository-native GitHub Actions instead of
Changesets. Stock Autoship 0.1.0 can still help frame the release audit, but its
mutating release command is incompatible because this repository has no
`@changesets/cli`, `.changeset/config.json`, or `changesets/action` workflow.
Do not migrate the repository merely to make Autoship run.

## Safety and authorization

- Refresh `origin/main` and tags before deciding the release delta.
- Preserve unrelated dirty paths. Use a focused branch or isolated worktree and
  stage exact files only.
- Do not run the interactive CLI, examples, or live integration tests during a
  release. They can approve contracts, buy assets, create or cancel orders, or
  transfer Axies on-chain.
- Do not request, print, or inspect `PRIVATE_KEY`,
  `MARKETPLACE_ACCESS_TOKEN`, or `SKYMAVIS_API_KEY`.
- Treat these as separate mutating boundaries: merging preparatory changes,
  dispatching the version workflow, merging its PR, and dispatching the publish
  workflow. Proceed only when the user's current request explicitly authorizes
  the relevant boundary.
- Never merge unrelated dependency-update PRs as part of a release.

## 1. Audit and validate

```bash
git fetch --prune origin --tags
git log --reverse --oneline v<current-version>..origin/main
git diff --stat v<current-version>..origin/main
npm view axie-tools version dist-tags --json
pnpm install --frozen-lockfile
pnpm run format:check
pnpm build
```

Review the actual commits and diff rather than inferring the bump solely from
commit prefixes. Confirm that `origin/main`, npm `latest`, and the newest release
tag all describe the same current version before proceeding.

## 2. Prepare the version PR

After any explicitly authorized preparatory PR is merged and `origin/main` is
refreshed, dispatch the repository's preparation workflow:

```bash
gh workflow run release.yml --ref main -f release_type=patch
```

Use `minor` or `major` only when the audited delta and user authorization call
for it. The workflow runs `pnpm version --no-git-tag-version`, pushes
`release/v<new-version>`, and opens a PR containing the `package.json` bump.

Wait for the workflow to complete, then verify the generated PR before merging:

- its base is `main` and head is exactly `release/v<new-version>`;
- the expected version is present;
- only `package.json` changed;
- required CI checks passed.

Merge only that version PR. Refresh `origin/main` and confirm the merged
`package.json` version before publishing.

## 3. Publish

Publishing is destructive and externally visible. After explicit authorization
and all version-PR gates pass, dispatch:

```bash
gh workflow run publish.yml --ref main -f npm_tag=latest
```

Use another dist-tag only when explicitly requested. The workflow builds the
package, publishes the current `main` version through npm trusted publishing,
pushes `v<new-version>`, and creates the GitHub release. Do not run `npm publish`
locally as a fallback without separate authorization.

## 4. Definitive completion gates

Do not report release success until all of these are independently verified:

1. The version PR is merged.
2. `package.json` on `origin/main` contains the new version.
3. `npm view axie-tools@<new-version> version` returns the new version.
4. `npm view axie-tools dist-tags.latest` returns the new version for a stable
   release.
5. Remote tag `v<new-version>` exists and points at the released main commit.
6. The GitHub release for `v<new-version>` exists.
7. Both workflow runs completed successfully.

If publishing succeeds but a later tag or GitHub-release step fails, report the
partial state exactly. Do not rerun the whole publish workflow because its
duplicate-package guard will reject the already published version; repair the
remaining release metadata only with explicit authorization.
