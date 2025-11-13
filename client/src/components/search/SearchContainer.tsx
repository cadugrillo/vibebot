/**
 * SearchContainer Component
 * VBT-244: Real-time Search with Debouncing
 *
 * Container component that integrates SearchBar, SearchResults, and useSearch hook
 * This demonstrates the complete search functionality implementation
 */

import { SearchBar } from './SearchBar';
import { SearchResults } from './SearchResults';
import { useSearch, type SearchMode } from '@/hooks/useSearch';
import type { SearchFilters } from './types';

export interface SearchContainerProps {
  /**
   * Search mode: 'all' for global, 'conversation' for specific conversation
   */
  mode?: SearchMode;

  /**
   * Conversation ID (required if mode is 'conversation')
   */
  conversationId?: string;

  /**
   * Initial filters
   */
  initialFilters?: SearchFilters;

  /**
   * Callback when a search result is selected
   */
  onSelectResult: (conversationId: string, messageId?: string) => void;

  /**
   * Custom placeholder text
   */
  placeholder?: string;

  /**
   * Custom empty state message
   */
  emptyMessage?: string;
}

/**
 * SearchContainer - Complete search UI with debouncing and real-time results
 *
 * @example
 * ```tsx
 * // Global search
 * <SearchContainer
 *   mode="all"
 *   onSelectResult={(convId, msgId) => {
 *     // Navigate to conversation/message
 *   }}
 * />
 *
 * // Conversation-specific search
 * <SearchContainer
 *   mode="conversation"
 *   conversationId="conv-123"
 *   onSelectResult={(convId, msgId) => {
 *     // Scroll to message
 *   }}
 * />
 * ```
 */
export function SearchContainer({
  mode = 'all',
  conversationId,
  initialFilters,
  onSelectResult,
  placeholder,
  emptyMessage,
}: SearchContainerProps) {
  // Use the search hook with all features: debouncing, cancellation, loading, etc.
  const search = useSearch({
    mode,
    conversationId,
    initialFilters,
    debounceDelay: 300, // 300ms debounce
    minChars: 2, // Minimum 2 characters required
    autoSearch: true, // Automatically search on query change
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Search Bar with loading state */}
      <SearchBar
        value={search.query}
        onChange={search.setQuery}
        onClear={search.clearSearch}
        isLoading={search.isLoading}
        placeholder={placeholder}
      />

      {/* Search Results */}
      {search.query.length > 0 && (
        <SearchResults
          results={search.results}
          isLoading={search.isLoading}
          query={search.query}
          onSelectResult={onSelectResult}
          emptyMessage={emptyMessage}
        />
      )}

      {/* Error State */}
      {search.error && (
        <div className="px-3 py-2 text-sm text-destructive bg-destructive/10 rounded-md">
          {search.error}
        </div>
      )}

      {/* Min Characters Warning */}
      {search.query.length > 0 && search.query.length < 2 && (
        <div className="px-3 py-2 text-xs text-muted-foreground bg-muted rounded-md">
          Type at least 2 characters to search
        </div>
      )}

      {/* Search Stats (optional - can be hidden) */}
      {search.executionTime !== null && search.results.length > 0 && (
        <div className="px-3 text-xs text-muted-foreground">
          Found {search.pagination?.totalResults || 0} results in {search.executionTime}ms
        </div>
      )}
    </div>
  );
}
