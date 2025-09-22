#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../backend"

golangci-lint run ./...
