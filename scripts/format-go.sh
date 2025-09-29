#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -eq 0 ]; then
  exit 0
fi

# Filter out vendor files
filtered_files=()
for file in "$@"; do
  if [[ "$file" != *"/vendor/"* ]]; then
    filtered_files+=("$file")
  fi
done

# Exit if no files to process after filtering
if [ "${#filtered_files[@]}" -eq 0 ]; then
  exit 0
fi

if ! command -v goimports >/dev/null 2>&1; then
  gofmt -w "${filtered_files[@]}"
  exit 0
fi

goimports -w "${filtered_files[@]}"
