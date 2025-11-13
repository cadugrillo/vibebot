/**
 * useSearch Hook
 * VBT-244: Real-time Search with Debouncing
 *
 * Custom hook for debounced search functionality with request cancellation
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import {
  searchConversations,
  searchInConversation,
  createSearchAbortController,
  type SearchConversationsParams,
  type SearchInConversationParams,
} from '@/lib/api/search';
import type {
  SearchMatch,
  SearchFilters,
  SearchPaginationMeta,
} from '@/components/search/types';

/**
 * Search mode: 'all' for global search, 'conversation' for conversation-specific
 */
export type SearchMode = 'all' | 'conversation';

/**
 * Hook configuration options
 */
export interface UseSearchOptions {
  /**
   * Search mode
   */
  mode?: SearchMode;

  /**
   * Conversation ID (required for 'conversation' mode)
   */
  conversationId?: string;

  /**
   * Debounce delay in milliseconds (default: 300)
   */
  debounceDelay?: number;

  /**
   * Minimum characters required before searching (default: 2)
   */
  minChars?: number;

  /**
   * Initial filters
   */
  initialFilters?: SearchFilters;

  /**
   * Page size for pagination (default: 20)
   */
  pageSize?: number;

  /**
   * Enable automatic search on query change (default: true)
   */
  autoSearch?: boolean;
}

/**
 * Search state returned by the hook
 */
export interface UseSearchState {
  /**
   * Current search query
   */
  query: string;

  /**
   * Debounced search query
   */
  debouncedQuery: string;

  /**
   * Search results
   */
  results: SearchMatch[];

  /**
   * Pagination metadata
   */
  pagination: SearchPaginationMeta | null;

  /**
   * Loading state (true while search is in progress)
   */
  isLoading: boolean;

  /**
   * Error message if search failed
   */
  error: string | null;

  /**
   * Active search filters
   */
  filters: SearchFilters;

  /**
   * Search execution time (ms)
   */
  executionTime: number | null;

  /**
   * Set search query
   */
  setQuery: (query: string) => void;

  /**
   * Clear search and reset state
   */
  clearSearch: () => void;

  /**
   * Clear everything (query and all filters)
   * VBT-250: Clear and Reset Functionality
   */
  clearAll: () => void;

  /**
   * Update search filters
   */
  setFilters: (filters: SearchFilters) => void;

  /**
   * Load specific page
   */
  loadPage: (page: number) => void;

  /**
   * Manually trigger search (useful when autoSearch is false)
   */
  executeSearch: () => void;
}

/**
 * Custom hook for search functionality with debouncing and request cancellation
 *
 * @param options - Configuration options
 * @returns Search state and control functions
 *
 * @example
 * ```tsx
 * // Global search
 * const search = useSearch({ mode: 'all' });
 *
 * // Conversation-specific search
 * const search = useSearch({
 *   mode: 'conversation',
 *   conversationId: 'conv-123'
 * });
 *
 * // In your component
 * <SearchBar
 *   value={search.query}
 *   onChange={search.setQuery}
 *   onClear={search.clearSearch}
 *   isLoading={search.isLoading}
 * />
 * ```
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchState {
  const {
    mode = 'all',
    conversationId,
    debounceDelay = 300,
    minChars = 2,
    initialFilters = {},
    pageSize = 20,
    autoSearch = true,
  } = options;

  // State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [pagination, setPagination] = useState<SearchPaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Debounced query
  const [debouncedQuery] = useDebounce(query, debounceDelay);

  // AbortController ref for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Execute search based on mode
   */
  const performSearch = useCallback(
    async (searchQuery: string, page: number = 1) => {
      // Validation: check minimum characters
      if (searchQuery.length < minChars) {
        setResults([]);
        setPagination(null);
        setExecutionTime(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      // Conversation mode requires conversationId
      if (mode === 'conversation' && !conversationId) {
        setError('Conversation ID is required for conversation-specific search');
        setIsLoading(false);
        return;
      }

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = createSearchAbortController();

      setIsLoading(true);
      setError(null);

      try {
        let response;

        if (mode === 'all') {
          // Global search
          const params: SearchConversationsParams = {
            query: searchQuery,
            filters,
            page,
            pageSize,
          };
          response = await searchConversations(params, abortControllerRef.current.signal);
        } else {
          // Conversation-specific search
          const params: SearchInConversationParams = {
            query: searchQuery,
            page,
            pageSize,
          };
          response = await searchInConversation(
            conversationId!,
            params,
            abortControllerRef.current.signal
          );
        }

        // Handle response
        if (response.error) {
          setError(response.error.message || 'Search failed');
          setResults([]);
          setPagination(null);
          setExecutionTime(null);
        } else if (response.data) {
          setResults(response.data.matches);
          setPagination(response.data.pagination);
          setExecutionTime(response.data.executionTime);
          setError(null);
        }
      } catch (err) {
        // Ignore abort errors (user cancelled search)
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setPagination(null);
        setExecutionTime(null);
      } finally {
        setIsLoading(false);
      }
    },
    [mode, conversationId, filters, pageSize, minChars]
  );

  /**
   * Auto-execute search when debounced query changes
   */
  useEffect(() => {
    if (!autoSearch) return;

    if (debouncedQuery.length === 0) {
      // Empty query - clear results
      setResults([]);
      setPagination(null);
      setExecutionTime(null);
      setError(null);
      setIsLoading(false);
      setCurrentPage(1);
      return;
    }

    performSearch(debouncedQuery, currentPage);
  }, [debouncedQuery, autoSearch, performSearch, currentPage]);

  /**
   * Clear search and reset all state
   */
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setPagination(null);
    setError(null);
    setExecutionTime(null);
    setCurrentPage(1);

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Clear everything: query and all filters
   * VBT-250: Clear and Reset Functionality
   */
  const clearAll = useCallback(() => {
    // Clear search query
    setQuery('');
    setResults([]);
    setPagination(null);
    setError(null);
    setExecutionTime(null);
    setCurrentPage(1);

    // Clear all filters
    setFilters({});

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Load a specific page
   */
  const loadPage = useCallback(
    (page: number) => {
      setCurrentPage(page);
      if (debouncedQuery.length >= minChars) {
        performSearch(debouncedQuery, page);
      }
    },
    [debouncedQuery, minChars, performSearch]
  );

  /**
   * Manually execute search (for non-auto mode)
   */
  const executeSearch = useCallback(() => {
    if (query.length >= minChars) {
      performSearch(query, currentPage);
    }
  }, [query, minChars, currentPage, performSearch]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Cancel any in-flight request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    debouncedQuery,
    results,
    pagination,
    isLoading,
    error,
    filters,
    executionTime,
    setQuery,
    clearSearch,
    clearAll,
    setFilters,
    loadPage,
    executeSearch,
  };
}
