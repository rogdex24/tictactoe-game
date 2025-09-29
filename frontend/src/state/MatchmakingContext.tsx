import type {
  Match,
  MatchData,
  MatchmakerMatched,
  MatchmakerTicket,
  Socket,
  MatchPresenceEvent,
} from '@heroiclabs/nakama-js';
import React from 'react';

import { nakamaService } from '../services/nakama';

import { useGameBoard, type PlayerMark, GameBoardProvider } from './GameBoardContext';

// Types
type MatchPhase = 'connecting' | 'matching' | 'joining' | 'playing' | 'complete' | 'error';

type ServerPlayer = {
  userId: string;
  username: string;
  mark: PlayerMark;
  connected: boolean;
};

type ServerMatchState = {
  board?: string[];
  currentMark?: string;
  mode?: string;
  players?: ServerPlayer[];
  isComplete?: boolean;
  winnerMark?: string;
  winnerUserId?: string;
  winningCells?: number[];
  result?: string;
};

type ErrorPayload = {
  message?: string;
};

type MatchUpdateKind = 'start' | 'update' | 'complete';

// Constants
const MATCH_MODE_CLASSIC = 'classic';
const MATCHMAKER_QUERY = '*'; // Server-authoritative query for Go plugin
const MATCH_OPCODE_GAME_START = 1;
const MATCH_OPCODE_BOARD_UPDATE = 2;
const MATCH_OPCODE_GAME_OVER = 3;
const MATCH_OPCODE_ERROR = 5;

const decodeMatchData = (data: Uint8Array | string): string => {
  if (typeof data === 'string') {
    return data;
  }

  if (typeof TextDecoder !== 'undefined') {
    try {
      return new TextDecoder().decode(data);
    } catch (error) {
      console.warn('Failed to decode payload with TextDecoder', error);
    }
  }

  let result = '';
  for (let index = 0; index < data.length; index += 1) {
    result += String.fromCharCode(data[index]);
  }
  return result;
};

// Context interface
interface MatchmakingContextValue {
  // Match state
  phase: MatchPhase;
  statusMessage: string;
  opponentName: string | null;
  opponentConnected: boolean;
  mode: string;
  errorMessage: string | null;
  isMatchmakingRequested: boolean; // Track if user explicitly requested matchmaking

  // Actions
  startMatchmaking: () => Promise<void>;
  cleanupMatchmaking: () => Promise<void>;
  sendMove: (index: number) => void; // Delegate to GameBoardContext
  resetMatchState: () => void;
  requestMatchmaking: () => void; // User explicitly requests matchmaking

  // Match reference for direct access
  currentMatch: Match | null;
}

const MatchmakingContext = React.createContext<MatchmakingContextValue | null>(null);

export const useMatchmaking = (): MatchmakingContextValue => {
  const context = React.useContext(MatchmakingContext);
  if (!context) {
    throw new Error('useMatchmaking must be used within a MatchmakingProvider');
  }
  return context;
};

interface MatchmakingProviderProps {
  children: React.ReactNode;
}

export const MatchmakingProvider: React.FC<MatchmakingProviderProps> = ({ children }) => {
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleMoveError = React.useCallback((error: string) => {
    setErrorMessage(error);
  }, []);

  return (
    <GameBoardProvider onMoveError={handleMoveError}>
      <MatchmakingContextProvider errorMessage={errorMessage} setErrorMessage={setErrorMessage}>
        {children}
      </MatchmakingContextProvider>
    </GameBoardProvider>
  );
};

interface MatchmakingContextProviderProps {
  children: React.ReactNode;
  errorMessage: string | null;
  setErrorMessage: (error: string | null) => void;
}

const MatchmakingContextProvider: React.FC<MatchmakingContextProviderProps> = ({
  children,
  errorMessage,
  setErrorMessage,
}) => {
  // Get game board context to update game state
  const gameBoard = useGameBoard();

  // State
  const [phase, setPhase] = React.useState<MatchPhase>('connecting');
  const [statusMessage, setStatusMessage] = React.useState('Connecting to matchmaking...');
  const [opponentName, setOpponentName] = React.useState<string | null>(null);
  const [opponentConnected, setOpponentConnected] = React.useState(false);
  const [mode, setMode] = React.useState(MATCH_MODE_CLASSIC);
  const [isMatchmakingRequested, setIsMatchmakingRequested] = React.useState(false);

  // Refs
  const socketRef = React.useRef<Socket | null>(null);
  const ticketRef = React.useRef<MatchmakerTicket | null>(null);
  const matchRef = React.useRef<Match | null>(null);
  const cleanupHandlersRef = React.useRef<(() => void) | null>(null);
  const isMountedRef = React.useRef(false);
  const selfUserIdRef = React.useRef<string | null>(null);
  const isJoiningMatchRef = React.useRef(false); // Prevent race conditions
  const processedTicketsRef = React.useRef(new Set<string>()); // Track processed tickets
  const isMatchmakingActiveRef = React.useRef(false); // Track matchmaking state without causing re-renders

  // Reset all match state function
  const resetMatchState = React.useCallback(() => {
    console.log('🧹 Resetting all match state');
    setPhase('connecting');
    setStatusMessage('Ready to start matchmaking...');
    gameBoard.resetBoard();
    setOpponentName(null);
    setOpponentConnected(false);
    setMode(MATCH_MODE_CLASSIC);
    setErrorMessage(null);
    setIsMatchmakingRequested(false); // Clear matchmaking intent.
    // It is critical to reset this flag here to ensure that after a full state reset,
    // matchmaking is not automatically re-initiated. This guarantees that matchmaking
    // will only start again if the user explicitly requests it, preventing unintended
    // automatic matchmaking and keeping state transitions predictable.

    // Clear any stale processed tickets
    processedTicketsRef.current.clear();
    // Ensure matchmaking is marked as inactive
    isMatchmakingActiveRef.current = false;
    isJoiningMatchRef.current = false;
  }, [gameBoard, setErrorMessage]);

  // Request matchmaking function - called when user explicitly wants to start matchmaking
  const requestMatchmaking = React.useCallback(() => {
    console.log('🎯 User explicitly requested matchmaking');
    setIsMatchmakingRequested(true);
  }, []);

  // Send move function - delegates to game board context
  const sendMove = React.useCallback(
    (index: number) => {
      gameBoard.sendMove(index, socketRef.current, matchRef.current, phase, opponentConnected);
    },
    [gameBoard, phase, opponentConnected],
  );

  // Cleanup matchmaking function
  const cleanupMatchmaking = React.useCallback(async () => {
    const socket = socketRef.current;
    const ticket = ticketRef.current;
    const match = matchRef.current;

    console.log('🧹 Cleaning up matchmaking state');

    // Set flag to prevent any new matchmaking until cleanup is complete
    isMatchmakingActiveRef.current = false;

    // Remove socket handlers first
    if (cleanupHandlersRef.current) {
      cleanupHandlersRef.current();
      cleanupHandlersRef.current = null;
    }

    // Leave the match if we're in one
    if (socket && match) {
      try {
        await socket.leaveMatch(match.match_id);
        console.log('✅ Left match:', match.match_id);
        // Small delay to ensure server processes the leave
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.warn('Failed to leave match:', error);
      }
    }

    // Remove matchmaker ticket
    if (socket && ticket) {
      try {
        await socket.removeMatchmaker(ticket.ticket);
        console.log('✅ Removed matchmaker ticket:', ticket.ticket);
      } catch (error) {
        console.warn('Failed to remove matchmaker ticket:', error);
      }
    }

    // Disconnect socket completely
    if (socket) {
      try {
        await nakamaService.disconnectSocket();
        console.log('✅ Disconnected from socket');
        // Additional delay to ensure server processes the disconnect
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.warn('Failed to disconnect socket:', error);
      }
    }

    // Clear all processed tickets to prevent stale state
    processedTicketsRef.current.clear();

    // Reset all refs
    socketRef.current = null;
    ticketRef.current = null;
    matchRef.current = null;
    isJoiningMatchRef.current = false;

    console.log('🧹 Matchmaking cleanup complete');
  }, []);

  // Handle match error
  const handleMatchError = React.useCallback(
    (message: MatchData) => {
      console.error('❌ Match error received:', message);
      const payload = decodeMatchData(message.data);
      const error: ErrorPayload = JSON.parse(payload);
      const errorMsg = error.message || 'An unknown error occurred';

      setPhase('error');
      setStatusMessage('Match error occurred');
      setErrorMessage(errorMsg);
    },
    [setErrorMessage],
  );

  // Handle match state updates
  const handleMatchState = React.useCallback(
    (payload: ServerMatchState, kind: MatchUpdateKind) => {
      if (!isMountedRef.current) return;

      console.log(`📦 Match ${kind}:`, payload);

      // Debug: Log players information
      if (payload.players) {
        console.log('👥 Players in match state:', payload.players);
        const session = nakamaService.getSession();
        if (session) {
          const selfPlayer = payload.players.find((p) => p.userId === session.user_id);
          const opponent = payload.players.find((p) => p.userId !== session.user_id);
          console.log('🎮 Self player:', selfPlayer);
          console.log('🎭 Opponent player:', opponent);
        }
      }

      // Update board if provided
      if (payload.board) {
        const newBoard = payload.board.map((cell) => (cell === '' ? null : (cell as PlayerMark)));
        gameBoard.updateBoard(newBoard);
      }

      // Update current turn
      if (payload.currentMark) {
        gameBoard.updateCurrentTurnMark(payload.currentMark as PlayerMark);
      }

      // Update players and marks
      if (payload.players && payload.players.length >= 2) {
        const session = nakamaService.getSession();
        if (!session) return;

        const selfPlayer = payload.players.find((p) => p.userId === session.user_id);
        const opponent = payload.players.find((p) => p.userId !== session.user_id);

        if (selfPlayer) {
          gameBoard.updateYourMark(selfPlayer.mark);
        }

        if (opponent) {
          // Set opponent name immediately with username, then try to get display name
          setOpponentName(opponent.username);
          setOpponentConnected(opponent.connected);

          // Try to get display name asynchronously
          nakamaService
            .getUsers([opponent.userId])
            .then((usersResponse) => {
              const opponentUser = usersResponse?.users?.[0];
              const displayName = opponentUser?.display_name?.trim();
              if (displayName && displayName.length > 0) {
                console.log(
                  '🎭 Updating opponent name from match data to display name:',
                  displayName,
                );
                setOpponentName(displayName);
              }
            })
            .catch((error) => {
              console.warn(
                'Failed to get opponent display name from match data, keeping username:',
                error,
              );
            });
        }
      }

      // Update mode
      if (payload.mode) {
        setMode(payload.mode);
      }

      // Handle winning condition
      if (payload.winningCells && payload.winningCells.length > 0) {
        gameBoard.updateWinningCells(payload.winningCells);
      }

      // Handle match completion
      if (payload.isComplete) {
        setPhase('complete');

        if (payload.result === 'draw') {
          setStatusMessage('The match ended in a draw.');
          gameBoard.updateResultLabel('Draw');
          gameBoard.updateResultTone('draw');
        } else if (payload.result === 'forfeit') {
          if (payload.winnerUserId === nakamaService.getSession()?.user_id) {
            setStatusMessage('Opponent forfeited the match. You win!');
            gameBoard.updateResultLabel('Victory (Forfeit)');
            gameBoard.updateResultTone('win');
          } else {
            setStatusMessage('You left the match.');
            gameBoard.updateResultLabel('Forfeit');
            gameBoard.updateResultTone('forfeit');
          }
        } else if (payload.winnerUserId === nakamaService.getSession()?.user_id) {
          setStatusMessage('You won the match!');
          gameBoard.updateResultLabel('Victory');
          gameBoard.updateResultTone('win');
        } else {
          setStatusMessage('Your opponent won the match.');
          gameBoard.updateResultLabel('Defeat');
          gameBoard.updateResultTone('loss');
        }
      } else if (kind === 'start') {
        setPhase('playing');
        gameBoard.updateResultLabel(null);
        gameBoard.updateResultTone(null);

        // Ensure we have opponent information when game starts
        if (payload.players && payload.players.length >= 2) {
          const session = nakamaService.getSession();
          if (session) {
            const opponent = payload.players.find((p) => p.userId !== session.user_id);
            if (opponent && !opponentName) {
              console.log('🔄 Game starting - ensuring opponent name is set:', opponent);
              setOpponentName(opponent.username);
              setOpponentConnected(opponent.connected);

              // Try to get display name
              nakamaService
                .getUsers([opponent.userId])
                .then((usersResponse) => {
                  const opponentUser = usersResponse?.users?.[0];
                  const displayName = opponentUser?.display_name?.trim();
                  if (displayName && displayName.length > 0) {
                    console.log(
                      '🎭 Updating opponent name at game start to display name:',
                      displayName,
                    );
                    setOpponentName(displayName);
                  }
                })
                .catch((error) => {
                  console.warn('Failed to get opponent display name at game start:', error);
                });
            }
          }
        }

        setStatusMessage(
          `Match started! You are ${gameBoard.yourMark || 'waiting for assignment'}. ${
            payload.currentMark === gameBoard.yourMark ? "It's your turn!" : "Opponent's turn."
          }`,
        );

        if (payload.currentMark === gameBoard.yourMark) {
          setStatusMessage('Match started. Your turn!');
        } else {
          setStatusMessage("Opponent's turn...");
        }
      } else if (kind === 'update') {
        if (payload.currentMark === gameBoard.yourMark) {
          setStatusMessage("It's your turn!");
        } else {
          setStatusMessage("Opponent's turn...");
        }
      }
    },
    [gameBoard, opponentName],
  );

  // Handle match data
  const handleMatchData = React.useCallback(
    (message: MatchData) => {
      if (!isMountedRef.current) return;

      const opCode = message.op_code;
      const payload = decodeMatchData(message.data);
      const data: ServerMatchState = JSON.parse(payload);

      if (opCode === MATCH_OPCODE_GAME_START) {
        handleMatchState(data, 'start');
      } else if (opCode === MATCH_OPCODE_BOARD_UPDATE) {
        handleMatchState(data, 'update');
      } else if (opCode === MATCH_OPCODE_GAME_OVER) {
        handleMatchState(data, 'complete');
      } else if (opCode === MATCH_OPCODE_ERROR) {
        handleMatchError(message);
      }

      gameBoard.setIsSendingMove(false);
    },
    [handleMatchState, handleMatchError, gameBoard],
  );

  // Handle match found
  const handleMatchFound = React.useCallback(
    async (socket: Socket, matched: MatchmakerMatched) => {
      if (isJoiningMatchRef.current || !isMountedRef.current) {
        console.log('⚠️ Already joining a match or component unmounted, skipping');
        return;
      }

      // Check if this ticket has already been processed
      const ticketId = matched.ticket;
      if (processedTicketsRef.current.has(ticketId)) {
        console.log('⚠️ Ticket already processed:', ticketId);
        return;
      }

      processedTicketsRef.current.add(ticketId);
      isJoiningMatchRef.current = true;

      console.log('🎯 Match found! Joining server-authoritative match...', matched.match_id);
      setPhase('joining');
      setStatusMessage('Match found! Joining...');

      try {
        // Store the session user ID for later reference
        const session = nakamaService.getSession();
        if (session) {
          selfUserIdRef.current = session.user_id || null;
        }

        // Join the match using the match ID provided by the Go plugin
        if (matched.match_id) {
          console.log('🔗 Joining server-authoritative match:', matched.match_id);
          const match = await socket.joinMatch(matched.match_id);
          matchRef.current = match;
        } else {
          throw new Error('No match ID provided by server-authoritative matchmaker');
        }

        console.log('✅ Successfully joined match:', matchRef.current.match_id);
        console.log('👥 Match participants:', matchRef.current.presences?.length || 0);

        // Remove the matchmaker ticket since we found a match
        if (ticketRef.current) {
          try {
            await socket.removeMatchmaker(ticketRef.current.ticket);
            console.log('✅ Removed matchmaker ticket after joining match');
          } catch (ticketError) {
            console.warn('Failed to remove ticket after joining match:', ticketError);
          }
          ticketRef.current = null;
        }

        console.log('🎮 Setting phase to playing...');
        setPhase('playing');
        setStatusMessage('Joined match! Waiting for game to start...');
        console.log('🎮 Successfully set phase to playing');
      } catch (error) {
        console.error('❌ Failed to join match:', error);
        setPhase('error');
        setStatusMessage('Failed to join match');
        setErrorMessage('Unable to join the match. Please try again.');
      } finally {
        isJoiningMatchRef.current = false;
      }
    },
    [setErrorMessage],
  );

  // Attach socket handlers
  const attachSocketHandlers = React.useCallback(
    (socket: Socket) => {
      console.log('🔗 Attaching socket event handlers');

      const onMatchmakerMatched = (matched: MatchmakerMatched) => {
        console.log('🎯 Matchmaker matched event:', matched);
        handleMatchFound(socket, matched);
      };

      const onMatchData = (message: MatchData) => {
        console.log('📦 Match data received:', { opCode: message.op_code });
        handleMatchData(message);
      };

      const onMatchPresence = (event: MatchPresenceEvent) => {
        console.log('👥 Match presence event:', event);

        // Handle new players joining
        if (event.joins && event.joins.length > 0) {
          for (const joinedUser of event.joins) {
            // Skip if this is the current user
            const session = nakamaService.getSession();
            if (session && joinedUser.user_id !== session.user_id) {
              console.log('🎭 Opponent joined:', {
                userId: joinedUser.user_id,
                username: joinedUser.username,
              });

              // Set opponent name immediately with username, then try to get display name
              setOpponentName(joinedUser.username);
              setOpponentConnected(true);

              // Try to get the display name asynchronously
              nakamaService
                .getUsers([joinedUser.user_id])
                .then((usersResponse) => {
                  const opponentUser = usersResponse?.users?.[0];
                  const displayName = opponentUser?.display_name?.trim();
                  if (displayName && displayName.length > 0) {
                    console.log('🎭 Updating opponent name to display name:', displayName);
                    setOpponentName(displayName);
                  }
                })
                .catch((error) => {
                  console.warn('Failed to get opponent display name, keeping username:', error);
                });
            }
          }
        }

        // Handle players leaving
        if (event.leaves && event.leaves.length > 0) {
          event.leaves.forEach((leftUser) => {
            const session = nakamaService.getSession();
            if (session && leftUser.user_id !== session.user_id) {
              console.log('🚪 Opponent left:', leftUser.username);
              setOpponentConnected(false);
            }
          });
        }
      };

      socket.onmatchmakermatched = onMatchmakerMatched;
      socket.onmatchdata = onMatchData;
      socket.onmatchpresence = onMatchPresence;

      // Return cleanup function
      const cleanup = () => {
        console.log('🧹 Cleaning up socket handlers');
        socket.onmatchmakermatched = () => {};
        socket.onmatchdata = () => {};
        socket.onmatchpresence = () => {};
      };

      cleanupHandlersRef.current = cleanup;
      return cleanup;
    },
    [handleMatchData, handleMatchFound, setOpponentName, setOpponentConnected],
  );

  // Start matchmaking
  const startMatchmaking = React.useCallback(async () => {
    console.log('🚀 Starting matchmaking...');
    console.log('🔍 Current state:', {
      isMatchmakingActive: isMatchmakingActiveRef.current,
      phase,
      hasSocket: !!socketRef.current,
      hasMatch: !!matchRef.current,
      hasTicket: !!ticketRef.current,
      isMatchmakingRequested,
    });

    // Only start matchmaking if user explicitly requested it
    if (!isMatchmakingRequested) {
      console.log('⚠️ Matchmaking not requested by user, skipping');
      return;
    }

    if (isMatchmakingActiveRef.current) {
      console.log('⚠️ Matchmaking already active, skipping');
      return;
    }

    // Additional safety check - don't start if we're in a non-connecting phase
    if (phase !== 'connecting' && phase !== 'error') {
      console.log('⚠️ Matchmaking cannot start, current phase:', phase);
      return;
    }

    console.log('✅ Starting fresh matchmaking session...');
    isMatchmakingActiveRef.current = true;
    isJoiningMatchRef.current = false;
    processedTicketsRef.current.clear();

    try {
      setPhase('connecting');
      setStatusMessage('Connecting to matchmaking...');
      setErrorMessage(null);

      const socket = await nakamaService.connectSocket();
      socketRef.current = socket;
      attachSocketHandlers(socket);

      console.log('✅ Socket connected, requesting matchmaker ticket');
      setPhase('matching');
      setStatusMessage('Looking for opponents...');

      const ticket = await socket.addMatchmaker(MATCHMAKER_QUERY, 2, 2, {
        mode: MATCH_MODE_CLASSIC,
      });
      ticketRef.current = ticket;

      console.log('🎫 Matchmaker ticket created:', ticket.ticket);
      setStatusMessage('Searching for a match...');
    } catch (error) {
      console.error('❌ Matchmaking failed:', error);
      setPhase('error');
      setStatusMessage('Failed to start matchmaking');
      setErrorMessage(
        'Unable to connect to matchmaking. Please check your connection and try again.',
      );
    }
  }, [attachSocketHandlers, phase, isMatchmakingRequested, setErrorMessage]);

  // Initialize component
  React.useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cleanupHandlersRef.current = null;
      cleanupMatchmaking().catch((error) => {
        console.warn('Failed to cleanup matchmaking on unmount:', error);
      });
    };
  }, [cleanupMatchmaking]);

  // Auto-cleanup when game completes
  React.useEffect(() => {
    if (phase === 'complete') {
      console.log('🏁 Game completed, automatically cleaning up matchmaking');
      // Add a small delay to ensure the user can see the result briefly
      const timer = setTimeout(() => {
        cleanupMatchmaking().catch((error) => {
          console.warn('Failed to auto-cleanup matchmaking on game completion:', error);
        });
      }, 1000); // 1 second delay to show the result

      return () => clearTimeout(timer);
    }
  }, [phase, cleanupMatchmaking]);

  const contextValue: MatchmakingContextValue = {
    // State
    phase,
    statusMessage,
    opponentName,
    opponentConnected,
    mode,
    errorMessage,
    isMatchmakingRequested,

    // Actions
    startMatchmaking,
    cleanupMatchmaking,
    sendMove,
    resetMatchState,
    requestMatchmaking,

    // Match reference
    currentMatch: matchRef.current,
  };

  return <MatchmakingContext.Provider value={contextValue}>{children}</MatchmakingContext.Provider>;
};
