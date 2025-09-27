#!/usr/bin/env bash
set -euo pipefail

VERSION="${NAKAMA_VERSION:-3.32.0}"
ARCH=$(uname -m)
case "$ARCH" in
  arm64) PLATFORM="darwin-arm64" ;;
  x86_64) PLATFORM="darwin-amd64" ;;
  *)
    echo "Unsupported macOS architecture: $ARCH" >&2
    exit 1
    ;;
esac

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
INSTALL_DIR="$REPO_ROOT/backend/bin"
TARGET="$INSTALL_DIR/nakama"

if [[ -x "$TARGET" ]]; then
  echo "Nakama binary already present at $TARGET"
  exit 0
fi

mkdir -p "$INSTALL_DIR"
TARBALL="nakama-${VERSION}-${PLATFORM}.tar.gz"
URL="https://github.com/heroiclabs/nakama/releases/download/v${VERSION}/${TARBALL}"
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "Downloading Nakama v${VERSION} (${PLATFORM})..."
curl -fL "$URL" -o "$TMPDIR/$TARBALL"

tar -xzf "$TMPDIR/$TARBALL" -C "$TMPDIR"
if [[ ! -f "$TMPDIR/nakama" ]]; then
  echo "Unexpected archive contents, aborting." >&2
  exit 1
fi

mv "$TMPDIR/nakama" "$TARGET"
chmod +x "$TARGET"

echo "Installed Nakama to $TARGET"
