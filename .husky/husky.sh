#!/usr/bin/env sh
command -v pnpm >/dev/null 2>&1 || {
  echo 'pnpm is required to run git hooks' >&2
  exit 1
}
