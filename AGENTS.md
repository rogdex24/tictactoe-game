# Agents Guide: Tic-Tac-Toe Nakama Monorepo

## Scope

This document explains how to bootstrap the workspace, run the backend Nakama stack, and launch the Expo frontend for local development. Follow the steps in order on a clean machine.

## Prerequisites

- Node.js 20 LTS and pnpm 9 (`corepack enable && corepack prepare pnpm@9 --activate` if pnpm is missing)
- Go 1.25 (the scripts use `GOTOOLCHAIN` to install the pinned toolchain automatically)
- Docker Desktop (or any Docker Engine with Compose V2 support)
- Make sure Docker is running before starting the backend services

## Environment Setup

1. Install JavaScript dependencies:
   ```bash
   pnpm install
   ```
2. Install Go tooling used by the backend lint/test targets:
   ```bash
   ./scripts/install-go-tools.sh
   ```
   Ensure Go's tool bin is on your `PATH` so `golangci-lint` and `goimports` are available:
   ```bash
   export PATH="$HOME/go/bin:$PATH"
   ```
3. Provision local environment variables:
   ```bash
   cp .env.example .env
   ```
   Adjust secrets if you need non-default credentials.

## Backend (Nakama) Workflow

1. Start Postgres and Nakama services using Docker Compose (recommended):

   ```bash
   docker compose -f backend/docker-compose.yml up -d
   ```

   This starts both PostgreSQL and the Nakama server with the compiled Go plugin.

2. (Optional) For development with native Nakama binary:
   - Download the macOS Nakama binary (auto-detects Apple Silicon vs Intel):
     ```bash
     ./scripts/setup-nakama-native-macos.sh
     ```
   - Start Postgres via Docker and launch the Nakama dev server:
     ```bash
     ./scripts/run-nakama-native-local.sh
     ```
     The script recompiles the Go plugin for your local architecture into `backend/build/darwin-<arch>/match_handler.so` before spawning Nakama (set `NAKAMA_SKIP_PLUGIN=1` to skip plugin loading). Use `Ctrl+C` to stop.

3. Stop all services:

   ```bash
   docker compose -f backend/docker-compose.yml down
   ```

4. (Optional) Verify the server is healthy once it is running:
   ```bash
   ./scripts/check-backend-health.sh
   ```

## Frontend (Expo) Workflow

1. Launch the Metro bundler:
   ```bash
   pnpm --filter frontend start
   ```
2. Choose your target platform in the Expo CLI (press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go on a device).
3. The frontend expects the Nakama API at `http://localhost:7350`; keep the backend stack running while testing.

## Validation Checklist

- `pnpm install` finishes without errors.
- `docker compose -f backend/docker-compose.yml ps` shows both `postgres` and `nakama` containers in the `running` state.
- `./scripts/check-backend-health.sh` returns success while the services are running.
- Expo Metro prints a tunnel/lan URL and serves the React Native app without runtime errors.

## Troubleshooting Notes

- If services fail to start, check that Docker is running and try: `docker compose -f backend/docker-compose.yml down && docker compose -f backend/docker-compose.yml up -d`
- For native Nakama development, if Nakama fails to start locally, rerun `./scripts/run-nakama-native-local.sh` to force a fresh darwin plugin build and confirm Postgres is exposed on `127.0.0.1:5432`.
- Stale Docker resources can be cleaned via `docker compose -f backend/docker-compose.yml down --remove-orphans`.
- You can remove persisted Postgres data with `docker volume rm backend_data` if you need a clean slate.
- The Go tooling install script respects `GOTOOLCHAIN`; set it beforehand if you want a different minor release.
- For CI/CD builds that target Linux containers, the build process uses `backend/Dockerfile.nakama` which compiles the plugin inside the `nakama-pluginbuilder` image.
