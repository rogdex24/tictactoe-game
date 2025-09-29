## Backend Implementation Status & Documentation

### Current Server Architecture

The Tic-Tac-Toe game backend is built on **Nakama** (v3.32.0), an open-source game server that provides matchmaking, real-time multiplayer, and server-authoritative game state management.

#### Restart Server after code changes to test

NOTE: Mandatory Steps to run else may cause this issue:
<issue>
"Failed initializing runtime modules","error":"plugin.Open(\"/nakama/data/modules/backend\"): plugin was built with a different version of package google.golang.org/protobuf/types/known/timestamppb"}
</issue>
Make sure to run

````bash
go mod tidy
# add the packages needed
go mod vendor
``

Delete and build the server again

```bash
docker compose -f backend/docker-compose.yml down && docker compose -f backend/docker-compose.yml up --build -d
````

### Server Architecture Implementation

The backend now implements **server-authoritative matches** with a complete Go plugin system.

#### Server-Authoritative Matches ✅

**Location**: `main.go`, `match.go`
**Status**: ✅ Fully operational with Go plugin

**Features Implemented**:

- **Matchmaking**: Custom `RegisterMatchmakerMatched` callback creates authoritative matches
- **Game Logic**: Complete server-side Tic-Tac-Toe game rules and validation
- **Match Lifecycle**: Full `MatchJoinAttempt`, `MatchJoin`, `MatchLoop`, `MatchLeave` handlers
- **Anti-Cheat**: Server validates all moves and enforces game rules
- **Leaderboard**: Global ranking system with W/L/D statistics and scoring

**Current Implementation**:

```javascript
// Matchmaker setup with custom properties
await socket.addMatchmaker('*', 2, 2, { mode: 'classic' }, {});

// Server creates authoritative match and returns match ID
socket.onmatchmakermatched = (matched) => {
  if (matched.match_id) {
    socket.joinMatch(matched.match_id);
  }
};
```

#### Leaderboard System ✅

**Global Ranking**: Cumulative leaderboard tracks all player performance

- **Scoring Formula**: Win (+3), Draw (+1), Loss (-1)
- **Statistics**: Wins, Losses, Draws, Total Games, Score
- **Persistence**: Records stored in Nakama's authoritative leaderboard
- **Real-time Updates**: Stats updated immediately after each match

**RPC Endpoints**:

- `get_leaderboard`: Fetch top players with rankings and stats
- `get_player_stats`: Get individual player statistics and rank

#### Match Communication

- **Server-Authoritative**: All game moves validated by server
- **Real-time**: WebSocket communication for game state updates
- **Opcodes**: `GAME_START`, `BOARD_UPDATE`, `GAME_OVER`, `PLAYER_MOVE`, `ERROR`
- **Match States**: Complete game state synchronization between clients

### Docker Configuration

#### Production Setup with Go Plugin ✅

```yaml
# docker-compose.yml - Current working configuration
services:
  nakama:
    build: .
    entrypoint:
      - '/bin/sh'
      - '-ecx'
      - >
        /nakama/nakama migrate up --database.address postgres:localdb@postgres:5432/nakama &&
        exec /nakama/nakama --config /nakama/data/local.yml
```

```dockerfile
# Dockerfile - Go plugin compilation and deployment
FROM heroiclabs/nakama-pluginbuilder:3.32.0 AS builder
WORKDIR /backend
COPY . .
RUN go build --trimpath --mod=vendor --buildmode=plugin -o ./backend.so

FROM heroiclabs/nakama:3.32.0
COPY --from=builder /backend/backend.so /nakama/data/modules
COPY --from=builder /backend/local.yml /nakama/data/
```

### Nakama Configuration

#### Server Settings

```yaml
# local.yml - Production configuration
name: nakama-tictactoe
runtime:
  go:
    path: '/nakama/data/modules'
matchmaker:
  interval_sec: 1
  max_tickets: 1000
leaderboard:
  blacklist_rank_cache:
    - 'ttt_leaderboard'
```

### Testing & Validation

#### Server-Authoritative Match Testing ✅

**Test Coverage**:

- ✅ Matchmaking: Players matched and connected to authoritative matches
- ✅ Game Logic: Server validates moves and enforces rules
- ✅ Match States: Win, draw, forfeit conditions properly handled
- ✅ Leaderboard: Stats updated automatically after each match
- ✅ RPC Endpoints: Leaderboard and player statistics retrieval working

**Validation Results**:

- **Matchmaking**: Custom callback creates matches with proper game mode
- **Anti-Cheat**: Server rejects invalid moves and prevents rule violations
- **Game Flow**: Complete match lifecycle from join to completion
- **Statistics**: Real-time leaderboard updates with accurate scoring
- **Performance**: Low-latency real-time gameplay with server authority

### Implementation Architecture

#### Current Status: Production-Ready Server-Authoritative System ✅

**Features Complete**:

- **Server-Authoritative Matches**: Full game logic validation and anti-cheat
- **Global Leaderboard**: Persistent ranking system with comprehensive statistics
- **Match Modes**: Support for different game modes (classic, etc.)
- **Real-time Communication**: Low-latency WebSocket game state synchronization
- **RPC API**: RESTful endpoints for leaderboard and player data
- **Docker Deployment**: Containerized production-ready setup

**Architecture Benefits**:

- **Security**: Server validates all moves, prevents cheating
- **Reliability**: Authoritative game state prevents desynchronization
- **Scalability**: Nakama's proven multiplayer infrastructure
- **Performance**: Efficient real-time communication with minimal latency
- **Data Persistence**: Permanent leaderboard and player statistics

#### Migration from Client-Relayed to Server-Authoritative ✅

The system has been successfully migrated from client-relayed matches to full server authority:

- **Before**: Client-side game logic with limited validation
- **After**: Complete server-side game rules with cheat prevention
- **Improvement**: Enhanced security and reliable game state management

### React Native Frontend Integration

#### Updated Integration for Server-Authoritative Matches ✅

**Location**: `frontend/src/components/player/PlayerGameScreen/PlayerGameScreen.tsx`
**Status**: ✅ Updated to work with server-authoritative matches

**Key Integration Points**:

1. **Matchmaking with Server Authority**:

```typescript
// Matchmaker connects to server-authoritative matches
const MATCHMAKER_QUERY = '*'; // Universal query for server matches
await socket.addMatchmaker(MATCHMAKER_QUERY, 2, 2, { mode: 'classic' }, {});
```

2. **Server-Authoritative Match Joining**:

```typescript
const handleMatchFound = React.useCallback(
  async (socket: Socket, matched: MatchmakerMatched) => {
    console.log('🎉 Server-authoritative match found:', matched.match_id);

    // Join server-authoritative match directly with match ID
    const match = await socket.joinMatch(matched.match_id);
    console.log('✅ Joined authoritative match:', match.match_id);

    // Server handles all game state - client just renders
  },
  [cleanupMatchmaking, resetBoard],
);
```

3. **Server-Validated Game Communication**:

```typescript
// Send moves to server for validation
const sendMove = async (position: number) => {
  if (matchRef.current && yourMark && currentTurnMark === yourMark) {
    const moveData = { index: position };
    await socket.sendMatchState(
      matchRef.current.match_id,
      MATCH_OPCODE_PLAYER_MOVE,
      JSON.stringify(moveData),
    );
  }
};

// Receive server-validated game updates
socket.onmatchdata = (message) => {
  if (message.op_code === MATCH_OPCODE_BOARD_UPDATE) {
    const serverState = JSON.parse(new TextDecoder().decode(message.data));
    // Update local state with server-authoritative data
    updateGameState(serverState);
  }
};
```

#### Server Communication Flow

1. **Matchmaking**: Client requests match via matchmaker
2. **Server Match**: Server creates authoritative match with game logic
3. **Join Match**: Client joins using server-provided match ID
4. **Game Play**: All moves validated by server before state updates
5. **Game End**: Server determines winner and updates leaderboard automatically

#### Integration Benefits

- **Simplified Client**: No client-side game logic needed
- **Cheat Prevention**: Server validates all moves and game rules
- **Reliable State**: Single source of truth prevents desynchronization
- **Automatic Stats**: Leaderboard updated server-side after each match
- **Error Handling**: Server provides clear error messages for invalid moves

**Status**: ✅ **FULLY INTEGRATED WITH SERVER-AUTHORITATIVE BACKEND**

### Quick Start Guide

#### For Developers

1. **Start Backend**: `docker compose -f backend/docker-compose.yml up --build -d`
2. **Start Frontend**: `pnpm --filter frontend start`
3. **Test Multiplayer**: Open multiple clients and test matchmaking
4. **Verify Leaderboard**: Play matches and check leaderboard updates

#### Key Files

- **Backend Logic**: `backend/main.go` (initialization and RPC), `backend/match.go` (game logic)
- **Docker Config**: `backend/docker-compose.yml`, `backend/Dockerfile`
- **Server Config**: `backend/local.yml`
- **Frontend Integration**: `frontend/src/components/player/PlayerGameScreen/PlayerGameScreen.tsx`
- **Network Service**: `frontend/src/services/nakama.ts`

**Status**: 🎮 **PRODUCTION-READY SERVER-AUTHORITATIVE MULTIPLAYER** 🎮

#### API Endpoints

**RPC Functions Available**:

- `get_leaderboard`: Returns top players with rankings and W/L/D statistics
- `get_player_stats`: Returns individual player statistics and current rank

**Usage Example**:

```typescript
// Fetch leaderboard
const response = await client.rpc(session, 'get_leaderboard', { limit: 50 });
const leaderboard = JSON.parse(response.payload);

// Get player stats
const statsResponse = await client.rpc(session, 'get_player_stats', { userId: 'player123' });
const playerStats = JSON.parse(statsResponse.payload);
```

### React Native Frontend Integration

**Status**: ✅ **FULLY INTEGRATED WITH SERVER-AUTHORITATIVE BACKEND**
