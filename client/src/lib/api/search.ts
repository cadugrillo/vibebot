/**
 * Search API Client
 * VBT-243: Search API Client Integration
 *
 * Handles all search-related API calls
 */

import { api, type ApiResponse } from '../api';
import type {
  SearchFilters,
  SearchConversationsResponse,
  SearchMatch,
  SearchPaginationMeta,
} from '../../components/search/types';

/**
 * Search request parameters for global search
 */
export interface SearchConversationsParams {
  /**
   * Search query text (1-200 characters)
   */
  query: string;

  /**
   * Optional filters
   */
  filters?: SearchFilters;

  /**
   * Page number (1-indexed, default: 1)
   */
  page?: number;

  /**
   * Results per page (default: 20, max: 100)
   */
  pageSize?: number;
}

/**
 * Search within conversation parameters
 */
export interface SearchInConversationParams {
  /**
   * Search query text (1-200 characters)
   */
  query: string;

  /**
   * Page number (1-indexed, default: 1)
   */
  page?: number;

  /**
   * Results per page (default: 20, max: 100)
   */
  pageSize?: number;
}

/**
 * Response for conversation-specific search
 */
export interface SearchInConversationResponse {
  /**
   * Search query that was executed
   */
  query: string;

  /**
   * Conversation ID that was searched
   */
  conversationId: string;

  /**
   * Array of search matches
   */
  matches: SearchMatch[];

  /**
   * Pagination metadata
   */
  pagination: SearchPaginationMeta;

  /**
   * Search execution time (ms)
   */
  executionTime: number;
}

/**
 * Search statistics
 */
export interface SearchStats {
  /**
   * Total searches executed
   */
  totalSearches: number;

  /**
   * Average execution time (ms)
   */
  avgExecutionTime: number;

  /**
   * Number of searches with no results
   */
  emptyResultCount: number;

  /**
   * Most common search terms
   */
  popularQueries: Array<{ query: string; count: number }>;
}

/**
 * Response for getSearchStats
 */
export interface SearchStatsResponse {
  stats: SearchStats;
}

/**
 * Build query string from search parameters
 */
function buildSearchQueryString(params: SearchConversationsParams): string {
  const searchParams = new URLSearchParams();

  // Add required query parameter
  searchParams.append('q', params.query);

  // Add optional pagination
  if (params.page !== undefined) {
    searchParams.append('page', params.page.toString());
  }
  if (params.pageSize !== undefined) {
    searchParams.append('pageSize', params.pageSize.toString());
  }

  // Add optional filters
  if (params.filters) {
    // Date range filter
    if (params.filters.dateRange?.from) {
      searchParams.append('from', params.filters.dateRange.from);
    }
    if (params.filters.dateRange?.to) {
      searchParams.append('to', params.filters.dateRange.to);
    }

    // Model filter
    if (params.filters.model) {
      searchParams.append('model', params.filters.model);
    }
  }

  return searchParams.toString();
}

/**
 * Build query string for conversation-specific search
 */
function buildConversationSearchQueryString(
  params: SearchInConversationParams
): string {
  const searchParams = new URLSearchParams();

  // Add required query parameter
  searchParams.append('q', params.query);

  // Add optional pagination
  if (params.page !== undefined) {
    searchParams.append('page', params.page.toString());
  }
  if (params.pageSize !== undefined) {
    searchParams.append('pageSize', params.pageSize.toString());
  }

  return searchParams.toString();
}

/**
 * Search across all conversations and messages
 *
 * @param params - Search parameters including query, filters, and pagination
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Search results with matches and pagination
 *
 * @example
 * ```ts
 * const result = await searchConversations({
 *   query: 'typescript error',
 *   filters: {
 *     model: 'claude-sonnet-4-5',
 *     dateRange: { from: '2024-01-01T00:00:00Z' }
 *   },
 *   page: 1,
 *   pageSize: 20
 * });
 * ```
 */
export async function searchConversations(
  params: SearchConversationsParams,
  signal?: AbortSignal
): Promise<ApiResponse<SearchConversationsResponse>> {
  const queryString = buildSearchQueryString(params);
  const endpoint = `/api/conversations/search?${queryString}`;

  return api.get<SearchConversationsResponse>(endpoint, { signal });
}

/**
 * Search within a specific conversation
 *
 * @param conversationId - The conversation ID to search within
 * @param params - Search parameters including query and pagination
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Search results within the conversation
 *
 * @example
 * ```ts
 * const result = await searchInConversation('conv-123', {
 *   query: 'api endpoint',
 *   page: 1,
 *   pageSize: 20
 * });
 * ```
 */
export async function searchInConversation(
  conversationId: string,
  params: SearchInConversationParams,
  signal?: AbortSignal
): Promise<ApiResponse<SearchInConversationResponse>> {
  const queryString = buildConversationSearchQueryString(params);
  const endpoint = `/api/conversations/${conversationId}/search?${queryString}`;

  return api.get<SearchInConversationResponse>(endpoint, { signal });
}

/**
 * Get search statistics (for monitoring/debugging)
 *
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Search statistics including total searches and popular queries
 *
 * @example
 * ```ts
 * const result = await getSearchStats();
 * if (result.data) {
 *   console.log(`Total searches: ${result.data.stats.totalSearches}`);
 * }
 * ```
 */
export async function getSearchStats(
  signal?: AbortSignal
): Promise<ApiResponse<SearchStatsResponse>> {
  return api.get<SearchStatsResponse>('/api/search/stats', { signal });
}

/**
 * Create an AbortController for cancelling search requests
 *
 * @returns A new AbortController instance
 *
 * @example
 * ```ts
 * const controller = createSearchAbortController();
 *
 * // Start search
 * searchConversations({ query: 'test' }, controller.signal);
 *
 * // Cancel if needed
 * controller.abort();
 * ```
 */
export function createSearchAbortController(): AbortController {
  return new AbortController();
}
