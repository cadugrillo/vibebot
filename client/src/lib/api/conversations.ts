/**
 * Conversation API Client
 * Handles all conversation-related API calls
 */

import { api, type ApiResponse } from '../api';
import type { PaginationMeta } from './common';

/**
 * Conversation data structure (matches backend Prisma model)
 */
export interface Conversation {
  id: string;
  title: string;
  userId: string;
  model?: string;
  systemPrompt?: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  lastMessageAt?: string;
}

/**
 * Request/Response DTOs
 */
export interface CreateConversationRequest {
  title?: string;
  model?: string;
  systemPrompt?: string;
}

export interface UpdateConversationRequest {
  title?: string;
  model?: string;
  systemPrompt?: string;
}

export interface ListConversationsQuery {
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface ListConversationsResponse {
  data: Conversation[];  // Backend returns "data", not "conversations"
  pagination: PaginationMeta;
}

/**
 * API Functions
 */

/**
 * Create conversation response from backend
 */
export interface CreateConversationResponse {
  message: string;
  data: Conversation;
}

/**
 * Create a new conversation
 */
export async function createConversation(
  data: CreateConversationRequest = {}
): Promise<ApiResponse<CreateConversationResponse>> {
  return api.post<CreateConversationResponse>('/api/conversations', data);
}

/**
 * List all conversations for the authenticated user
 */
export async function listConversations(
  query: ListConversationsQuery = {}
): Promise<ApiResponse<ListConversationsResponse>> {
  const params = new URLSearchParams();

  if (query.page) params.append('page', query.page.toString());
  if (query.pageSize) params.append('pageSize', query.pageSize.toString());
  if (query.sortBy) params.append('sortBy', query.sortBy);
  if (query.sortOrder) params.append('sortOrder', query.sortOrder);

  const queryString = params.toString();
  const endpoint = queryString ? `/api/conversations?${queryString}` : '/api/conversations';

  return api.get<ListConversationsResponse>(endpoint);
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(id: string): Promise<ApiResponse<Conversation>> {
  return api.get<Conversation>(`/api/conversations/${id}`);
}

/**
 * Update conversation response from backend
 */
export interface UpdateConversationResponse {
  message: string;
  data: Conversation;
}

/**
 * Update a conversation by ID
 */
export async function updateConversation(
  id: string,
  data: UpdateConversationRequest
): Promise<ApiResponse<UpdateConversationResponse>> {
  return api.put<UpdateConversationResponse>(`/api/conversations/${id}`, data);
}

/**
 * Delete a conversation by ID
 */
export async function deleteConversation(id: string): Promise<ApiResponse<void>> {
  return api.delete<void>(`/api/conversations/${id}`);
}
