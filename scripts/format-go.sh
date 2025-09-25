#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -eq 0 ]; then
  exit 0
fi

if ! command -v goimports >/dev/null 2>&1; then
  gofmt -w "$@"
  exit 0
fi

goimports -w "$@"
