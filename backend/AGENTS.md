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
- **Multiple Game Modes**: Automatic separate queues for different game modes (classic, blitz, etc.)
- **Game Logic**: Complete server-side Tic-Tac-Toe game rules and validation
- **Match Lifecycle**: Full `MatchJoinAttempt`, `MatchJoin`, `MatchLoop`, `MatchLeave` handlers
- **Anti-Cheat**: Server validates all moves and enforces game rules
- **Leaderboard**: Global ranking system with W/L/D statistics and scoring

**Current Implementation**:

```javascript
// Matchmaker setup with custom properties for different game modes
await socket.addMatchmaker('*', 2, 2, { mode: 'classic' }, {}); // Classic mode queue
await socket.addMatchmaker('*', 2, 2, { mode: 'blitz' }, {}); // Blitz mode queue

// Server creates authoritative match and returns match ID
socket.onmatchmakermatched = (matched) => {
  if (matched.match_id) {
    socket.joinMatch(matched.match_id);
  }
};
```

#### Multiple Game Mode Support ✅

**Location**: `main.go` (RegisterMatchmakerMatched), `match.go` (MatchInit)
**Status**: ✅ Fully operational with automatic mode separation

**Mode Handling Implementation**:

1. **Mode Extraction** (`main.go` lines 68-87):
   - Extracts `mode` property from matchmaker entries
   - Defaults to "classic" if no mode specified
   - Comprehensive logging for debugging mode extraction

2. **Mode Validation** (`main.go` lines 90-107):
   - Validates all players in a matchmaking group have the same mode
   - Prevents mismatched players from being matched together
   - Returns error if mode mismatch is detected

3. **Match Initialization** (`match.go` lines 84-98):
   - Accepts mode parameter during match creation
   - Stores mode in match state for entire game duration
   - Passes mode to all clients in match state updates

**Separate Queue Mechanism**:

- **Automatic Segmentation**: Nakama's matchmaker automatically creates separate pools based on properties
- **Property-Based Matching**: Players with `{ mode: 'classic' }` only match with other classic players
- **Scalable Architecture**: New modes can be added without backend changes
- **Queue Isolation**: Blitz players never match with classic players, ensuring fair gameplay

**Server-Side Mode Validation**:

```go
// Mode validation in RegisterMatchmakerMatched callback
for i, entry := range entries {
    entryMode := "classic"
    if properties := entry.GetProperties(); properties != nil {
        if rawMode, ok := properties["mode"]; ok {
            if modeValue, ok := rawMode.(string); ok && modeValue != "" {
                entryMode = modeValue
            }
        }
    }

    if entryMode != mode {
        return "", fmt.Errorf("mode mismatch: expected %s, got %s", mode, entryMode)
    }
}
```

**Supported Game Modes**:

- ✅ **Classic**: Traditional tic-tac-toe rules
- ✅ **Blitz**: Same rules, separate matchmaking pool
- 🔄 **Future Modes**: Architecture supports any new mode without code changes

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
- **Multiple Game Mode Support**: Separate queues for classic, blitz, and future modes
- **Global Leaderboard**: Persistent ranking system with comprehensive statistics
- **Match Modes**: Dynamic mode handling with automatic queue separation
- **Real-time Communication**: Low-latency WebSocket game state synchronization
- **RPC API**: RESTful endpoints for leaderboard and player data
- **Docker Deployment**: Containerized production-ready setup

**Architecture Benefits**:

- **Security**: Server validates all moves, prevents cheating
- **Mode Isolation**: Separate matchmaking queues ensure fair gameplay
- **Reliability**: Authoritative game state prevents desynchronization
- **Scalability**: Nakama's proven multiplayer infrastructure with automatic queue management
- **Flexibility**: New game modes can be added without backend modifications
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
// Matchmaker connects to server-authoritative matches with mode support
const MATCHMAKER_QUERY = '*'; // Universal query for server matches

// Classic mode matchmaking
await socket.addMatchmaker(MATCHMAKER_QUERY, 2, 2, { mode: 'classic' }, {});

// Blitz mode matchmaking
await socket.addMatchmaker(MATCHMAKER_QUERY, 2, 2, { mode: 'blitz' }, {});
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

1. **Matchmaking**: Client requests match via matchmaker with specific game mode
2. **Mode Validation**: Server validates all players have matching game mode
3. **Server Match**: Server creates authoritative match with validated game mode
4. **Join Match**: Client joins using server-provided match ID
5. **Game Play**: All moves validated by server before state updates
6. **Game End**: Server determines winner and updates leaderboard automatically

#### Integration Benefits

- **Simplified Client**: No client-side game logic needed
- **Cheat Prevention**: Server validates all moves and game rules
- **Mode-Based Matching**: Players only matched with compatible game mode
- **Reliable State**: Single source of truth prevents desynchronization
- **Automatic Stats**: Leaderboard updated server-side after each match
- **Error Handling**: Server provides clear error messages for invalid moves

**Status**: ✅ **FULLY INTEGRATED WITH SERVER-AUTHORITATIVE BACKEND**

### Quick Start Guide

#### For Developers

1. **Start Backend**: `docker compose -f backend/docker-compose.yml up --build -d`
2. **Start Frontend**: `pnpm --filter frontend start`
3. **Test Multiple Game Modes**:
   - Select different modes in UI (Classic vs Blitz)
   - Verify separate matchmaking queues work correctly
   - Open multiple clients to test mode-based matching
4. **Test Multiplayer**: Open multiple clients and test matchmaking
5. **Verify Leaderboard**: Play matches and check leaderboard updates

#### Key Files

- **Backend Logic**: `backend/main.go` (initialization and RPC), `backend/match.go` (game logic)
- **Docker Config**: `backend/docker-compose.yml`, `backend/Dockerfile`
- **Server Config**: `backend/local.yml`
- **Frontend Integration**: `frontend/src/components/player/PlayerGameScreen/PlayerGameScreen.tsx`
- **Network Service**: `frontend/src/services/nakama.ts`

**Status**: 🎮 **PRODUCTION-READY SERVER-AUTHORITATIVE MULTIPLAYER WITH MULTIPLE GAME MODES** 🎮

#### Testing Multiple Game Modes

**Verification Steps**:

1. **Start Backend with Logging**:

```bash
docker compose -f backend/docker-compose.yml up --build -d
docker compose -f backend/docker-compose.yml logs -f nakama
```

2. **Test Mode Separation**:
   - Open two browser tabs/windows
   - Tab 1: Select "Classic" mode → Start matchmaking
   - Tab 2: Select "Blitz" mode → Start matchmaking
   - Result: Players should NOT match (different queues)

3. **Test Same Mode Matching**:
   - Tab 1: Select "Classic" mode → Start matchmaking
   - Tab 2: Select "Classic" mode → Start matchmaking
   - Result: Players SHOULD match and start game

4. **Verify Server Logs**:
   - Look for mode extraction logs: `🎮 Final mode for match: classic`
   - Look for match creation logs: `🚀 Creating authoritative match from matchmaking queue: mode=classic`
   - Look for mode validation logs: `✅ Using extracted mode: mode=classic`

**Expected Log Output**:

```
🎮 MATCHMAKER CALLBACK TRIGGERED total_entries=2
🔍 Examining first entry properties properties=map[mode:classic]
🎯 Found mode property raw_mode=classic
✅ Using extracted mode mode=classic
🎮 Final mode for match mode=classic
🚀 Creating authoritative match from matchmaking queue mode=classic players=2
✅ Match created successfully match_id=xyz mode=classic
```

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
