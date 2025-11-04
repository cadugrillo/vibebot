/**
 * Search Routes
 * VBT-239: Search Routes and Rate Limiting
 */

import { Router } from 'express';
import { SearchController } from './search.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { searchRateLimiter } from '../../middleware/rateLimiter.middleware';

const router = Router();

/**
 * All search routes require authentication
 */
router.use(authenticateToken);

/**
 * GET /api/conversations/search
 * Search across all conversations and messages
 *
 * Rate limited: 30 requests per minute
 * Query parameters:
 *   - q: search query (required, 1-200 chars)
 *   - from: start date filter (optional, ISO 8601)
 *   - to: end date filter (optional, ISO 8601)
 *   - model: AI model filter (optional, e.g., 'claude-sonnet-4-5')
 *   - page: page number (optional, default: 1)
 *   - pageSize: page size (optional, default: 20, max: 100)
 *
 * Response:
 *   - query: search query executed
 *   - filters: applied filters
 *   - matches: array of SearchMatch objects
 *   - pagination: pagination metadata
 *   - executionTime: search execution time (ms)
 */
router.get('/search', searchRateLimiter, SearchController.searchConversations);

/**
 * GET /api/conversations/:conversationId/search
 * Search within a specific conversation
 *
 * Rate limited: 30 requests per minute
 * Path parameters:
 *   - conversationId: conversation ID to search within
 * Query parameters:
 *   - q: search query (required, 1-200 chars)
 *   - page: page number (optional, default: 1)
 *   - pageSize: page size (optional, default: 20, max: 100)
 *
 * Response:
 *   - query: search query executed
 *   - conversationId: conversation searched
 *   - matches: array of SearchMatch objects
 *   - pagination: pagination metadata
 *   - executionTime: search execution time (ms)
 */
router.get('/:conversationId/search', searchRateLimiter, SearchController.searchWithinConversation);

/**
 * GET /api/search/stats
 * Get search statistics (for monitoring/debugging)
 *
 * Rate limited: 30 requests per minute
 *
 * Response:
 *   - stats: search statistics object
 */
router.get('/stats', searchRateLimiter, SearchController.getSearchStats);

export default router;
