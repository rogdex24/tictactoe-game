import { Platform } from 'react-native';

import { Client, Session } from '@heroiclabs/nakama-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// Nakama server configuration from environment variables
const NAKAMA_SERVER_KEY = process.env.EXPO_PUBLIC_NAKAMA_SERVER_KEY || 'defaultkey';
const NAKAMA_SERVER_HOST = process.env.EXPO_PUBLIC_NAKAMA_SERVER_HOST || '127.0.0.1';
const NAKAMA_SERVER_PORT = process.env.EXPO_PUBLIC_NAKAMA_SERVER_PORT || '7350';
const NAKAMA_USE_SSL = process.env.EXPO_PUBLIC_NAKAMA_USE_SSL === 'true';

// Storage keys for tokens and device ID
const SESSION_TOKEN_KEY = 'nakama-session-token';
const REFRESH_TOKEN_KEY = 'nakama-refresh-token';
const DEVICE_ID_KEY = 'nakama-device-id';

const isWeb = Platform.OS === 'web';

const hasLocalStorage = () =>
  typeof globalThis !== 'undefined' &&
  'localStorage' in globalThis &&
  globalThis.localStorage !== null;

/**
 * Secure storage functions that work across platforms
 */
const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb && hasLocalStorage()) {
      try {
        return globalThis.localStorage.getItem(key);
      } catch (error) {
        console.warn(`Failed to read ${key} from localStorage`, error);
        return null;
      }
    }

    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn(`Failed to read ${key} from SecureStore`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb && hasLocalStorage()) {
      try {
        globalThis.localStorage.setItem(key, value);
        return;
      } catch (error) {
        console.warn(`Failed to store ${key} in localStorage`, error);
        return;
      }
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn(`Failed to store ${key} in SecureStore`, error);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb && hasLocalStorage()) {
      try {
        globalThis.localStorage.removeItem(key);
        return;
      } catch (error) {
        console.warn(`Failed to remove ${key} from localStorage`, error);
        return;
      }
    }

    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(`Failed to remove ${key} from SecureStore`, error);
    }
  },
};

/**
 * Generate a unique device ID for authentication
 */
async function getOrCreateDeviceId(): Promise<string> {
  let deviceId = await secureStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    // Generate a new device ID using crypto
    deviceId = Crypto.randomUUID();
    await secureStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

/**
 * Nakama client singleton
 */
class NakamaService {
  private client: Client;
  private currentSession: Session | null = null;

  constructor() {
    this.client = new Client(
      NAKAMA_SERVER_KEY,
      NAKAMA_SERVER_HOST,
      NAKAMA_SERVER_PORT,
      NAKAMA_USE_SSL,
    );
  }

  /**
   * Get the current session if available and valid
   */
  getSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Check if the user is authenticated with a valid session
   */
  isAuthenticated(): boolean {
    if (!this.currentSession) {
      return false;
    }

    const currentTime = Date.now() / 1000;
    return !this.currentSession.isexpired(currentTime);
  }

  /**
   * Restore session from stored tokens
   */
  async restoreSession(): Promise<Session | null> {
    try {
      const authToken = await secureStorage.getItem(SESSION_TOKEN_KEY);
      const refreshToken = await secureStorage.getItem(REFRESH_TOKEN_KEY);

      if (!authToken || !refreshToken) {
        return null;
      }

      const session = Session.restore(authToken, refreshToken);

      // Check if session is close to expiry (within 1 day)
      const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
      const unixTimeInFuture = Date.now() + ONE_DAY_IN_MS; // one day from now

      if (session.isexpired(unixTimeInFuture / 1000)) {
        try {
          // Try to refresh the session
          const refreshedSession = await this.client.sessionRefresh(session);
          this.currentSession = refreshedSession;
          await this.storeSession(refreshedSession);
          return refreshedSession;
        } catch (error) {
          console.warn('Session can no longer be refreshed. Must reauthenticate!', error);
          await this.clearSession();
          return null;
        }
      }

      this.currentSession = session;
      return session;
    } catch (error) {
      console.warn('Failed to restore session', error);
      await this.clearSession();
      return null;
    }
  }

  /**
   * Authenticate with device ID and set up player name
   */
  async authenticateDevice(playerName: string): Promise<Session> {
    try {
      const deviceId = await getOrCreateDeviceId();

      // Generate a unique username with display name + 2 random digits
      const randomSuffix = Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, '0');
      let baseName = playerName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!baseName) {
        baseName = 'player';
      }
      const uniqueUsername = `${baseName}${randomSuffix}`;

      // Authenticate with Nakama using device ID and unique username
      const session = await this.client.authenticateDevice(
        deviceId,
        true, // create account if it doesn't exist
        uniqueUsername, // unique username for the account
        {}, // no custom vars for now
      );

      this.currentSession = session;
      await this.storeSession(session);

      // If this is a new user, set the display name
      if (session.created) {
        await this.updatePlayerName(playerName);
      }

      console.log('Device authentication successful:', {
        userId: session.user_id,
        username: session.username,
        isNewUser: session.created,
        deviceId: deviceId.substring(0, 8) + '...', // Log partial ID for privacy
      });

      return session;
    } catch (error) {
      console.error('Device authentication failed:', error);
      throw error;
    }
  }

  /**
   * Store session tokens securely
   */
  private async storeSession(session: Session): Promise<void> {
    try {
      await Promise.all([
        secureStorage.setItem(SESSION_TOKEN_KEY, session.token),
        secureStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token),
      ]);
    } catch (error) {
      console.warn('Failed to store session tokens', error);
    }
  }

  /**
   * Clear stored session and tokens
   */
  async clearSession(): Promise<void> {
    this.currentSession = null;

    try {
      await Promise.all([
        secureStorage.removeItem(SESSION_TOKEN_KEY),
        secureStorage.removeItem(REFRESH_TOKEN_KEY),
      ]);
    } catch (error) {
      console.warn('Failed to clear session tokens', error);
    }
  }

  /**
   * Clear all stored data including device ID (for complete logout)
   */
  async clearAllData(): Promise<void> {
    this.currentSession = null;

    try {
      await Promise.all([
        secureStorage.removeItem(SESSION_TOKEN_KEY),
        secureStorage.removeItem(REFRESH_TOKEN_KEY),
        secureStorage.removeItem(DEVICE_ID_KEY),
      ]);
    } catch (error) {
      console.warn('Failed to clear all data', error);
    }
  }

  /**
   * Update player display name using built-in updateAccount method
   */
  async updatePlayerName(newDisplayName: string): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session. Please authenticate first.');
    }

    try {
      // Use Nakama's built-in updateAccount method with ApiUpdateAccountRequest
      await this.client.updateAccount(this.currentSession, {
        display_name: newDisplayName, // Update the display name field
      });

      console.log('Player display name updated successfully:', newDisplayName);
    } catch (error) {
      console.error('Failed to update player display name:', error);
      throw error;
    }
  }

  /**
   * Get current user account info
   */
  async getAccount() {
    if (!this.currentSession) {
      throw new Error('No active session. Please authenticate first.');
    }

    try {
      return await this.client.getAccount(this.currentSession);
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const nakamaService = new NakamaService();
