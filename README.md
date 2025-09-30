# Tic-Tac-Toe Nakama Monorepo

This monorepo bootstraps the infrastructure required to build a server authoritative Tic-Tac-Toe experience powered by [Nakama](https://heroiclabs.com/docs/).

The repository combines an Expo React Native client, Go plugins for Nakama, and deployment automation for Google Cloud Platform.

## Repository Structure

```
.
├── frontend/        # Expo React Native application
├── backend/         # Go Nakama plugin source and tooling
├── scripts/         # Shared development helpers
├── package.json     # Root workspace configuration
├── pnpm-workspace.yaml
└── turbo.json       # Task orchestration via Turborepo
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20 LTS
- [pnpm](https://pnpm.io/) 9 LTS
- [Go](https://go.dev/) 1.25+
- [Docker](https://www.docker.com/)
- [golangci-lint](https://golangci-lint.run/)
- [goimports](https://pkg.go.dev/golang.org/x/tools/cmd/goimports)
- Optional but recommended: [direnv](https://direnv.net/) or similar for `.env` management

## Getting Started

1. Install dependencies

   ```bash
   pnpm install
   ```

2. Install the Go developer tooling (golangci-lint & goimports)

   ```bash
   ./scripts/install-go-tools.sh
   ```

   Add Go's tool bin to your shell path if it's not already there:

   ```bash
   export PATH="$HOME/go/bin:$PATH"
   ```

3. Prepare Husky git hooks

   ```bash
   pnpm prepare
   ```

4. Start the backend services using Docker Compose (recommended)

   **For development (simplified, no SSL/nginx):**

   ```bash
   docker compose -f backend/docker-compose.dev.yml up -d
   ```

   **For production (with nginx and SSL):**

   ```bash
   docker compose -f backend/docker-compose.yml up -d
   ```

   Both options start PostgreSQL and Nakama with the compiled Go plugin.

5. (Optional) For native development, download the Nakama macOS binary

   ```bash
   ./scripts/setup-nakama-native-macos.sh
   ```

6. (Optional) For native development, start PostgreSQL (Docker) and run Nakama locally

   ```bash
   ./scripts/run-nakama-native-local.sh
   ```

   The script rebuilds the Go plugin for the host architecture into `backend/build/darwin-<arch>/` and then tails the Nakama process. Set `NAKAMA_SKIP_PLUGIN=1` if you want to launch Nakama without loading the custom module. Press `Ctrl+C` to stop the server.

7. Verify the backend is running

8. Verify the backend is running

   ```bash
   ./scripts/check-backend-health.sh
   ```

9. Stop the backend services

   **For development:**

   ```bash
   docker compose -f backend/docker-compose.dev.yml down
   ```

   **For production:**

   ```bash
   docker compose -f backend/docker-compose.yml down
   ```

10. Launch the Expo development server

    ```bash
    pnpm --filter frontend start
    ```

## Workspace Commands

Common scripts are orchestrated with [Turborepo](https://turbo.build/).

```bash
pnpm lint       # Runs linting for all workspaces
pnpm test       # Executes test suites
pnpm build      # Builds the Go plugin and prepares frontend artifacts
pnpm format     # Checks formatting across the repo
pnpm typecheck  # Runs TypeScript and Go vet checks
```

## Real-Time Gameplay Flow

The multiplayer experience relies on Nakama's realtime socket API once a user has
authenticated with the backend:

1. **WebSocket connection** – The Expo client creates a socket and calls
   `socket.connect(session, true)` so the player appears online and can enter the
   matchmaking pool. See `nakamaService.connectSocket()` for the concrete
   implementation.
2. **Matchmaking updates** – While queued, the client listens for
   `socket.onmatchmakermatched` to receive the authoritative `match_id` returned by
   the Go plugin when it calls `nk.MatchCreate`.
3. **Sending moves** – After joining a match, the client submits moves via
   `socket.sendMatchState(matchId, opcode, payload)`; the player screen wraps this
   to send the tapped cell index as JSON.
4. **Receiving state** – Every broadcast from the server arrives through
   `socket.onmatchdata`, where the UI inspects the opcode and updates the board,
   turn indicator, and end-of-game messaging.

The authoritative match handler in `backend/match.go` validates moves, tracks the
board, and broadcasts the canonical state after each turn, ensuring all clients
stay in sync.

### Frontend

- `pnpm --filter frontend lint` – ESLint + Prettier
- `pnpm --filter frontend test` – Jest (jest-expo preset)
- `pnpm --filter frontend typecheck` – TypeScript `--noEmit`
- `pnpm --filter frontend start` – Expo metro bundler

### Backend

- `pnpm --filter backend build` – Builds the Nakama plugin (Linux target for CI/CD)
- `pnpm --filter backend test` – Runs Go tests
- `pnpm --filter backend lint` – `golangci-lint`
- `pnpm --filter backend typecheck` – `go vet`
- `./scripts/run-nakama-native-local.sh` – macOS development server (Postgres via Docker, Nakama native binary)

### Infrastructure

- `docker compose -f backend/docker-compose.dev.yml up -d` – Start local PostgreSQL and Nakama services (development)
- `docker compose -f backend/docker-compose.yml up -d` – Start local PostgreSQL, Nakama, Nginx, and Certbot services (production)
- `docker compose -f backend/docker-compose.dev.yml up -d postgres` – Start local Postgres only (development)

## Environment Variables

Copy `.env.example` to `.env` and adjust credentials for local development or CI.

```bash
cp .env.example .env
```

## Production Deployment

For production deployment with SSL termination and domain setup, see the comprehensive [Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md).

The deployment process involves:

1. **Server Setup**: Use `scripts/gcp-vm-setup.sh` (for GCP) or `scripts/server-deploy-setup.sh` (for any Ubuntu server)
2. **SSL Configuration**: Run `backend/setup-ssl.sh` to configure Let's Encrypt certificates for `api.tictactoe.kauntalha.dev`
3. **Service Management**: Use Docker Compose commands to manage the Nakama backend with Nginx reverse proxy

Quick production setup:

```bash
# On your production server
curl -sSL https://raw.githubusercontent.com/rogdex24/tictactoe-game/main/scripts/server-deploy-setup.sh | bash
cd ~/tictactoe-game/backend
./setup-ssl.sh
```

Your backend will be accessible at `https://api.tictactoe.kauntalha.dev` with automatic SSL certificate management.

## Continuous Integration

GitHub Actions workflow (`.github/workflows/ci.yml`) runs linting, tests, builds the Go plugin, and optionally pushes a Docker image to Artifact Registry when pushing to `main`.

## Deployment Notes

- Ensure `GCP_ARTIFACT_REPOSITORY` and GCP credentials are configured in CI for automated pushes.
- Provision Nakama and PostgreSQL using GKE Autopilot or Cloud Run Jobs + Cloud SQL depending on scaling needs.

## Contributing

- Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) spec. A Husky `commit-msg` hook
  runs Commitlint to enforce the format and prevent malformed commit messages from landing in the repository.
- Pre-commit hooks format JavaScript/TypeScript and Go sources via `lint-staged`, ensuring ESLint/Prettier and `goimports` +
  `golangci-lint` run automatically on staged changes.
- Pre-push hooks run the full lint and test suites.
- Always run `pnpm test` before opening a pull request.
