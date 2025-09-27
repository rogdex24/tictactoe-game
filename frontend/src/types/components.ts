export type PlayerNameScreenParams = {
  nextScreen?: 'Home' | 'MatchLoading';
};

export type RootStackParamList = {
  Home: undefined;
  PlayerName: PlayerNameScreenParams | undefined;
  MatchLoading: undefined;
  Game: undefined;
  Leaderboard: undefined;
};

export interface CtaButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}
