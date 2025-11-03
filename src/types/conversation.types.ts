/**
 * Conversation Management API Types
 *
 * This file contains all TypeScript types and interfaces for the conversation management system.
 * Includes DTOs, pagination, sorting, and response types.
 */

/**
 * DTO for creating a new conversation
 */
export interface CreateConversationDTO {
  /** Optional title for the conversation (defaults to "New Conversation") */
  title?: string;
  /** Optional AI model identifier (e.g., "claude-sonnet-4", "gpt-4") */
  model?: string;
  /** Optional system prompt to set conversation context */
  systemPrompt?: string;
}

/**
 * DTO for updating an existing conversation
 * All fields are optional to support partial updates
 */
export interface UpdateConversationDTO {
  /** Updated conversation title */
  title?: string;
  /** Updated AI model identifier */
  model?: string;
  /** Updated system prompt */
  systemPrompt?: string;
}

/**
 * Response DTO for conversation data
 * Matches Prisma Conversation model structure
 */
export interface ConversationResponseDTO {
  /** Unique conversation identifier */
  id: string;
  /** User ID who owns the conversation */
  userId: string;
  /** Conversation title */
  title: string;
  /** AI model identifier (optional) */
  model: string | null;
  /** System prompt (optional) */
  systemPrompt: string | null;
  /** Timestamp when conversation was created */
  createdAt: Date;
  /** Timestamp when conversation was last updated */
  updatedAt: Date;
}

/**
 * Sort order enumeration
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Allowed sort fields for conversations
 */
export type ConversationSortField = 'createdAt' | 'updatedAt' | 'title';

/**
 * Sorting parameters for list queries
 */
export interface SortParams {
  /** Field to sort by */
  sortBy: ConversationSortField;
  /** Sort direction (ascending or descending) */
  sortOrder: SortOrder;
}

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  pageSize: number;
}

/**
 * Pagination metadata for responses
 */
export interface PaginationMeta {
  /** Current page number */
  currentPage: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrevious: boolean;
}

/**
 * Paginated list response for conversations
 */
export interface PaginatedConversationResponse {
  /** Array of conversations */
  data: ConversationResponseDTO[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}

/**
 * Query parameters for listing conversations
 * Combines pagination and sorting
 */
export interface ListConversationsQuery extends Partial<PaginationParams>, Partial<SortParams> {
  /** Optional page number (defaults to 1) */
  page?: number;
  /** Optional page size (defaults to 20) */
  pageSize?: number;
  /** Optional sort field (defaults to createdAt) */
  sortBy?: ConversationSortField;
  /** Optional sort order (defaults to desc) */
  sortOrder?: SortOrder;
}

/**
 * Parameters for conversation ID routes
 */
export interface ConversationIdParams {
  /** Conversation ID from URL parameter */
  id: string;
}
