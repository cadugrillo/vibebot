/**
 * Search Controller
 * VBT-238: Search Controller Implementation
 */

import { Request, Response } from 'express';
import { SearchService } from './search.service';
import { searchQueryParamsSchema, normalizePagination } from './search.validators';
import type { SearchFilters } from './search.types';

/**
 * Search Controller
 * Handles HTTP requests for search functionality
 */
export class SearchController {
  /**
   * GET /api/conversations/search
   * Search conversations and messages
   */
  public static async searchConversations(req: Request, res: Response): Promise<void> {
    try {
      // Get authenticated user ID
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Parse and validate query parameters
      const validation = searchQueryParamsSchema.safeParse(req.query);

      if (!validation.success) {
        res.status(400).json({
          error: 'Invalid search parameters',
          details: validation.error.issues,
        });
        return;
      }

      const { q: query, from, to, model, page, pageSize } = validation.data;

      // Build filters
      const filters: SearchFilters = {
        userId, // Always filter by authenticated user
      };

      // Add date range filter
      if (from || to) {
        filters.dateRange = {};
        if (from) {
          filters.dateRange.from = from;
        }
        if (to) {
          filters.dateRange.to = to;
        }
      }

      // Add model filter
      if (model) {
        filters.model = model;
      }

      // Normalize pagination
      const { skip, take } = normalizePagination(page, pageSize);

      // Execute search
      const results = await SearchService.searchConversations({
        query,
        userId,
        filters,
        skip,
        take,
      });

      // Return results
      res.status(200).json(results);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/conversations/:conversationId/search
   * Search within a specific conversation
   */
  public static async searchWithinConversation(req: Request, res: Response): Promise<void> {
    try {
      // Get authenticated user ID
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { conversationId } = req.params;

      // Validate conversation ID format
      if (!conversationId || conversationId.length === 0) {
        res.status(400).json({ error: 'Invalid conversation ID' });
        return;
      }

      // Parse and validate query parameters
      const validation = searchQueryParamsSchema.safeParse(req.query);

      if (!validation.success) {
        res.status(400).json({
          error: 'Invalid search parameters',
          details: validation.error.issues,
        });
        return;
      }

      const { q: query, page, pageSize } = validation.data;

      // Normalize pagination
      const { skip, take } = normalizePagination(page, pageSize);

      // Execute search with conversation filter
      // Note: This uses the same search service but we'll filter results to this conversation
      const allResults = await SearchService.searchConversations({
        query,
        userId,
        skip: 0, // Get all matches first
        take: 1000, // Max limit
      });

      // Filter to only this conversation
      const conversationMatches = allResults.matches.filter(
        (match) => match.conversationId === conversationId
      );

      // Apply pagination to filtered results
      const paginatedMatches = conversationMatches.slice(skip, skip + take);

      // Build pagination metadata
      const totalResults = conversationMatches.length;
      const totalPages = Math.ceil(totalResults / take);

      const results = {
        query,
        conversationId,
        matches: paginatedMatches,
        pagination: {
          page,
          pageSize: take,
          totalResults,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        executionTime: allResults.executionTime,
      };

      res.status(200).json(results);
    } catch (error) {
      console.error('Conversation search error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/search/stats
   * Get search statistics (for monitoring/debugging)
   */
  public static async getSearchStats(_req: Request, res: Response): Promise<void> {
    try {
      // This is a placeholder for future implementation
      // Could track search queries, execution times, etc.
      res.status(200).json({
        message: 'Search statistics endpoint - to be implemented',
        stats: {
          totalSearches: 0,
          avgExecutionTime: 0,
          emptyResultCount: 0,
          popularQueries: [],
        },
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
