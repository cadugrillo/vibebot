/**
 * API Client for VibeBot Backend
 * Base configuration for making HTTP requests to the backend API
 */

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

/**
 * Generic API request function with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

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
