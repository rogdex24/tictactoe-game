export type PlayerNameScreenParams = {
  nextScreen?: 'Home' | 'MatchLoading' | 'PlayerGame';
  mode?: 'bot' | 'player'; // For when nextScreen is 'MatchLoading'
};

export type RootStackParamList = {
  Home: undefined;
  PlayerName: PlayerNameScreenParams | undefined;
  MatchLoading: { mode: 'bot' | 'player' };
  Game: undefined;
  PlayerGame: undefined;
  Leaderboard: undefined;
};

export interface CtaButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}
