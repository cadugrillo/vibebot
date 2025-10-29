/**
 * Automatic Token Refresh Hook
 * Proactively refreshes access token before expiry
 */

import { useEffect, useRef, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { TokenStorage } from '../utils/tokenStorage';
import * as authService from '../services/auth.service';

interface JWTPayload {
  exp: number; // Expiration time (seconds since epoch)
  iat: number; // Issued at time
  sub: string; // Subject (user ID)
}

// Refresh token 2 minutes before expiry
const REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Hook to manage automatic token refresh
 */
export function useTokenRefresh(
  isAuthenticated: boolean,
  onLogout: () => void
) {
  const refreshTimerRef = useRef<number | null>(null);

  /**
   * Calculate time until token expiry
   */
  const getTimeUntilExpiry = useCallback((token: string): number | null => {
    try {
      const decoded = jwtDecode<JWTPayload>(token);
      const expiryTime = decoded.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;

      return timeUntilExpiry > 0 ? timeUntilExpiry : 0;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }, []);

  /**
   * Refresh the access token
   */
  const refreshToken = useCallback(async () => {
    try {
      const response = await authService.refreshToken();

      if (response.error || !response.data) {
        console.error('Token refresh failed:', response.error);
        // Logout user if refresh fails
        onLogout();
        return false;
      }

      // Store new access token
      const { accessToken } = response.data;
      TokenStorage.setAccessToken(accessToken);

      // Schedule next refresh
      scheduleTokenRefresh(accessToken);
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      onLogout();
      return false;
    }
  }, [onLogout]);

  /**
   * Schedule token refresh before expiry
   */
  const scheduleTokenRefresh = useCallback(
    (token: string) => {
      // Clear existing timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      // Calculate when to refresh
      const timeUntilExpiry = getTimeUntilExpiry(token);

      if (timeUntilExpiry === null) {
        console.error('Cannot schedule refresh - invalid token');
        onLogout();
        return;
      }

      // Schedule refresh 2 minutes before expiry
      const refreshTime = Math.max(
        timeUntilExpiry - REFRESH_BEFORE_EXPIRY_MS,
        0
      );

      if (refreshTime === 0) {
        // Token already expired or expires very soon - refresh immediately
        refreshToken();
        return;
      }

      console.log(
        `Token refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes`
      );

      refreshTimerRef.current = setTimeout(() => {
        refreshToken();
      }, refreshTime);
    },
    [getTimeUntilExpiry, refreshToken, onLogout]
  );

  /**
   * Start token refresh monitoring
   */
  const startTokenRefresh = useCallback(() => {
    const accessToken = TokenStorage.getAccessToken();

    if (!accessToken) {
      console.warn('No access token found - cannot start token refresh');
      return;
    }

    scheduleTokenRefresh(accessToken);
  }, [scheduleTokenRefresh]);

  /**
   * Stop token refresh monitoring
   */
  const stopTokenRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  /**
   * Effect: Start/stop token refresh based on authentication state
   */
  useEffect(() => {
    if (isAuthenticated) {
      startTokenRefresh();
    } else {
      stopTokenRefresh();
    }

    // Cleanup on unmount
    return () => {
      stopTokenRefresh();
    };
  }, [isAuthenticated, startTokenRefresh, stopTokenRefresh]);

  return {
    startTokenRefresh,
    stopTokenRefresh,
    refreshToken,
  };
}
