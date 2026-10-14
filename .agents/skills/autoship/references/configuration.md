# Configuration reference

Autoship stores repository aliases in `~/.autoship/config.json`:

```json
{
  "repos": {
    "myproject": {
      "owner": "example-owner",
      "repo": "example-repo",
      "baseBranch": "main",
      "cloneUrl": "https://github.com/example-owner/example-repo.git"
    }
  }
}
```

Use `npx autoship@0.1.0 add <name>` for interactive setup or the bundled
`templates/setup-repo.sh` for non-interactive setup. Do not print the config in
CI when it is supplied as a secret.

## Target requirements

Stock Autoship is authorized only when the configured target checkout has:

1. `@changesets/cli` in `devDependencies`.
2. `.changeset/config.json`.
3. A workflow that invokes `changesets/action`.
4. Version tags that Autoship can compare.

The target's Changesets workflow must independently use reviewed, commit-pinned
Actions, declare only the permissions it needs, and configure npm publishing
according to that repository's security model. This skill deliberately avoids
shipping a generic privileged workflow: copy the target's existing conventions
or follow current official Changesets and GitHub Actions documentation.
