import { Router } from 'express';
import {
  createConversationHandler,
  listConversationsHandler,
  getConversationHandler,
  updateConversationHandler,
  deleteConversationHandler,
} from '../controllers/conversation.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorizeConversationOwnership } from '../middleware/conversation.middleware';
import {
  conversationCreateRateLimiter,
  conversationReadRateLimiter,
} from '../middleware/rateLimiter.middleware';
import {
  validateRequest,
  validateQuery,
  validateParams,
} from '../middleware/validation.middleware';
import {
  createConversationSchema,
  updateConversationSchema,
  listConversationsQuerySchema,
  conversationIdSchema,
} from '../validators/conversation.validators';

const router = Router();

/**
 * All conversation routes require authentication
 */
router.use(authenticateToken);

/**
 * POST /api/conversations
 * Create a new conversation
 *
 * Rate limited: 10 requests per minute
 * Validates: title, model, systemPrompt (all optional)
 */
router.post(
  '/',
  conversationCreateRateLimiter,
  validateRequest(createConversationSchema),
  createConversationHandler
);

/**
 * GET /api/conversations
 * List all conversations for the authenticated user
 *
 * Rate limited: 30 requests per minute
 * Supports pagination and sorting via query parameters
 */
router.get(
  '/',
  conversationReadRateLimiter,
  validateQuery(listConversationsQuerySchema),
  listConversationsHandler
);

/**
 * GET /api/conversations/:id
 * Get a specific conversation by ID
 *
 * Rate limited: 30 requests per minute
 * Requires: conversation ownership
 */
router.get(
  '/:id',
  conversationReadRateLimiter,
  validateParams(conversationIdSchema),
  authorizeConversationOwnership,
  getConversationHandler
);

/**
 * PUT /api/conversations/:id
 * Update a conversation by ID
 *
 * Rate limited: 10 requests per minute
 * Requires: conversation ownership
 * Validates: title, model, systemPrompt (at least one required)
 */
router.put(
  '/:id',
  conversationCreateRateLimiter,
  validateParams(conversationIdSchema),
  validateRequest(updateConversationSchema),
  authorizeConversationOwnership,
  updateConversationHandler
);

/**
 * DELETE /api/conversations/:id
 * Delete a conversation by ID
 *
 * Rate limited: 10 requests per minute
 * Requires: conversation ownership
 * Note: Cascade deletes all associated messages
 */
router.delete(
  '/:id',
  conversationCreateRateLimiter,
  validateParams(conversationIdSchema),
  authorizeConversationOwnership,
  deleteConversationHandler
);

export default router;
