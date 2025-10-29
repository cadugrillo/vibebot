/**
 * API Client for VibeBot Backend
 * Base configuration for making HTTP requests to the backend API
 * With automatic token injection and refresh on 401 errors
 */

import { TokenStorage } from '../utils/tokenStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ApiError {
  error: string;
  message: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  status: number;
}

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * Subscribe to token refresh completion
 */
function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers that token refresh is complete
 */
function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

/**
 * Attempt to refresh the access token
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = TokenStorage.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const newAccessToken = data.accessToken;

    if (newAccessToken) {
      TokenStorage.setAccessToken(newAccessToken);
      return newAccessToken;
    }

    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

/**
 * Generic API request function with error handling and auto-retry on 401
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add Authorization header if access token exists
  const accessToken = TokenStorage.getAccessToken();
  if (accessToken) {
    defaultHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Include cookies for auth
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    // Handle 401 Unauthorized - attempt token refresh
    if (response.status === 401 && !isRetry) {
      if (isRefreshing) {
        // If already refreshing, wait for the new token
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            // Retry the original request with new token
            const newHeaders = {
              ...config.headers,
              Authorization: `Bearer ${newToken}`,
            };
            resolve(
              apiRequest<T>(
                endpoint,
                { ...options, headers: newHeaders },
                true
              )
            );
          });
        });
      }

      // Start token refresh
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken) {
        // Notify subscribers and retry original request
        onTokenRefreshed(newToken);
        return apiRequest<T>(endpoint, options, true);
      } else {
        // Refresh failed - clear tokens and redirect to login
        TokenStorage.clearTokens();
        window.location.href = '/login';
        return {
          error: {
            error: 'Authentication Failed',
            message: 'Your session has expired. Please log in again.',
          },
          status: 401,
        };
      }
    }

    if (!response.ok) {
      return {
        error: data as ApiError,
        status: response.status,
      };
    }

    return {
      data: data as T,
      status: response.status,
    };
  } catch (error) {
    return {
      error: {
        error: 'Network Error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to connect to the server',
      },
      status: 0,
    };
  }
}

/**
 * GET request
 */
export async function get<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'GET',
  });
}

/**
 * POST request
 */
export async function post<T>(
  endpoint: string,
  body?: unknown,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request
 */
export async function put<T>(
  endpoint: string,
  body?: unknown,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request
 */
export async function del<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'DELETE',
  });
}

export const api = {
  get,
  post,
  put,
  delete: del,
};
