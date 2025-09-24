#!/usr/bin/env bash
set -euo pipefail

HOST=${NAKAMA_HOST:-127.0.0.1}
PORT=${NAKAMA_PORT:-7350}
ENDPOINT="http://${HOST}:${PORT}/"

if curl -fsS "$ENDPOINT" >/dev/null; then
  echo "Nakama healthcheck OK at $ENDPOINT"
else
  status=$?
  echo "Nakama healthcheck FAILED at $ENDPOINT" >&2
  exit "$status"
fi
