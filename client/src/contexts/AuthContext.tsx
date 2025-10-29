/**
 * Authentication Context
 * Provides authentication state and actions throughout the application
 */

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, LoginRequest, RegisterRequest } from '../types/auth';
import * as authService from '../services/auth.service';
import { TokenStorage, UserStorage, clearAuthData } from '../utils/tokenStorage';
import { useTokenRefresh } from '../hooks/useTokenRefresh';

export interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;

  /**
   * Logout callback for token refresh hook
   */
  const handleTokenRefreshLogout = useCallback(async () => {
    clearAuthData();
    setUser(null);
  }, []);

  /**
   * Setup automatic token refresh
   */
  useTokenRefresh(isAuthenticated, handleTokenRefreshLogout);

  /**
   * Initialize authentication state on mount
   */
  const initializeAuth = useCallback(async () => {
    setIsLoading(true);

    try {
      // Check if tokens exist
      if (!TokenStorage.hasValidTokens()) {
        setUser(null);
        return;
      }

      // Try to get current user from storage first
      const storedUser = UserStorage.getUser();
      if (storedUser) {
        setUser(storedUser);
      }

      // Verify with backend
      const response = await authService.getCurrentUser();

      if (response.error) {
        // Token invalid or expired - clear everything
        clearAuthData();
        setUser(null);
      } else if (response.data) {
        // Update user data
        const currentUser = response.data.user;
        setUser(currentUser);
        UserStorage.setUser(currentUser);
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      clearAuthData();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initialize auth on mount
   */
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  /**
   * Login user with email and password
   */
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);

    try {
      const credentials: LoginRequest = { email, password };
      const response = await authService.login(credentials);

      if (response.error) {
        throw new Error(response.error.message || 'Login failed');
      }

      if (response.data) {
        const { user: userData, accessToken, refreshToken } = response.data;

        // Store tokens and user data
        TokenStorage.setAccessToken(accessToken);
        TokenStorage.setRefreshToken(refreshToken);
        UserStorage.setUser(userData);

        // Update state
        setUser(userData);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(async (data: RegisterRequest) => {
    setIsLoading(true);

    try {
      const response = await authService.register(data);

      if (response.error) {
        throw new Error(response.error.message || 'Registration failed');
      }

      if (response.data) {
        const { user: userData, accessToken, refreshToken } = response.data;

        // Store tokens and user data
        TokenStorage.setAccessToken(accessToken);
        TokenStorage.setRefreshToken(refreshToken);
        UserStorage.setUser(userData);

        // Update state
        setUser(userData);
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      // Call logout endpoint
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local cleanup even if API call fails
    } finally {
      // Clear all auth data
      clearAuthData();
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh authentication state
   * Useful after manual token refresh
   */
  const refreshAuth = useCallback(async () => {
    await initializeAuth();
  }, [initializeAuth]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
