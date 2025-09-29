/**
 * Game-related type definitions
 */

export type GameMode = 'classic' | 'blitz';

export const GAME_MODES = {
  CLASSIC: 'classic' as const,
  BLITZ: 'blitz' as const,
} as const;

export const GAME_MODE_VALUES: GameMode[] = [GAME_MODES.CLASSIC, GAME_MODES.BLITZ];

/**
 * Utility functions for game mode operations
 */
export const isValidGameMode = (mode: string): mode is GameMode => {
  return GAME_MODE_VALUES.includes(mode as GameMode);
};

export const getDisplayName = (mode: GameMode): string => {
  switch (mode) {
    case GAME_MODES.CLASSIC:
      return 'Classic';
    case GAME_MODES.BLITZ:
      return 'Blitz';
    default:
      return mode;
  }
};
