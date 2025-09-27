import { Platform } from 'react-native';

import { Client, Session } from '@heroiclabs/nakama-js';
import type { Match, MatchmakerTicket, Socket } from '@heroiclabs/nakama-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import type { MatchMode } from '../types/match';

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
  private socket: Socket | null = null;
  private socketConnected = false;

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
   * Get the active Nakama socket if connected
   */
  getSocket(): Socket | null {
    if (this.socket && this.socketConnected) {
      return this.socket;
    }

    return null;
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
      await this.disconnectSocket();
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

    await this.disconnectSocket();

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

    await this.disconnectSocket();

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

  /**
   * Establish or reuse a realtime socket connection for the active session.
   */
  async connectSocket(): Promise<Socket> {
    if (!this.currentSession) {
      throw new Error('No active session. Authenticate before connecting the socket.');
    }

    if (this.socket && this.socketConnected) {
      return this.socket;
    }

    const socket = this.client.createSocket(NAKAMA_USE_SSL, false);

    const originalDisconnect = socket.ondisconnect;
    socket.ondisconnect = (event) => {
      this.socketConnected = false;
      this.socket = null;
      if (typeof originalDisconnect === 'function') {
        originalDisconnect(event);
      }
    };

    socket.onerror = (event) => {
      console.warn('Nakama socket encountered an error', event);
    };

    await socket.connect(this.currentSession, true);
    this.socket = socket;
    this.socketConnected = true;
    return socket;
  }

  /**
   * Disconnect an active socket connection if present.
   */
  async disconnectSocket(): Promise<void> {
    if (this.socket) {
      try {
        this.socket.disconnect(true);
      } catch (error) {
        console.warn('Failed to disconnect Nakama socket', error);
      }
    }

    this.socket = null;
    this.socketConnected = false;
  }

  /**
   * Join the matchmaking queue for the supplied mode.
   */
  async addMatchmaker(mode: MatchMode, minPlayers = 2, maxPlayers = 2): Promise<MatchmakerTicket> {
    const socket = await this.connectSocket();

    const query = `+mode:${mode}`;
    const stringProps = { mode };

    return socket.addMatchmaker(query, minPlayers, maxPlayers, stringProps, undefined);
  }

  /**
   * Remove an existing matchmaking ticket if the socket is connected.
   */
  async removeMatchmaker(ticket: string): Promise<void> {
    const socket = this.getSocket();
    if (!socket) {
      return;
    }

    try {
      await socket.removeMatchmaker(ticket);
    } catch (error) {
      console.warn('Failed to remove matchmaking ticket', error);
    }
  }

  /**
   * Join an authoritative match by identifier.
   */
  async joinMatch(matchId: string): Promise<Match> {
    const socket = await this.connectSocket();
    return socket.joinMatch(matchId);
  }

  /**
   * Leave an active match if connected.
   */
  async leaveMatch(matchId: string): Promise<void> {
    const socket = this.getSocket();
    if (!socket) {
      return;
    }

    try {
      await socket.leaveMatch(matchId);
    } catch (error) {
      console.warn('Failed to leave match', error);
    }
  }
}

// Export singleton instance
export const nakamaService = new NakamaService();
