#!/bin/bash
# Template: Automated Release
# Purpose: Fully automated release with no prompts
# Usage: ./automated-release.sh <repo-name> <release-type> [message]
# Requires: AUTOSHIP_RELEASE_AUTHORIZED=yes after the release is approved.
#
# Examples:
#   ./automated-release.sh myproject patch
#   ./automated-release.sh myproject minor
#   ./automated-release.sh myproject major "Breaking API changes"

set -euo pipefail

REPO="${1:?Usage: $0 <repo-name> <release-type> [message]}"
TYPE="${2:?Usage: $0 <repo-name> <release-type> [message]}"
MESSAGE="${3:-}"
CONFIG_FILE="${AUTOSHIP_CONFIG:-$HOME/.autoship/config.json}"

if [[ "${AUTOSHIP_RELEASE_AUTHORIZED:-}" != "yes" ]]; then
  echo "Error: set AUTOSHIP_RELEASE_AUTHORIZED=yes only after this release is approved" >&2
  exit 1
fi

# Validate release type
if [[ ! "$TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Error: release type must be patch, minor, or major"
  exit 1
fi

# Check requirements
if ! command -v gh &> /dev/null; then
  echo "Error: GitHub CLI (gh) is required"
  echo "Install: https://cli.github.com"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "Error: jq is required to validate the configured target" >&2
  exit 1
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Error: Autoship configuration not found: $CONFIG_FILE" >&2
  exit 1
fi

if ! gh auth status &> /dev/null; then
  echo "Error: GitHub CLI not authenticated"
  echo "Run: gh auth login"
  exit 1
fi

if [[ -z "$MESSAGE" && -z "${AI_GATEWAY_API_KEY:-}" ]]; then
  echo "Error: AI_GATEWAY_API_KEY environment variable not set"
  exit 1
fi

CLONE_URL=$(jq -er --arg repo "$REPO" '.repos[$repo].cloneUrl | strings | select(length > 0)' "$CONFIG_FILE") || {
  echo "Error: repository '$REPO' has no cloneUrl in $CONFIG_FILE" >&2
  exit 1
}
BASE_BRANCH=$(jq -er --arg repo "$REPO" '.repos[$repo].baseBranch | strings | select(length > 0)' "$CONFIG_FILE") || {
  echo "Error: repository '$REPO' has no baseBranch in $CONFIG_FILE" >&2
  exit 1
}

TARGET_DIR=$(mktemp -d)
trap 'rm -rf "$TARGET_DIR"' EXIT
git clone --quiet --depth 1 --branch "$BASE_BRANCH" --single-branch "$CLONE_URL" "$TARGET_DIR"

if ! test -f "$TARGET_DIR/.changeset/config.json" ||
   ! (cd "$TARGET_DIR" && node -e "const p=require('./package.json'); process.exit(p.devDependencies?.['@changesets/cli'] ? 0 : 1)") ||
   ! rg -q 'changesets/action' "$TARGET_DIR/.github/workflows"; then
  echo "Error: configured target is not compatible with stock Autoship" >&2
  exit 1
fi

# Run autoship
echo "Starting $TYPE release for $REPO..."

if [[ -n "$MESSAGE" ]]; then
  npx autoship@0.1.0 "$REPO" -t "$TYPE" -m "$MESSAGE" -y
else
  npx autoship@0.1.0 "$REPO" -t "$TYPE" -y
fi

echo "Release complete!"
