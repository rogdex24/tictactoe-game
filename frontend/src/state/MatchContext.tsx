import type { MatchData, MatchmakerMatched, Socket } from '@heroiclabs/nakama-js';
import React from 'react';

import { nakamaService } from '../services/nakama';
import type { MatchMode, MatchPlayerState, MatchStatePayload, MatchStateView, PlayerMark } from '../types/match';

import { usePlayer } from './PlayerContext';

const MATCH_OPCODES = {
  START: 1,
  UPDATE: 2,
  COMPLETE: 3,
  PLAYER_MOVE: 4,
} as const;

const createEmptyBoard = () => Array<PlayerMark | null>(9).fill(null);

const decodePayload = (data?: Uint8Array): MatchStatePayload | null => {
  if (!data) {
    return null;
  }

  try {
    let json = '';
    for (let index = 0; index < data.length; index += 1) {
      json += String.fromCharCode(data[index]);
    }
    return JSON.parse(json) as MatchStatePayload;
  } catch (error) {
    console.warn('Failed to decode match payload', error);
    return null;
  }
};

const transformState = (payload: MatchStatePayload): MatchStateView => {
  const board = payload.board.map((cell) => (cell === 'X' || cell === 'O' ? cell : null)) as Array<
    PlayerMark | null
  >;

  const winner = payload.winner && payload.winner.length > 0 ? payload.winner : null;
  const players = payload.players ?? {};
  const inferredWinnerMark = winner ? players[winner]?.mark ?? null : null;

  return {
    mode: payload.mode,
    board,
    phase: payload.phase,
    players,
    currentTurn: payload.currentTurn ?? null,
    winner,
    winnerMark: payload.winnerMark ?? inferredWinnerMark ?? null,
    winningLine: payload.winningLine ? [...payload.winningLine] : null,
    moveNumber: payload.moveNumber,
    lastMove: payload.lastMove ?? null,
  };
};

export type MatchmakingStatus = 'idle' | 'searching' | 'matched' | 'joining' | 'ready' | 'error';

type MatchContextValue = {
  status: MatchmakingStatus;
  mode: MatchMode | null;
  matchId: string | null;
  matchState: MatchStateView;
  playerMark: PlayerMark | null;
  opponent: MatchPlayerState | null;
  isMyTurn: boolean;
  error: string | null;
  beginMatchmaking: (mode: MatchMode) => Promise<void>;
  cancelMatchmaking: () => Promise<void>;
  leaveMatch: () => Promise<void>;
  sendMove: (position: number) => Promise<void>;
};

const MatchContext = React.createContext<MatchContextValue | undefined>(undefined);

export const MatchProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { session } = usePlayer();
  const playerId = session?.user_id ?? null;

  const [status, setStatus] = React.useState<MatchmakingStatus>('idle');
  const [matchState, setMatchState] = React.useState<MatchStateView | null>(null);
  const [playerMark, setPlayerMark] = React.useState<PlayerMark | null>(null);
  const [mode, setMode] = React.useState<MatchMode | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [matchIdState, setMatchIdState] = React.useState<string | null>(null);
  const matchIdRef = React.useRef<string | null>(null);
  const setMatchId = React.useCallback((value: string | null) => {
    matchIdRef.current = value;
    setMatchIdState(value);
  }, []);

  const ticketRef = React.useRef<string | null>(null);
  const setTicket = React.useCallback((value: string | null) => {
    ticketRef.current = value;
  }, []);

  const socketRef = React.useRef<Socket | null>(null);

  const resetMatchState = React.useCallback(() => {
    setMatchState(null);
    setPlayerMark(null);
    setMatchId(null);
    setMode(null);
  }, [setMatchId]);

  const detachSocketHandlers = React.useCallback(() => {
    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    socket.onmatchmakermatched = () => {
      /* noop */
    };
    socket.onmatchdata = () => {
      /* noop */
    };
  }, []);

  const handleMatchData = React.useCallback(
    (message: MatchData) => {
      if (
        message.op_code !== MATCH_OPCODES.START &&
        message.op_code !== MATCH_OPCODES.UPDATE &&
        message.op_code !== MATCH_OPCODES.COMPLETE
      ) {
        return;
      }

      const payload = decodePayload(message.data);
      if (!payload) {
        return;
      }

      const transformed = transformState(payload);
      setMatchState(transformed);
      setMode(transformed.mode);

      if (playerId) {
        const playerState = transformed.players[playerId];
        setPlayerMark(playerState?.mark ?? null);
      }

      if (status !== 'ready') {
        setStatus('ready');
      }
    },
    [playerId, status],
  );

  const handleMatchmakerMatched = React.useCallback(
    async (matched: MatchmakerMatched) => {
      setStatus('matched');
      setTicket(null);
      setMatchId(matched.match_id);
      setError(null);

      try {
        setStatus('joining');
        await nakamaService.joinMatch(matched.match_id);
      } catch (joinError) {
        console.error('Failed to join match', joinError);
        setError('Unable to join the match. Please try again.');
        setStatus('error');
      }
    },
    [setMatchId, setTicket],
  );

  const beginMatchmaking = React.useCallback(
    async (matchMode: MatchMode) => {
      if (!session) {
        throw new Error('Authentication required before matchmaking.');
      }

      setError(null);
      setStatus('searching');
      setMode(matchMode);
      setMatchState(null);
      setPlayerMark(null);
      setMatchId(null);

      try {
        const socket = await nakamaService.connectSocket();
        socketRef.current = socket;

        const existingDisconnect = socket.ondisconnect;
        socket.ondisconnect = (event) => {
          if (typeof existingDisconnect === 'function') {
            existingDisconnect(event);
          }
          socketRef.current = null;
          resetMatchState();
          setTicket(null);
          setStatus('idle');
        };

        socket.onmatchmakermatched = handleMatchmakerMatched;
        socket.onmatchdata = handleMatchData;

        const ticket = await nakamaService.addMatchmaker(matchMode);
        setTicket(ticket.ticket);
      } catch (matchmakingError) {
        console.error('Failed to begin matchmaking', matchmakingError);
        setError('Unable to start matchmaking. Please try again.');
        setStatus('error');
      }
    },
    [session, handleMatchData, handleMatchmakerMatched, resetMatchState, setMatchId, setTicket],
  );

  const cancelMatchmaking = React.useCallback(async () => {
    const ticket = ticketRef.current;
    if (ticket) {
      await nakamaService.removeMatchmaker(ticket);
    }

    setTicket(null);
    setStatus('idle');
  }, [setTicket]);

  const leaveMatch = React.useCallback(async () => {
    const activeMatch = matchIdRef.current;
    if (activeMatch) {
      await nakamaService.leaveMatch(activeMatch);
    }

    detachSocketHandlers();
    resetMatchState();
    setStatus('idle');
  }, [detachSocketHandlers, resetMatchState]);

  const sendMove = React.useCallback(
    async (position: number) => {
      const socket = socketRef.current;
      if (
        !socket ||
        !matchIdState ||
        !matchState ||
        matchState.phase !== 'playing' ||
        !playerId ||
        matchState.currentTurn !== playerId
      ) {
        return;
      }

      try {
        await socket.sendMatchState(matchIdState, MATCH_OPCODES.PLAYER_MOVE, JSON.stringify({ position }));
      } catch (moveError) {
        console.warn('Failed to send move', moveError);
      }
    },
    [matchIdState, matchState, playerId],
  );

  React.useEffect(() => {
    return () => {
      const ticket = ticketRef.current;
      if (ticket) {
        nakamaService.removeMatchmaker(ticket).catch((cleanupError) => {
          console.warn('Failed to cancel matchmaking during cleanup', cleanupError);
        });
      }

      const activeMatch = matchIdRef.current;
      if (activeMatch) {
        nakamaService.leaveMatch(activeMatch).catch((cleanupError) => {
          console.warn('Failed to leave match during cleanup', cleanupError);
        });
      }
    };
  }, []);

  React.useEffect(() => {
    if (!matchIdState && status === 'ready') {
      setStatus('idle');
    }
  }, [matchIdState, status]);

  const opponent = React.useMemo(() => {
    if (!matchState || !playerId) {
      return null;
    }

    return (
      Object.values(matchState.players).find((participant) => participant.userId !== playerId) ?? null
    );
  }, [matchState, playerId]);

  const isMyTurn = Boolean(
    matchState && playerId && matchState.phase === 'playing' && matchState.currentTurn === playerId,
  );

  const contextValue = React.useMemo<MatchContextValue>(
    () => ({
      status,
      mode: matchState?.mode ?? mode,
      matchId: matchIdState,
      matchState: matchState ?? {
        mode: mode ?? 'classic',
        board: createEmptyBoard(),
        phase: 'waiting',
        players: {},
        currentTurn: null,
        winner: null,
        winnerMark: null,
        winningLine: null,
        moveNumber: 0,
        lastMove: null,
      },
      playerMark,
      opponent,
      isMyTurn,
      error,
      beginMatchmaking,
      cancelMatchmaking,
      leaveMatch,
      sendMove,
    }),
    [
      beginMatchmaking,
      cancelMatchmaking,
      error,
      isMyTurn,
      leaveMatch,
      matchIdState,
      matchState,
      mode,
      opponent,
      playerMark,
      sendMove,
      status,
    ],
  );

  return <MatchContext.Provider value={contextValue}>{children}</MatchContext.Provider>;
};

export const useMatch = () => {
  const context = React.useContext(MatchContext);
  if (!context) {
    throw new Error('useMatch must be used within a MatchProvider');
  }

  return context;
};
