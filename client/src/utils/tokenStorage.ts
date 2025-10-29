/**
 * Token Storage Utilities
 * Manages storage and retrieval of authentication tokens and user data
 *
 * Security Note:
 * - Tokens stored in localStorage are vulnerable to XSS attacks
 * - For MVP, this is acceptable with documented trade-offs
 * - Production should consider httpOnly cookies exclusively
 */

import type { User } from '../types/auth';

const ACCESS_TOKEN_KEY = 'vibebot_access_token';
const REFRESH_TOKEN_KEY = 'vibebot_refresh_token';
const USER_KEY = 'vibebot_user';

/**
 * Token Storage Operations
 */
export const TokenStorage = {
  /**
   * Store access token
   */
  setAccessToken(token: string): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store access token:', error);
    }
  },

  /**
   * Retrieve access token
   */
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve access token:', error);
      return null;
    }
  },

  /**
   * Store refresh token
   */
  setRefreshToken(token: string): void {
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store refresh token:', error);
    }
  },

  /**
   * Retrieve refresh token
   */
  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve refresh token:', error);
      return null;
    }
  },

  /**
   * Clear all tokens from storage
   */
  clearTokens(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  },

  /**
   * Check if valid tokens exist
   */
  hasValidTokens(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    return Boolean(accessToken && refreshToken);
  },
};

/**
 * User Data Storage Operations
 */
export const UserStorage = {
  /**
   * Store user data
   */
  setUser(user: User): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  },

  /**
   * Retrieve user data
   */
  getUser(): User | null {
    try {
      const userData = localStorage.getItem(USER_KEY);
      return userData ? (JSON.parse(userData) as User) : null;
    } catch (error) {
      console.error('Failed to retrieve user data:', error);
      return null;
    }
  },

  /**
   * Clear user data from storage
   */
  clearUser(): void {
    try {
      localStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  },
};

/**
 * Clear all authentication data
 */
export function clearAuthData(): void {
  TokenStorage.clearTokens();
  UserStorage.clearUser();
}
