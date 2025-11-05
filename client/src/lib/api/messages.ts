/**
 * Message API Client
 * Handles all message-related API calls
 */

import { api, type ApiResponse } from '../api';
import type { PaginationMeta } from './common';

/**
 * Message role (user or AI assistant)
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Message metadata (tokens, cost, model info)
 */
export interface MessageMetadata {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
  model?: string;
  finishReason?: string;
}

/**
 * Message data structure (matches backend Prisma model)
 */
export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: MessageMetadata;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request/Response DTOs
 */
export interface CreateMessageRequest {
  conversationId: string;
  content: string;
  role?: MessageRole; // Defaults to 'user' on backend
}

export interface ListMessagesQuery {
  conversationId: string;
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc'; // Defaults to 'asc' (chronological)
}

export interface ListMessagesResponse {
  data: Message[];  // Backend returns "data", not "messages"
  pagination: PaginationMeta;
}

/**
 * API Functions
 */

/**
 * Create message response from backend
 */
export interface CreateMessageResponse {
  message: string;  // Status message from backend
  data: Message;    // The created message
  metadata: {
    userMessageId: string;
    conversationId: string;
    modelOverride: string | null;
    status: string;
  };
}

/**
 * Create a new message and trigger AI processing
 * Note: Returns 202 Accepted - AI response will come via WebSocket
 */
export async function createMessage(
  data: CreateMessageRequest
): Promise<ApiResponse<CreateMessageResponse>> {
  return api.post<CreateMessageResponse>('/api/messages', data);
}

/**
 * List messages for a conversation
 */
export async function listMessages(
  query: ListMessagesQuery
): Promise<ApiResponse<ListMessagesResponse>> {
  const params = new URLSearchParams();

  params.append('conversationId', query.conversationId);
  if (query.page) params.append('page', query.page.toString());
  if (query.pageSize) params.append('pageSize', query.pageSize.toString());
  if (query.sortOrder) params.append('sortOrder', query.sortOrder);

  return api.get<ListMessagesResponse>(`/api/messages?${params.toString()}`);
}

/**
 * Get a specific message by ID
 */
export async function getMessage(id: string): Promise<ApiResponse<Message>> {
  return api.get<Message>(`/api/messages/${id}`);
}
