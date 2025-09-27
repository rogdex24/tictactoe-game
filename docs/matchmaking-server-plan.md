# Matchmaking & Server-Authoritative Tic-Tac-Toe Implementation Plan

## Goal

Establish a production-ready foundation for multiplayer Tic-Tac-Toe with two matchmaking queues (e.g., classic and blitz) backed by an authoritative Nakama match handler that enforces all game rules.

## High-Level Architecture

- **Clients (frontend app)** authenticate with Nakama, establish a WebSocket connection, join matchmaking, and render UI updates pushed by the server.
- **Nakama Server** hosts the matchmaking queues and authoritative match handler (Go runtime).
- **PostgreSQL** persists user accounts, sessions, and match history.

## Prerequisites

- Working Nakama cluster using the existing Docker Compose stack (`backend/docker-compose.yml`).
- Go toolchain installed through `./scripts/install-go-tools.sh` so the match handler plugin can compile.
- Frontend capable of calling the backend client (see existing Nakama client wrapper in the frontend package).

## Implementation Tasks

### 1. Matchmaking

1. **Register matchmaker callback in Go**
   - In the backend module (e.g., `backend/modules/match/main.go`), register `initializer.RegisterMatchmakerMatched` during module init.
   - Create a handler that calls `nk.MatchCreate(ctx, "xoxo", map[string]interface{}{"entries": entries})` to spin up the authoritative match using our match handler identifier.
2. **Expose matchmaking modes**
   - Define constants for supported modes (classic, blitz) so both client and server share vocabulary.
   - In the matchmaker callback, inspect the incoming ticket properties (e.g., `entries[i].StringProperties["mode"]`) to enforce that only compatible tickets are grouped.

### 2. Client Socket Lifecycle

1. **Create WebSocket connection**
   - After authentication, call `client.createSocket()` and `socket.connect(session, true)` to appear online.
   - Ensure reconnection logic retries with exponential backoff.
2. **Submit matchmaker tickets**
   - Provide `query`, `minPlayers`, `maxPlayers`, and `stringProps` based on the selected mode.
   - Listen for `socket.onmatchmakermatched`; when fired, call `socket.joinMatch(matched.matchId)`.
3. **Handle match data**
   - Register `socket.onmatchdata` handler to process opcodes and update UI.
   - Normalize incoming payloads (e.g., JSON schema for board state, current player, winner) before updating application state.

### 3. Authoritative Match Handler (Go)

1. **Register match**
   - Use `initializer.RegisterMatch("xoxo", NewMatch)` where `NewMatch` returns a struct implementing the `runtime.Match` interface.
2. **MatchInit**
   - Initialize empty board array (size 9), track presences, assign marks (X/O), and set first player.
   - Optionally emit an initial state broadcast (opcode `1` for "match start").
3. **MatchJoinAttempt / MatchJoin**
   - Allow up to two players; reject additional join attempts.
   - Map presences to marks and store in state.
4. **MatchLoop**
   - Iterate through `messages` each tick.
   - For opcode `4` (player move):
     - Validate sender matches the current turn.
     - Ensure target cell is empty.
     - Update board, swap turn, detect win/draw.
   - Broadcast state changes:
     - Opcode `2`: board + active player update.
     - Opcode `3`: game over message (winner or draw) followed by match termination signal.
5. **MatchLeave / Terminate**
   - If a player disconnects, broadcast a forfeit (winner = remaining player) and end the match.

### 4. Frontend Integration

1. **State management**
   - Store board state, player mark, match ID, and turn ownership in a dedicated slice/context.
   - Provide selectors/hooks for UI components to render the board and turn indicators.
2. **UI updates**
   - Show matchmaking status while awaiting match.
   - Display server-provided game state; disable local interactions when it is not the player's turn.
   - Surface game-over modal with rematch/exit options (future enhancement).
3. **Error handling**
   - Present errors when matchmaking fails or the match ends unexpectedly (disconnects).

### 5. Testing & Validation

- **Unit tests (Go)**: cover move validation, win detection, and state transitions within the match handler.
- **Integration tests**: simulate two virtual clients sending moves via Nakama test harness to ensure deterministic behavior.
- **Frontend tests**: verify reducers/hooks respond correctly to sample match data payloads and UI renders board accurately.
- **Manual QA**: run backend services locally, connect two frontend clients, play through classic and blitz matches, and confirm authoritative enforcement.

## Rollout Considerations

- Add observability: log match lifecycle events and add metrics (match duration, disconnect rates).
- Persist match results for leaderboards or player history if required.
- Expand to more game modes or rule variants by reusing the same server-authoritative pattern.
