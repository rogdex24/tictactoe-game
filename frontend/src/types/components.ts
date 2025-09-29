import type { GameMode } from './game';

export type PlayerNameScreenParams = {
  nextScreen?: 'Home' | 'MatchLoading' | 'PlayerGame';
  mode?: 'bot' | 'player'; // For when nextScreen is 'MatchLoading'
  gameMode?: GameMode; // For when nextScreen is 'MatchLoading' and mode is 'player'
};

export type RootStackParamList = {
  Home: undefined;
  PlayerName: PlayerNameScreenParams | undefined;
  MatchLoading: { mode: 'bot' | 'player'; gameMode?: GameMode };
  Game: undefined;
  PlayerGame: undefined;
  Leaderboard: undefined;
};

export interface CtaButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}
