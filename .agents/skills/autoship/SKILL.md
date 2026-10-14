---
name: autoship
description: Automate package releases with Autoship in Changesets repositories, or follow a documented repository-native release path when Autoship is incompatible.
allowed-tools: Bash(npx autoship@0.1.0:*), Bash(test:*), Bash(git:*), Bash(gh:*), Bash(npm:*), Bash(pnpm:*), Bash(node:*), Bash(rg:*), Bash(jq:*), Bash(mktemp:*)
---

# Automated Releases with Autoship

Autoship 0.1.0 assumes the configured target repository uses Changesets. Treat
version preparation, PR merging, and npm publishing as separate external
mutations. Confirm that the user's request authorizes each mutation before it
runs; `--yes` removes CLI prompts but never grants authorization.

## Route the target

Before any mutating Autoship command:

1. Read the repository alias from `~/.autoship/config.json` and resolve its
   `cloneUrl` and `baseBranch`.
2. Clone that exact target and branch into a temporary checkout.
3. Run all compatibility checks inside that checkout:

```bash
test -f .changeset/config.json
node -e \
  "const p=require('./package.json');
  process.exit(p.devDependencies?.['@changesets/cli'] ? 0 : 1)"
rg 'changesets/action' .github/workflows
```

Do not run the mutating stock command unless all three checks pass in the
configured target. Never add Changesets merely to satisfy this skill. Inspect
the target's existing release workflows and use a documented repository-native
route when any check fails.

Axie Tools is a documented non-Changesets target. Read and follow
[references/axie-tools.md](references/axie-tools.md).

## Compatible Changesets repositories

Read [references/configuration.md](references/configuration.md) before first-time
setup and [references/commands.md](references/commands.md) for CLI details.

```bash
# One-time interactive configuration
npx autoship@0.1.0 add myproject

# Interactive release
npx autoship@0.1.0 myproject

# Authorized, non-interactive patch release with a reviewed message
npx autoship@0.1.0 myproject -t patch -m "Fix release issue" -y
```

Omit `-m` only when `AI_GATEWAY_API_KEY` is available and AI-generated release
text is wanted. Use [references/ci-integration.md](references/ci-integration.md)
only when building CI for a compatible Changesets repository.

## Completion

Autoship clones the target, creates and merges a Changesets PR, waits for the
Version Packages PR, and merges that PR to trigger publishing. Do not report
success until the package version, dist-tag, Git tag, GitHub release, and source
commit independently agree. Report partial state exactly and do not retry a
publish blindly after npm accepted a package.

Typical successful output ends with:

```text
Release Complete!
The patch release has been published.
```

## Templates

- [templates/setup-repo.sh](templates/setup-repo.sh) writes configuration
  non-interactively and requires `jq`.
- [templates/automated-release.sh](templates/automated-release.sh) requires an
  explicit authorization marker and independently checks the configured target
  before running a compatible release with Autoship 0.1.0.
