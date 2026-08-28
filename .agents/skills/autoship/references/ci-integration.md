# CI integration

Use stock Autoship in CI only for a configured target that passes the target-
checkout Changesets gate in `SKILL.md`. Non-Changesets repositories must use a
reviewed repository-native workflow such as
[axie-tools.md](axie-tools.md).

## Required controls

- Pin Autoship to the reviewed `0.1.0` release.
- Resolve and clone the configured target before checking for Changesets.
- Keep installation in a step with no release credentials.
- Pass workflow inputs through `env`, quote them, and validate them against
  explicit repository and release-type allowlists.
- Restrict label triggers to exact supported labels rather than matching an
  arbitrary `release:` prefix.
- Scope `AI_GATEWAY_API_KEY` and `GH_TOKEN` only to the release step.
- When using the built-in token, map `${{ github.token }}` to `GH_TOKEN` and
  declare `contents: write` and `pull-requests: write` permissions. Confirm the
  repository allows Actions to create and approve pull requests.
- Check out full history with `fetch-depth: 0` before comparing with tags, and
  handle repositories with no tags explicitly.
- GitHub-hosted runners already include `gh`; self-hosted runners must install
  it through their reviewed system-image process.

## Safe workflow shape

Keep the workflow repository-specific. A safe sequence is:

1. Validate the repository alias and release type without secrets.
2. Install `autoship@0.1.0` without secrets.
3. Resolve the alias from `AUTOSHIP_CONFIG`, clone the configured target, and
   run the three Changesets checks in that checkout.
4. Stop without mutation when the target is incompatible.
5. Run `npx autoship@0.1.0` with quoted, validated arguments and release secrets
   scoped only to that step.
6. Verify CI, PR merges, npm, dist-tags, tag, release, and source commit before
   reporting completion.

Avoid copying a generic workflow without filling in a repository allowlist and
reviewing the target's branch rules, npm trusted-publishing configuration, and
required checks.
