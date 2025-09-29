#!/usr/bin/env bash
set -euo pipefail

# Default toolchain to align with Nakama 3.32 (Go 1.25.0) unless overridden.
: "${GO_TOOLCHAIN_VERSION:=go1.25.0}"
export GOTOOLCHAIN="${GOTOOLCHAIN:-$GO_TOOLCHAIN_VERSION}"

# pin exact tool versions to keep CI and local environments in sync
GOIMPORTS_VERSION="v0.27.0"

printf 'Installing Go tools with toolchain %s\n' "$GOTOOLCHAIN"

go install golang.org/x/tools/cmd/goimports@${GOIMPORTS_VERSION}

# Install golangci-lint
# docs: https://golangci-lint.run/docs/welcome/install/#local-installation
# For Mac OS
brew install golangci-lint
brew upgrade golangci-lint


echo "Go tooling installed in $(go env GOBIN || echo "$(go env GOPATH)/bin")"
