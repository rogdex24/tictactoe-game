#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
NAKAMA_BINARY="$REPO_ROOT/backend/bin/nakama"

if [[ ! -x "$NAKAMA_BINARY" ]]; then
  echo "Nakama binary not found. Run scripts/setup-nakama-macos.sh first." >&2
  exit 1
fi

if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

POSTGRES_DB=${POSTGRES_DB:-nakama}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-localdb}

# Ensure Postgres container is running
DOCKER_COMPOSE_FILE="$REPO_ROOT/backend/docker-compose.yml"

if ! docker compose -f "$DOCKER_COMPOSE_FILE" ps postgres >/dev/null 2>&1; then
  echo "Starting postgres container..."
fi

docker compose -f "$DOCKER_COMPOSE_FILE" up -d postgres >/dev/null

declare ARCH
case "$(uname -m)" in
  arm64) ARCH=arm64 ;;
  x86_64) ARCH=amd64 ;;
  *)
    echo "Unsupported macOS architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

PLUGIN_DIR="$REPO_ROOT/backend/build/darwin-$ARCH"
PLUGIN_PATH="$PLUGIN_DIR/match_handler.so"
mkdir -p "$PLUGIN_DIR"
mkdir -p "$REPO_ROOT/backend/data"

if [[ "${NAKAMA_SKIP_PLUGIN:-0}" != "1" ]]; then
  echo "Building Nakama plugin for darwin/$ARCH..."
  (
    cd "$REPO_ROOT/backend"
    env \
      GOTOOLCHAIN="${GOTOOLCHAIN:-go1.25.0}" \
      GOOS=darwin \
      GOARCH="$ARCH" \
      CGO_ENABLED=1 \
      ${NAKAMA_GOEXPERIMENT:+GOEXPERIMENT=$NAKAMA_GOEXPERIMENT} \
      go build -trimpath -buildmode=plugin -o "$PLUGIN_PATH" ./cmd/plugin
  )
  /usr/bin/codesign -s - "$PLUGIN_PATH" >/dev/null 2>&1 || true
  RUNTIME_ARGS=("--runtime.path" "$PLUGIN_DIR")
else
  echo "Skipping plugin build (NAKAMA_SKIP_PLUGIN=1)."
  RUNTIME_ARGS=()
fi

DB_ADDRESS="$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB"

# Parse json logs to human readable format
parse_nakama_logs() {
  jq -r '
  def colors: {
    "fatal": "\u001b[1;35m",    # Bold magenta
    "error": "\u001b[1;31m",    # Bold red
    "warn": "\u001b[1;33m",     # Bold yellow  
    "info": "\u001b[1;32m",     # Bold green
    "debug": "\u001b[1;36m",    # Bold cyan
    "reset": "\u001b[0m"        # Reset
  };
  colors[.level // "info"] + .ts + " [" + (.level | ascii_upcase) + "]" + colors.reset + " " + .msg'
}

echo "Nakama starting with database=$DB_ADDRESS"

# ensure database migrations are applied before launching the server
"$NAKAMA_BINARY" migrate up --database.address "$DB_ADDRESS"

exec "$NAKAMA_BINARY" \
  --name nakama-native-dev \
  --data_dir "$REPO_ROOT/backend/data" \
  --database.address "$DB_ADDRESS" \
  "${RUNTIME_ARGS[@]}" \
  --logger.format "json" | parse_nakama_logs
