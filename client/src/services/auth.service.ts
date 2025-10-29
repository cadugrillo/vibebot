/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import { api } from '../lib/api';
import type { ApiResponse } from '../lib/api';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from '../types/auth';

/**
 * Login user with email and password
 */
export async function login(
  credentials: LoginRequest
): Promise<ApiResponse<LoginResponse>> {
  return api.post<LoginResponse>('/api/auth/login', credentials);
}

/**
 * Register new user
 */
export async function register(
  userData: RegisterRequest
): Promise<ApiResponse<RegisterResponse>> {
  return api.post<RegisterResponse>('/api/auth/register', userData);
}

/**
 * Logout user
 */
export async function logout(): Promise<ApiResponse<{ message: string }>> {
  return api.post<{ message: string }>('/api/auth/logout');
}

/**
 * Refresh access token
 */
export async function refreshToken(): Promise<
  ApiResponse<{ accessToken: string }>
> {
  return api.post<{ accessToken: string }>('/api/auth/refresh');
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<
  ApiResponse<{ user: LoginResponse['user'] }>
> {
  return api.get<{ user: LoginResponse['user'] }>('/api/auth/me');
}
