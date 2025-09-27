export type MatchMode = 'classic' | 'blitz';

export type PlayerMark = 'X' | 'O';

export type MatchPhase = 'waiting' | 'playing' | 'complete';

export interface MatchPlayerState {
  userId: string;
  username: string;
  displayName?: string | null;
  mark: PlayerMark;
}

export interface MatchMovePayload {
  userId: string;
  position: number;
  mark: PlayerMark;
}

export interface MatchStatePayload {
  mode: MatchMode;
  board: Array<PlayerMark | ''>;
  phase: MatchPhase;
  players: Record<string, MatchPlayerState>;
  currentTurn?: string;
  winner?: string;
  winnerMark?: PlayerMark;
  winningLine?: number[];
  moveNumber: number;
  lastMove?: MatchMovePayload | null;
}

export interface MatchStateView {
  mode: MatchMode;
  board: Array<PlayerMark | null>;
  phase: MatchPhase;
  players: Record<string, MatchPlayerState>;
  currentTurn: string | null;
  winner: string | null;
  winnerMark: PlayerMark | null;
  winningLine: number[] | null;
  moveNumber: number;
  lastMove: MatchMovePayload | null;
}
