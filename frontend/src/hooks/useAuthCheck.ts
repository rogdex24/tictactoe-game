import React from 'react';

import { usePlayer } from '../state/PlayerContext';

/**
 * Hook to ensure user is authenticated before proceeding with game actions
 * Returns authentication status and a function to authenticate if needed
 */
export const useAuthCheck = () => {
  const { isAuthenticated, authenticate, isAuthLoading, playerName } = usePlayer();

  /**
   * Ensures the user is authenticated, authenticating them if necessary
   * @param customPlayerName - Optional player name to use for authentication
   * @returns Promise that resolves when authenticated
   */
  const ensureAuthenticated = React.useCallback(
    async (customPlayerName?: string) => {
      if (isAuthenticated) {
        return; // Already authenticated
      }

      try {
        const nameToUse = customPlayerName || playerName || 'Player';
        await authenticate(nameToUse);
      } catch (error) {
        console.error('Failed to authenticate user:', error);
        throw new Error('Authentication required to continue. Please try again.');
      }
    },
    [isAuthenticated, authenticate, playerName],
  );

  return {
    isAuthenticated,
    isAuthLoading,
    ensureAuthenticated,
  };
};
