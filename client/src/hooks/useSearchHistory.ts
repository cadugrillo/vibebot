/**
 * useSearchHistory Hook
 * VBT-249: Search History Management
 *
 * Manages search history in localStorage
 */

import { useState, useCallback, useEffect } from 'react';
import type { SearchHistoryItem } from '@/components/search/types';

const STORAGE_KEY = 'vibebot_search_history';
const MAX_HISTORY_ITEMS = 10;

/**
 * Get search history from localStorage
 */
function getStoredHistory(): SearchHistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as SearchHistoryItem[];
    // Convert timestamp strings back to Date objects
    return parsed.map((item) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  } catch (error) {
    console.error('Failed to load search history:', error);
    return [];
  }
}

/**
 * Save search history to localStorage
 */
function saveHistory(history: SearchHistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save search history:', error);
  }
}

export interface UseSearchHistoryOptions {
  /**
   * Maximum number of history items to keep
   * @default 10
   */
  maxItems?: number;
}

export interface UseSearchHistoryReturn {
  /**
   * Array of search history items (sorted by most recent first)
   */
  history: SearchHistoryItem[];

  /**
   * Add a search query to history
   */
  addToHistory: (query: string, resultCount: number) => void;

  /**
   * Remove a specific history item
   */
  removeFromHistory: (index: number) => void;

  /**
   * Clear all search history
   */
  clearHistory: () => void;

  /**
   * Check if a query exists in history
   */
  hasQuery: (query: string) => boolean;
}

/**
 * Hook for managing search history
 */
export function useSearchHistory(
  options: UseSearchHistoryOptions = {}
): UseSearchHistoryReturn {
  const { maxItems = MAX_HISTORY_ITEMS } = options;

  const [history, setHistory] = useState<SearchHistoryItem[]>(() => getStoredHistory());

  // Sync to localStorage whenever history changes
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  /**
   * Add a search query to history
   */
  const addToHistory = useCallback(
    (query: string, resultCount: number) => {
      // Trim and validate query
      const trimmedQuery = query.trim();
      if (!trimmedQuery || trimmedQuery.length < 2) {
        return;
      }

      setHistory((prevHistory) => {
        // Remove existing entry with same query (case-insensitive)
        const filtered = prevHistory.filter(
          (item) => item.query.toLowerCase() !== trimmedQuery.toLowerCase()
        );

        // Add new entry at the beginning
        const newItem: SearchHistoryItem = {
          query: trimmedQuery,
          timestamp: new Date(),
          resultCount,
        };

        const updated = [newItem, ...filtered];

        // Limit to maxItems
        return updated.slice(0, maxItems);
      });
    },
    [maxItems]
  );

  /**
   * Remove a specific history item by index
   */
  const removeFromHistory = useCallback((index: number) => {
    setHistory((prevHistory) => {
      const updated = [...prevHistory];
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  /**
   * Clear all search history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  /**
   * Check if a query exists in history (case-insensitive)
   */
  const hasQuery = useCallback(
    (query: string) => {
      const trimmedQuery = query.trim().toLowerCase();
      return history.some((item) => item.query.toLowerCase() === trimmedQuery);
    },
    [history]
  );

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    hasQuery,
  };
}
