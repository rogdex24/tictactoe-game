import { Platform } from 'react-native';

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';

interface PlayerState {
  playerName: string;
  setPlayerName: (name: string) => void;
  clearPlayer: () => void;
}

type WebStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const isWeb = Platform.OS === 'web';

const hasLocalStorage = () => typeof globalThis !== 'undefined' && 'localStorage' in globalThis;

const storage: StateStorage = {
  getItem: async (name) => {
    if (isWeb && hasLocalStorage()) {
      const localStorage = (globalThis as Record<string, unknown>).localStorage as WebStorage;
      return localStorage.getItem(name);
    }

    try {
      return await SecureStore.getItemAsync(name);
    } catch (error) {
      console.warn('Failed to read player storage', error);
      return null;
    }
  },
  setItem: async (name, value) => {
    if (isWeb && hasLocalStorage()) {
      const localStorage = (globalThis as Record<string, unknown>).localStorage as WebStorage;
      localStorage.setItem(name, value);
      return;
    }

    try {
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      console.warn('Failed to persist player storage', error);
    }
  },
  removeItem: async (name) => {
    if (isWeb && hasLocalStorage()) {
      const localStorage = (globalThis as Record<string, unknown>).localStorage as WebStorage;
      localStorage.removeItem(name);
      return;
    }

    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      console.warn('Failed to clear player storage', error);
    }
  },
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      playerName: '',
      setPlayerName: (name: string) => set({ playerName: name }),
      clearPlayer: () => set({ playerName: '' }),
    }),
    {
      name: 'player-profile',
      storage: createJSONStorage(() => storage),
    },
  ),
);
