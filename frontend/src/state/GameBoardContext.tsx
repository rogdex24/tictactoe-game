import type { Match, Socket } from '@heroiclabs/nakama-js';
import React from 'react';

// Types
export type PlayerMark = 'X' | 'O';
export type ResultTone = 'win' | 'loss' | 'draw' | 'forfeit';

// Constants
export const MATCH_OPCODE_PLAYER_MOVE = 4;

// Utility functions
export const createEmptyBoard = (): (PlayerMark | null)[] => Array(9).fill(null);

// Context interface
interface GameBoardContextValue {
  // Game state
  board: (PlayerMark | null)[];
  winningCells: number[] | null;
  currentTurnMark: PlayerMark | null;
  yourMark: PlayerMark | null;
  resultLabel: string | null;
  resultTone: ResultTone | null;
  isSendingMove: boolean;

  // Actions
  sendMove: (
    index: number,
    socket: Socket | null,
    match: Match | null,
    phase: string,
    opponentConnected: boolean,
  ) => void;
  resetBoard: () => void;
  updateBoard: (newBoard: (PlayerMark | null)[]) => void;
  updateWinningCells: (cells: number[] | null) => void;
  updateCurrentTurnMark: (mark: PlayerMark | null) => void;
  updateYourMark: (mark: PlayerMark | null) => void;
  updateResultLabel: (label: string | null) => void;
  updateResultTone: (tone: ResultTone | null) => void;
  setIsSendingMove: (value: boolean) => void;
}

const GameBoardContext = React.createContext<GameBoardContextValue | null>(null);

export const useGameBoard = (): GameBoardContextValue => {
  const context = React.useContext(GameBoardContext);
  if (!context) {
    throw new Error('useGameBoard must be used within a GameBoardProvider');
  }
  return context;
};

interface GameBoardProviderProps {
  children: React.ReactNode;
  onMoveError?: (error: string) => void;
}

export const GameBoardProvider: React.FC<GameBoardProviderProps> = ({ children, onMoveError }) => {
  // State
  const [board, setBoard] = React.useState<(PlayerMark | null)[]>(createEmptyBoard);
  const [winningCells, setWinningCells] = React.useState<number[] | null>(null);
  const [currentTurnMark, setCurrentTurnMark] = React.useState<PlayerMark | null>(null);
  const [yourMark, setYourMark] = React.useState<PlayerMark | null>(null);
  const [resultLabel, setResultLabel] = React.useState<string | null>(null);
  const [resultTone, setResultTone] = React.useState<ResultTone | null>(null);
  const [isSendingMove, setIsSendingMove] = React.useState(false);

  // Reset board function
  const resetBoard = React.useCallback(() => {
    setBoard(createEmptyBoard());
    setWinningCells(null);
    setCurrentTurnMark(null);
    setYourMark(null);
    setResultLabel(null);
    setResultTone(null);
    setIsSendingMove(false);
  }, []);

  // Update functions
  const updateBoard = React.useCallback((newBoard: (PlayerMark | null)[]) => {
    setBoard(newBoard);
  }, []);

  const updateWinningCells = React.useCallback((cells: number[] | null) => {
    setWinningCells(cells);
  }, []);

  const updateCurrentTurnMark = React.useCallback((mark: PlayerMark | null) => {
    setCurrentTurnMark(mark);
  }, []);

  const updateYourMark = React.useCallback((mark: PlayerMark | null) => {
    setYourMark(mark);
  }, []);

  const updateResultLabel = React.useCallback((label: string | null) => {
    setResultLabel(label);
  }, []);

  const updateResultTone = React.useCallback((tone: ResultTone | null) => {
    setResultTone(tone);
  }, []);

  // Send move function
  const sendMove = React.useCallback(
    (
      index: number,
      socket: Socket | null,
      match: Match | null,
      phase: string,
      opponentConnected: boolean,
    ) => {
      if (
        phase !== 'playing' ||
        !socket ||
        !match ||
        !yourMark ||
        currentTurnMark !== yourMark ||
        isSendingMove ||
        board[index] !== null ||
        !opponentConnected
      ) {
        return;
      }

      setIsSendingMove(true);

      const payload = JSON.stringify({ index });

      socket.sendMatchState(match.match_id, MATCH_OPCODE_PLAYER_MOVE, payload).catch((error) => {
        console.error('Failed to submit move', error);
        if (onMoveError) {
          onMoveError('Failed to submit move. Please try again.');
        }
        setIsSendingMove(false);
      });
    },
    [board, currentTurnMark, isSendingMove, yourMark, onMoveError],
  );

  const contextValue: GameBoardContextValue = {
    // Game state
    board,
    winningCells,
    currentTurnMark,
    yourMark,
    resultLabel,
    resultTone,
    isSendingMove,

    // Actions
    sendMove,
    resetBoard,
    updateBoard,
    updateWinningCells,
    updateCurrentTurnMark,
    updateYourMark,
    updateResultLabel,
    updateResultTone,
    setIsSendingMove,
  };

  return <GameBoardContext.Provider value={contextValue}>{children}</GameBoardContext.Provider>;
};
