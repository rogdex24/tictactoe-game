#!/usr/bin/env bash
set -euo pipefail

export GOTOOLCHAIN="${GOTOOLCHAIN:-go1.25.0}"

SCRIPT_DIR="$(dirname "$0")"
REPO_ROOT="${SCRIPT_DIR}/.."
BACKEND_DIR="${REPO_ROOT}/backend"

# Ensure common Go bin directories are on PATH (covers husky/CI where PATH is minimal)
if [[ -d "$HOME/go/bin" ]]; then
  PATH="$HOME/go/bin:$PATH"
fi

if [[ -x "/usr/local/go/bin/go" ]]; then
  PATH="/usr/local/go/bin:$PATH"
fi

if [[ -x "/opt/homebrew/bin/go" ]]; then
  PATH="/opt/homebrew/bin:$PATH"
fi

if command -v go >/dev/null 2>&1; then
  GOBIN_PATH="$(go env GOBIN 2>/dev/null || true)"
  if [[ -n "$GOBIN_PATH" && -d "$GOBIN_PATH" ]]; then
    PATH="$GOBIN_PATH:$PATH"
  else
    GOPATH_ROOT="$(go env GOPATH 2>/dev/null || true)"
    if [[ -n "$GOPATH_ROOT" && -d "$GOPATH_ROOT/bin" ]]; then
      PATH="$GOPATH_ROOT/bin:$PATH"
    fi
  fi
fi

export PATH

cd "$BACKEND_DIR"

if ! command -v golangci-lint >/dev/null 2>&1; then
  echo "golangci-lint not found. Run ./scripts/install-go-tools.sh first." >&2
  exit 1
fi

# Get list of changed .go files (compatible with all shells)
CHANGED_FILES=()
if git rev-parse --git-dir >/dev/null 2>&1 && git rev-parse HEAD >/dev/null 2>&1; then
  if ! git diff --cached --quiet; then
    # Get staged .go files using a while loop instead of mapfile
    while IFS= read -r -d '' file; do
      CHANGED_FILES+=("$file")
    done < <(git diff --cached --name-only --diff-filter=ACM -z | grep -z '\.go$' || true)
  fi
fi

REL_FILES=()
for file in "${CHANGED_FILES[@]}"; do
  if [[ "$file" == backend/* ]]; then
    REL_FILES+=("${file#backend/}")
  fi
done

if [[ ${#REL_FILES[@]} -eq 0 ]]; then
  echo "No Go files to lint"
  exit 0
fi

echo "Linting ${#REL_FILES[@]} changed Go files..."
printf '%s\n' "${REL_FILES[@]}"

# Lint only the specific changed files
golangci-lint run "${REL_FILES[@]}"
