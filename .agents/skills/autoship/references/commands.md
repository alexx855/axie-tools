# Command reference

Use the reviewed CLI version explicitly:

```bash
npx autoship@0.1.0 [repo] [options]
```

If `repo` is omitted, Autoship prompts for a configured alias.

## Release options

- `-t, --type <type>` selects `patch`, `minor`, or `major`.
- `-m, --message <message>` supplies reviewed release text and skips AI text
  generation.
- `-y, --yes` skips Autoship confirmations. It does not grant authorization.
- `-h, --help` displays help.
- `-V, --version` displays the installed version.

Run the target-checkout compatibility gate in `SKILL.md` before any release.

```bash
# Interactive release
npx autoship@0.1.0 myproject

# Authorized patch with reviewed release text
npx autoship@0.1.0 myproject -t patch -m "Fix login validation" -y
```

## Repository configuration

```bash
npx autoship@0.1.0 add myproject
npx autoship@0.1.0 list
```

`add` prompts for the GitHub owner, repository, and base branch. Configuration
is stored in `~/.autoship/config.json`.

Typical list output:

```text
Configured repositories:
  - myproject (example-owner/example-repo)
```

## Environment

- `AI_GATEWAY_API_KEY` is required only when `-m` is omitted.
- `GH_TOKEN` is optional when the local `gh` CLI is already authenticated.

Autoship exits nonzero for missing configuration, authentication failures,
failed checks, or an unavailable AI service. Treat a nonzero result and any
partially completed publish as state to audit, not as permission to retry.
