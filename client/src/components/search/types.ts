/**
 * Search Component Types
 * VBT-242: Search UI Components Structure
 *
 * Frontend types for search functionality
 * Mirrors backend types from src/api/search/search.types.ts
 */

/**
 * Search mode - all conversations or specific conversation
 * VBT-248: Conversation-Specific Search Mode
 */
export type SearchMode = 'all' | 'conversation';

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
 * Search response from API
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
 * Search state for UI components
 */
export interface SearchState {
  /**
   * Current search query
   */
  query: string;

  /**
   * Active filters
   */
  filters: SearchFilters;

  /**
   * Search results
   */
  results: SearchMatch[] | null;

  /**
   * Pagination info
   */
  pagination: SearchPaginationMeta | null;

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Error message
   */
  error: string | null;

  /**
   * Is currently searching
   */
  isSearching: boolean;

  /**
   * Search mode: 'all' or 'conversation'
   */
  searchMode: 'all' | 'conversation';

  /**
   * Active conversation ID (for conversation-specific search)
   */
  activeConversationId?: string;
}

/**
 * Search history item
 */
export interface SearchHistoryItem {
  /**
   * Search query
   */
  query: string;

  /**
   * Timestamp when search was performed
   */
  timestamp: Date;

  /**
   * Number of results found
   */
  resultCount: number;
}

/**
 * Props for SearchBar component
 */
export interface SearchBarProps {
  /**
   * Current search query
   */
  value: string;

  /**
   * Callback when search query changes
   */
  onChange: (value: string) => void;

  /**
   * Callback when search is cleared
   */
  onClear: () => void;

  /**
   * Loading state
   */
  isLoading?: boolean;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Disabled state
   */
  disabled?: boolean;
}

/**
 * Props for SearchResults component
 */
export interface SearchResultsProps {
  /**
   * Search results to display
   */
  results: SearchMatch[];

  /**
   * Loading state
   */
  isLoading?: boolean;

  /**
   * Search query (for display)
   */
  query: string;

  /**
   * Callback when result is clicked
   */
  onSelectResult: (conversationId: string, messageId?: string) => void;

  /**
   * Empty state message
   */
  emptyMessage?: string;

  /**
   * Show relevance score (for debugging, default: false)
   */
  showRelevanceScore?: boolean;
}

/**
 * Props for SearchFilters component
 */
export interface SearchFiltersProps {
  /**
   * Current filters
   */
  filters: SearchFilters;

  /**
   * Callback when filters change
   */
  onChange: (filters: SearchFilters) => void;

  /**
   * Callback when filters are cleared
   */
  onClear: () => void;

  /**
   * Available models for filtering
   */
  availableModels?: string[];
}

/**
 * Available AI models for filtering
 */
export const AVAILABLE_MODELS = [
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
  { value: 'claude-opus-4', label: 'Claude Opus 4' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
] as const;

/**
 * Date range presets
 */
export const DATE_RANGE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: 'week' },
  { label: 'Last 30 days', value: 'month' },
  { label: 'Custom', value: 'custom' },
] as const;
