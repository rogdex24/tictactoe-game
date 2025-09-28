export type PlayerNameScreenParams = {
  nextScreen?: 'Home' | 'MatchLoading' | 'PlayerGame';
};

export type RootStackParamList = {
  Home: undefined;
  PlayerName: PlayerNameScreenParams | undefined;
  MatchLoading: undefined;
  Game: undefined;
  PlayerGame: undefined;
  Leaderboard: undefined;
};

export interface CtaButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}
