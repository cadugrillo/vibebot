/**
 * Search API Types and DTOs
 * VBT-232: Search Types and DTOs
 */

/**
 * Date range filter for search
 */
export interface DateRangeFilter {
  /**
   * Start date (ISO 8601 format)
   */
  from?: string;

  /**
   * End date (ISO 8601 format)
   */
  to?: string;
}

/**
 * Search filters
 */
export interface SearchFilters {
  /**
   * Filter by date range
   */
  dateRange?: DateRangeFilter;

  /**
   * Filter by AI model used (e.g., 'claude-sonnet-4-5', 'claude-opus-4')
   */
  model?: string;

  /**
   * Filter by user ID (automatically set from authenticated user)
   */
  userId?: string;
}

/**
 * Match highlight - marks where search terms were found
 */
export interface MatchHighlight {
  /**
   * Start position of highlight (character index)
   */
  start: number;

  /**
   * End position of highlight (character index)
   */
  end: number;

  /**
   * The highlighted text
   */
  text: string;
}

/**
 * Search match result
 */
export interface SearchMatch {
  /**
   * Conversation ID containing the match
   */
  conversationId: string;

  /**
   * Conversation title
   */
  conversationTitle: string;

  /**
   * Message ID containing the match (if match is in message content)
   */
  messageId?: string;

  /**
   * Text snippet showing the match context
   */
  snippet: string;

  /**
   * Highlight positions within the snippet
   */
  highlights: MatchHighlight[];

  /**
   * Relevance score (higher = more relevant)
   */
  score: number;

  /**
   * Match type (title or content)
   */
  matchType: 'title' | 'content';

  /**
   * Timestamp of conversation or message
   */
  timestamp: Date;

  /**
   * AI model used (if available)
   */
  model?: string;
}

/**
 * Search request DTO
 */
export interface SearchConversationsRequest {
  /**
   * Search query text
   */
  query: string;

  /**
   * Optional filters
   */
  filters?: SearchFilters;

  /**
   * Page number (1-indexed)
   */
  page?: number;

  /**
   * Page size (default: 20, max: 100)
   */
  pageSize?: number;
}

/**
 * Pagination metadata for search results
 */
export interface SearchPaginationMeta {
  /**
   * Current page number (1-indexed)
   */
  page: number;

  /**
   * Number of results per page
   */
  pageSize: number;

  /**
   * Total number of matching results
   */
  totalResults: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Whether there's a next page
   */
  hasNextPage: boolean;

  /**
   * Whether there's a previous page
   */
  hasPreviousPage: boolean;
}

/**
 * Search response DTO
 */
export interface SearchConversationsResponse {
  /**
   * Search query that was executed
   */
  query: string;

  /**
   * Applied filters
   */
  filters?: SearchFilters;

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
 * Internal search options (used by service layer)
 */
export interface SearchOptions {
  /**
   * Search query
   */
  query: string;

  /**
   * User ID (for access control)
   */
  userId: string;

  /**
   * Filters
   */
  filters?: SearchFilters;

  /**
   * Skip count for pagination
   */
  skip: number;

  /**
   * Take count for pagination
   */
  take: number;

  /**
   * Snippet length (characters around match)
   */
  snippetLength?: number;
}

/**
 * Search statistics (for monitoring)
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
