# Frontend Agent Guide

## Scope

These conventions apply to all files within the `frontend/` directory. Follow them when modifying existing code or adding new modules.

## Project Overview

The Expo React Native client renders the multiplayer Tic-Tac-Toe experience. Screens should follow the design system defined in `src/styles` and remain compatible with iOS, Android, and web builds. The app now integrates with Nakama server for authentication and user management.

## Navigation Overview

```mermaid
graph TD
  A[App Launch\nfonts loaded] --> B[Home Screen]
  B -->|Start Game · Bot mode| C{Has saved name?}
  C -->|No| D[PlayerName\nnext: MatchLoading bot]
  D --> E[MatchLoading bot]
  C -->|Yes| E
  E -->|Auth OK| F[Game vs CPU]
  E -->|Cancel| B
  F -->|Play Again| F
  F -->|Leave Game| B
  F -->|Leaderboard CTA| L[Leaderboard]
  B -->|Start Game · Player mode| G{Has saved name?}
  G -->|No| H[PlayerName\nnext: MatchLoading player]
  H --> I[MatchLoading player]
  G -->|Yes| I
  I -->|Match found| J[PlayerGame]
  I -->|Cancel| B
  J -->|Leave or Match complete| B
  J -->|Retry action| B
  B -->|Edit name icon| K[PlayerName\nnext: Home]
  K --> B
  B -->|View Leaderboard| L
  L -->|Back CTA| B
```

## Screen Reference Cheat Sheet

\*\*HomeScreen.tsx (`frontend/src/components/home/HomeScreen/HomeScreen.tsx`)

- Purpose: Landing lobby to choose bot or multiplayer, surface greeting, and link to leaderboard.
- Routes: Starts PlayerName when no name or editing, otherwise pushes MatchLoading with the selected mode, and opens Leaderboard via CTA (`frontend/src/components/home/HomeScreen/HomeScreen.tsx:31`, `:64`).
- Components: `BackgroundGlow`, `GameIcons`, `CustomButton`, `IconButton`, `TextButton` (`frontend/src/components/home/HomeScreen/HomeScreen.tsx:16-20`).
- Shared state/services: Reads `playerName` from `usePlayer` and `ensureAuthenticated`/`isAuthLoading` from `useAuthCheck` before navigation (`frontend/src/components/home/HomeScreen/HomeScreen.tsx:24-43`).
- Caveats: Always await `ensureAuthenticated` so MatchLoading receives a valid session; keep the trimmed-name guard to avoid empty identifiers when users enter only whitespace.

\*\*PlayerNameScreen.tsx (`frontend/src/components/onboarding/PlayerNameScreen/PlayerNameScreen.tsx`)

- Purpose: Collect or update the player display name and trigger authentication when needed.
- Routes: Uses `nextScreen` to return to Home, resume MatchLoading, or jump into PlayerGame after updates (`frontend/src/components/onboarding/PlayerNameScreen/PlayerNameScreen.tsx:58-78`).
- Components: `BackButton`, `CustomButton`, `BackgroundGlow`, `TextInput` shell for the name form (`frontend/src/components/onboarding/PlayerNameScreen/PlayerNameScreen.tsx:14-16`, `:103-127`).
- Shared state/services: Pulls setters and auth helpers from `usePlayer`, switching between `updatePlayerName`, `authenticate`, and local state sync (`frontend/src/components/onboarding/PlayerNameScreen/PlayerNameScreen.tsx:21-53`).
- Caveats: Preserve the optimistic navigation even on auth failure because follow-up screens re-check; ensure new flows pass `mode` when targeting MatchLoading so multiplayer paths pick the right provider.

\*\*MatchLoadingScreen.tsx (`frontend/src/components/onboarding/MatchLoadingScreen/MatchLoadingScreen.tsx`)

- Purpose: Bridge between lobby and gameplay, either spinning up a bot match or waiting for multiplayer matchmaking to complete.
- Routes: Bot mode jumps straight to Game after auth; player mode waits for `phase` to become `playing` before navigating to PlayerGame, and both variants cancel back to Home (`frontend/src/components/onboarding/MatchLoadingScreen/MatchLoadingScreen.tsx:31-37`, `:96-137`).
- Components: `MatchStatusCard`, `LoadingSpinner`, `CustomButton`, `BackgroundGlow` wrappers for status UX (`frontend/src/components/onboarding/MatchLoadingScreen/MatchLoadingScreen.tsx:16-19`, `:74-89`, `:154-160`).
- Shared state/services: Uses `usePlayer` and `useAuthCheck` for identity and auth; player mode also consumes `useMatchmaking` actions like `startMatchmaking` and `cleanupMatchmaking` (`frontend/src/components/onboarding/MatchLoadingScreen/MatchLoadingScreen.tsx:24-55`).
- Caveats: Avoid double-starting matchmaking—`startMatchmaking` is idempotent but gated by refs; if you relocate the provider higher in the tree, ensure `cleanupMatchmaking` still runs on cancel to release tickets and sockets.

\*\*GameScreen.tsx (`frontend/src/components/game/GameScreen/GameScreen.tsx`)

- Purpose: Local bot match with client-side rules, board evaluation, and rematch controls.
- Routes: Enters from MatchLoading (bot path), reopens in-place for Play Again, and navigates to Home or Leaderboard via footer CTAs (`frontend/src/components/game/GameScreen/GameScreen.tsx:56-83`, `:194-203`).
- Components: `GameBoard`, `GameSymbol`, `CustomButton`, `TextButton`, `BackgroundGlow` for board and actions (`frontend/src/components/game/GameScreen/GameScreen.tsx:14-18`, `:178-203`).
- Shared state/services: Reads `playerName` from `usePlayer` only for labeling; game logic is entirely local state (`frontend/src/components/game/GameScreen/GameScreen.tsx:52-123`).
- Caveats: Keep `resetGame` memoized so effects that depend on it (initial reset and leave-game cleanup) do not loop; if you add async bot logic, guard the existing synchronous evaluation order.

\*\*PlayerGameScreen.tsx (`frontend/src/components/player/PlayerGameScreen/PlayerGameScreen.tsx`)

- Purpose: Multiplayer match UI driven by live Nakama updates from `MatchmakingContext`.
- Routes: Landed from MatchLoading once a match is ready; primary button returns to Home while optionally retrying on errors (`frontend/src/components/player/PlayerGameScreen/PlayerGameScreen.tsx:52-124`).
- Components: `MatchStatusCard`, `GameBoard`, `CustomButton`, `TextButton`, `BackgroundGlow` (`frontend/src/components/player/PlayerGameScreen/PlayerGameScreen.tsx:15-19`, `:99-125`).
- Shared state/services: Leans on `useMatchmaking` for board state, marks, connectivity, and actions plus `usePlayer` for display name (`frontend/src/components/player/PlayerGameScreen/PlayerGameScreen.tsx:27-118`).
- Caveats: `sendMove` short-circuits unless it is your turn and the opponent is connected—surface UX for disabled board states instead of bypassing the guard; remember that App.tsx wraps this route with its own `MatchmakingProvider`, so share state via services (or lift the provider) if you need continuity from MatchLoading.

\*\*LeaderboardScreen.tsx (`frontend/src/components/leaderboard/LeaderboardScreen/LeaderboardScreen.tsx`)

- Purpose: Static leaderboard showcase with a simple list and back CTA.
- Routes: Reached from Home or Game; both Back and Play Again buttons return to Home (`frontend/src/components/leaderboard/LeaderboardScreen/LeaderboardScreen.tsx:91-138`).
- Components: `BackButton`, `CustomButton`, `BackgroundGlow`, `FlatList` renderer for entries (`frontend/src/components/leaderboard/LeaderboardScreen/LeaderboardScreen.tsx:13-137`).
- Shared state/services: No global context usage beyond navigation—data is currently mock data local to the screen.
- Caveats: Replace the hard-coded dataset with service data in one place so the shape stays aligned with backend responses; maintain consistent key/score fields when wiring Nakama RPCs.

## Shared State Touchpoints

- `PlayerContext` (`frontend/src/state/PlayerContext.tsx:21-123`) owns the player name, session, and auth helpers consumed by Home, PlayerName, MatchLoading, Game, and PlayerGame; always run mutations (`setPlayerName`, `authenticate`, `updatePlayerName`) through the context so SecureStore/localStorage stay in sync.
- `MatchmakingContext` (`frontend/src/state/MatchmakingContext.tsx:63-264`) wraps the multiplayer socket lifecycle. Both MatchLoading (player mode) and PlayerGame depend on it for match phases, board state, and cleanup. Keep the provider lifetime consistent if you refactor navigation; otherwise hoist it to the navigator level.
- `useAuthCheck` (`frontend/src/hooks/useAuthCheck.ts:6-33`) is the lightweight gate before any networked flow. Call `ensureAuthenticated` prior to invoking Nakama services to avoid cascading failures from expired sessions.

## Authentication Architecture

### Overview

The app uses **device authentication** with Nakama to create and manage user sessions. This allows players to have persistent identities across app sessions while maintaining a seamless user experience.

### Authentication Flow

1. **Initial Setup**: When a player sets their name for the first time, device authentication is automatically triggered
2. **Session Management**: Sessions are stored securely and automatically restored on app restart
3. **Game Flow Validation**: Before starting any game, the app ensures the user is authenticated
4. **Automatic Re-authentication**: If a session expires, the app automatically re-authenticates using the stored device ID and player name

### Key Components

#### NakamaService (`src/services/nakama.ts`)

- **Singleton service** that handles all Nakama client operations
- **Device ID Generation**: Uses `expo-crypto` to generate secure, unique device identifiers
- **Session Management**: Handles token storage, refresh, and validation
- **Cross-platform Storage**: Works on iOS, Android, and web using SecureStore/localStorage
- **Authentication Methods**:
  - `authenticateDevice(playerName)`: Authenticates using device ID with player name as username
  - `restoreSession()`: Attempts to restore previous session from stored tokens
  - `isAuthenticated()`: Checks if current session is valid and not expired
  - `clearSession()`: Logs out and clears stored tokens

#### Enhanced PlayerContext (`src/state/PlayerContext.tsx`)

The PlayerContext now manages both player name and authentication state:

```typescript
interface PlayerContextValue {
  // Existing player name management
  playerName: string;
  setPlayerName: (name: string) => void;
  clearPlayer: () => void;

  // New authentication state
  isAuthenticated: boolean;
  session: Session | null;
  isAuthLoading: boolean;
  authenticate: (playerName?: string) => Promise<void>;
  logout: () => Promise<void>;
}
```

#### Authentication Hook (`src/hooks/useAuthCheck.ts`)

Provides a convenient way for screens to ensure users are authenticated:

- `ensureAuthenticated()`: Guarantees authentication before proceeding
- `isAuthenticated`: Current authentication status
- `isAuthLoading`: Loading state for authentication operations

### UI Flow Integration

#### HomeScreen Authentication

- **Pre-check**: When "Start Game" is pressed, app checks authentication status
- **Automatic Auth**: If user has a name but isn't authenticated, automatic authentication occurs
- **Loading States**: Button shows "Connecting..." during authentication
- **Error Handling**: Failed authentication shows retry dialog

#### PlayerNameScreen Authentication

- **Immediate Auth**: After setting name, user is automatically authenticated
- **Loading States**: "Continue" button shows "Authenticating..." during process
- **Graceful Degradation**: If auth fails, user still proceeds but will be prompted later

#### MatchLoadingScreen Authentication

- **Final Validation**: Ensures authentication before entering actual game
- **Smart Timing**: Reduces loading time for already-authenticated users
- **Fallback Handling**: Provides retry/cancel options if authentication fails

### Storage Strategy

The app uses a multi-layered secure storage approach:

1. **Device ID**: Permanently stored, used for device authentication
2. **Session Tokens**: JWT and refresh tokens stored securely
3. **Player Profile**: Name and preferences stored separately for offline access

**Storage Keys**:

- `nakama-device-id`: Unique device identifier
- `nakama-session-token`: Current JWT token
- `nakama-refresh-token`: Token for session renewal
- `player-profile`: Player name and preferences (existing)

### Error Handling & Resilience

- **Network Failures**: Graceful degradation with retry mechanisms
- **Token Expiry**: Automatic refresh before expiration
- **Storage Errors**: Fallback mechanisms for each storage operation
- **Authentication Failures**: Clear user messaging with actionable options

### Development & Debugging

- **Console Logging**: Authentication events are logged with privacy-safe information
- **Error Context**: Detailed error information for debugging
- **Session Inspection**: Development tools can inspect current session state
- **Mock Authentication**: Service can be extended for development/testing scenarios

### Server Configuration

The Nakama client connects to the backend server with the following default configuration:

- **Server Key**: `defaultkey` (development)
- **Host**: `127.0.0.1` (localhost for development)
- **Port**: `7350` (default Nakama HTTP port)
- **SSL**: Disabled for local development

For production deployment:

1. Update server credentials in `src/services/nakama.ts`
2. Enable SSL for secure connections
3. Configure appropriate server endpoints
4. Update authentication flow for production security requirements

### Server-Side Extensions

The Nakama server can be extended with Go plugins to:

- **Custom Authentication Hooks**: Override default device authentication behavior
- **Session Management**: Extend session lifetime or add custom session data
- **User Profile Enhancement**: Add custom fields to user accounts
- **Integration APIs**: Connect with external services for enhanced user management

Example authentication hook (Go):

```go
func InitModule(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, initializer runtime.Initializer) error {
    // Register authentication hook
    initializer.RegisterBeforeAuthenticateDevice(beforeAuthenticateDevice)
    return nil
}

func beforeAuthenticateDevice(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, in *api.AuthenticateDeviceRequest) (*api.AuthenticateDeviceRequest, error) {
    // Custom authentication logic
    // Can validate device, enrich user data, or implement custom rules
    logger.Info("Device authentication attempt: %s", in.Account.Id)
    return in, nil
}
```

## Tooling & Commands

- Install dependencies: `pnpm install`
- Start the Expo development server: `pnpm --filter frontend start`
- Run unit tests: `pnpm --filter frontend test`
- Type-check: `pnpm --filter frontend typecheck`
- Lint: `pnpm --filter frontend lint`
- Format check: `pnpm --filter frontend format`

## Design System

- **Colors:** Use palette exports from `src/styles/colors.ts`. Do not hard-code hex values inside components; extend the palette instead. Notable tokens for the home screen include the `screenBackground`, `gradientStart`/`gradientEnd` blend, `textTealSoft` subtitle tint, and the translucent `glowCoral`/`glowTeal` fills used for the blurred backdrops.
- **Typography:** Always reference text styles or font families from `src/styles/typography.ts`. The landing screen uses `typography.displayHero` for the “Tic Tac Toe” title, `typography.bodyPrimary` for supporting copy, and `typography.buttonPrimary` for the CTA label. Heading scales leverage Montserrat Regular/Bold/ExtraBold.
- **Spacing & Radii:** Import values from `src/styles/dimensions.ts` for padding, gaps, rounded corners, and offsets. The start screen relies on `radius.xl` for the card shell, `radius.md` for the CTA button, and uses `layout.homeCard*` and `offsets.homeGraphicLift` to keep proportions consistent with the HTML reference.
- **Icons & Illustration:** SVG-based icons live in `src/components/home/GameIcons`. Reuse and compose SVG primitives instead of embedding raw XML strings. The X/O hero art should remain centered within a `192px` stage to preserve alignment with the provided reference.
- **Gradients:** Prefer `expo-linear-gradient` for decorative gradients. Keep start/end coordinates explicit so future tweaks remain predictable.

## Component Patterns

- Organize UI into small, focused components. Shared primitives belong under `src/components/common` while feature-specific pieces sit within their feature folder.
- Export each component through an `index.ts` barrel to maintain clean import paths.
- Favor functional components with React hooks. Avoid class components unless absolutely necessary.
- Keep layout logic close to the view. State and side-effects should move upward toward screen-level containers.
- Navigation types should extend the central `RootStackParamList` (`src/types/components.ts`).

## Styling Practices

- Use `StyleSheet.create` for static styles. Inline styles are acceptable only for dynamic values that depend on props/state.
- Translate transforms and shadows from design specs into React Native-friendly properties (e.g., `transform: [{ rotate: '15deg' }]`).
- Maintain accessibility by ensuring touch targets are at least 48px tall and text has sufficient contrast.

## Assets & Fonts

- Custom fonts reside in `assets/fonts`. Register new families in `react-native.config.js` and load them via `expo-font` in `App.tsx`.
- Keep SVG illustrations as code—avoid bundling massive binary assets unless essential.

## Home Screen Reference

The `HomeScreen` component intentionally mirrors the provided Tailwind/HTML concept:

- A centered card constrained by `layout.homeCardMaxWidth` × `layout.homeCardMaxHeight` with a diagonal gradient, 40px radius, white border at 10% opacity, and deep drop shadow.
- Dual backdrop glows positioned via percentages and negative margins to reproduce the blurred coral and teal halos from the mock-up.
- The hero title splits across two lines using Montserrat ExtraBold at 96px, while the teal subtitle uses Montserrat Regular at 16px with 70% opacity.
- The O and X illustrations match the reference sizes (144px circle, 176px cross), rotations (±15°), and placement offsets (±24px) to achieve a pixel-faithful overlap.
- The “Start Game” button stretches full width, uses the coral brand color, casts a soft shadow (`colors.buttonShadow`), and nudges downward 2px on press to emulate the HTML active state.

## Testing Expectations

- Each reusable component should include at least one unit or snapshot test when logic is present.
- Validate cross-platform compatibility before merging: ensure styles do not rely on platform-specific behavior.

## Pull Request Notes

- Summaries should mention any new components, design tokens, or navigation routes added.
- Include screenshots of notable UI changes when feasible.
