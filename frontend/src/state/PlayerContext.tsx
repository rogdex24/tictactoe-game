import { Platform } from 'react-native';

import type { Session } from '@heroiclabs/nakama-js';
import * as SecureStore from 'expo-secure-store';
import React from 'react';

import { nakamaService } from '../services/nakama';

const PLAYER_STORAGE_KEY = 'player-profile';

const isWeb = Platform.OS === 'web';

const hasLocalStorage = () =>
  typeof globalThis !== 'undefined' &&
  'localStorage' in globalThis &&
  globalThis.localStorage !== null;

const parsePersistedName = (rawValue: string | null): string => {
  if (!rawValue) {
    return '';
  }

  try {
    const parsed = JSON.parse(rawValue) as { state?: { playerName?: unknown } } | undefined;
    const parsedName = parsed?.state?.playerName;

    if (typeof parsedName === 'string') {
      return parsedName;
    }
  } catch (error) {
    // Ignore parse failures and fall back to the raw value.
  }

  return rawValue;
};

const serializePersistedName = (name: string) =>
  JSON.stringify({
    state: { playerName: name },
    version: 0,
  });

const readStoredName = async () => {
  if (isWeb && hasLocalStorage()) {
    try {
      return parsePersistedName(globalThis.localStorage.getItem(PLAYER_STORAGE_KEY));
    } catch (error) {
      console.warn('Failed to read player storage', error);
      return '';
    }
  }

  try {
    const storedValue = await SecureStore.getItemAsync(PLAYER_STORAGE_KEY);
    return parsePersistedName(storedValue);
  } catch (error) {
    console.warn('Failed to read player storage', error);
    return '';
  }
};

const persistName = async (name: string) => {
  const value = serializePersistedName(name);

  if (isWeb && hasLocalStorage()) {
    try {
      globalThis.localStorage.setItem(PLAYER_STORAGE_KEY, value);
      return;
    } catch (error) {
      console.warn('Failed to persist player storage', error);
      return;
    }
  }

  try {
    await SecureStore.setItemAsync(PLAYER_STORAGE_KEY, value);
  } catch (error) {
    console.warn('Failed to persist player storage', error);
  }
};

interface PlayerContextValue {
  playerName: string;
  setPlayerName: (name: string) => void;
  clearPlayer: () => void;
  // Authentication state
  isAuthenticated: boolean;
  session: Session | null;
  isAuthLoading: boolean;
  authenticate: (playerName?: string) => Promise<void>;
  updatePlayerName: (newName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const PlayerContext = React.createContext<PlayerContextValue | undefined>(undefined);

type PlayerProviderProps = {
  children: React.ReactNode;
};

export const PlayerProvider: React.FC<PlayerProviderProps> = ({ children }) => {
  const [playerName, setPlayerName] = React.useState('');
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Authentication state
  const [session, setSession] = React.useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = React.useState(false);

  React.useEffect(() => {
    const hydrate = async () => {
      try {
        // Load player name
        const storedName = await readStoredName();
        setPlayerName(storedName);

        // Try to restore session
        const restoredSession = await nakamaService.restoreSession();
        setSession(restoredSession);

        setIsHydrated(true);
      } catch (error) {
        console.warn('Failed to hydrate player storage', error);
        setIsHydrated(true);
      }
    };

    hydrate();
  }, []);

  React.useEffect(() => {
    if (!isHydrated) {
      return;
    }

    persistName(playerName).catch((error) => {
      console.warn('Failed to persist player storage', error);
    });
  }, [isHydrated, playerName]);

  const handleSetPlayerName = React.useCallback((name: string) => {
    setPlayerName(name);
  }, []);

  const handleClearPlayer = React.useCallback(() => {
    setPlayerName('');
  }, []);

  const handleAuthenticate = React.useCallback(
    async (customPlayerName?: string) => {
      setIsAuthLoading(true);

      try {
        const nameToUse = customPlayerName || playerName || 'Player';
        const authenticatedSession = await nakamaService.authenticateDevice(nameToUse);
        setSession(authenticatedSession);

        // Update player name if a custom one was used
        if (customPlayerName && customPlayerName !== playerName) {
          setPlayerName(customPlayerName);
        }
      } catch (error) {
        console.error('Authentication failed:', error);
        throw error;
      } finally {
        setIsAuthLoading(false);
      }
    },
    [playerName],
  );

  const handleLogout = React.useCallback(async () => {
    setIsAuthLoading(true);

    try {
      await nakamaService.clearSession();
      setSession(null);
    } catch (error) {
      console.warn('Logout failed:', error);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const handleUpdatePlayerName = React.useCallback(async (newName: string) => {
    if (!nakamaService.isAuthenticated()) {
      throw new Error('Must be authenticated to update player name');
    }

    setIsAuthLoading(true);

    try {
      // Update name on server using Nakama's built-in updateAccount method
      await nakamaService.updatePlayerName(newName);

      // Update local state
      setPlayerName(newName);
    } catch (error) {
      console.error('Failed to update player name:', error);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const isAuthenticated = nakamaService.isAuthenticated();

  const value = React.useMemo(
    () => ({
      playerName,
      setPlayerName: handleSetPlayerName,
      clearPlayer: handleClearPlayer,
      isAuthenticated,
      session,
      isAuthLoading,
      authenticate: handleAuthenticate,
      updatePlayerName: handleUpdatePlayerName,
      logout: handleLogout,
    }),
    [
      playerName,
      handleSetPlayerName,
      handleClearPlayer,
      isAuthenticated,
      session,
      isAuthLoading,
      handleAuthenticate,
      handleUpdatePlayerName,
      handleLogout,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export const usePlayer = () => {
  const context = React.useContext(PlayerContext);

  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }

  return context;
};
