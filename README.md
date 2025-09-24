# Tic-Tac-Toe Nakama Monorepo

This monorepo bootstraps the infrastructure required to build a server authoritative Tic-Tac-Toe experience powered by [Nakama](https://heroiclabs.com/docs/).

The repository combines an Expo React Native client, Go plugins for Nakama, and deployment automation for Google Cloud Platform.

## Repository Structure

```
.
├── frontend/        # Expo React Native application
├── backend/         # Go Nakama plugin source and tooling
├── infra/           # Docker & infrastructure automation
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

4. Download the Nakama macOS binary (Apple Silicon or Intel detected automatically)

   ```bash
   ./scripts/setup-nakama-macos.sh
   ```

5. Start PostgreSQL (Docker) and run Nakama locally

   ```bash
   ./scripts/run-nakama-local.sh
   ```

   The script rebuilds the Go plugin for the host architecture into `backend/build/darwin-<arch>/` and then tails the Nakama process. Set `NAKAMA_SKIP_PLUGIN=1` if you want to launch Nakama without loading the custom module. Press `Ctrl+C` to stop the server.

   Once Nakama reports that runtime initialization succeeded, you can confirm it is reachable:

   ```bash
   ./scripts/check-backend-health.sh
   ```

   Stop Postgres afterwards with:

   ```bash
   docker compose -f infra/docker-compose.yml down
   ```

6. Launch the Expo development server

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
- `./scripts/run-nakama-local.sh` – macOS development server (Postgres via Docker, Nakama native binary)

### Infrastructure

- `docker compose -f infra/docker-compose.yml up -d postgres` – Start local Postgres only
- `make -C infra deploy` – Builds & pushes the Nakama Docker image to GCP Artifact Registry (requires authentication)

## Authentication & Matchmaking Overview

- **Device Authentication**: Clients call the `device_auth` RPC with a stable device ID. The Go plugin authenticates/creates a user and returns a JWT.
- **Match Handler**: The server runs a deterministic Tic-Tac-Toe match loop with authoritative move validation, state broadcasting, and heartbeats.
- **Matchmaking Queues**: Extend the current match handler by registering additional labels for new game modes and using Nakama's matchmaker API.
- **Leaderboard**: Use `LeaderboardRecordWrite` helper to record scores and maintain rankings.

## Environment Variables

Copy `.env.example` to `.env` and adjust credentials for local development or CI.

```bash
cp .env.example .env
```

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
