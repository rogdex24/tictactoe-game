import { Platform } from 'react-native';

import * as SecureStore from 'expo-secure-store';
import React from 'react';

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
}

const PlayerContext = React.createContext<PlayerContextValue | undefined>(undefined);

type PlayerProviderProps = {
  children: React.ReactNode;
};

export const PlayerProvider: React.FC<PlayerProviderProps> = ({ children }) => {
  const [playerName, setPlayerName] = React.useState('');
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    const hydrate = async () => {
      const storedName = await readStoredName();
      setPlayerName(storedName);
      setIsHydrated(true);
    };

    hydrate().catch((error) => {
      console.warn('Failed to hydrate player storage', error);
      setIsHydrated(true);
    });
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

  const value = React.useMemo(
    () => ({
      playerName,
      setPlayerName: handleSetPlayerName,
      clearPlayer: handleClearPlayer,
    }),
    [handleClearPlayer, handleSetPlayerName, playerName],
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
