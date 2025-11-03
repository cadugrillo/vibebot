/**
 * Message API Routes
 * VBT-190: Routes and middleware for message operations
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest, validateQuery, validateParams } from '../middleware/validation.middleware';
import {
  createMessageSchema,
  listMessagesQuerySchema,
  messageIdSchema,
} from '../validators/message.validators';
import {
  createMessageHandler,
  listMessagesHandler,
  getMessageHandler,
} from '../controllers/message.controller';

const router = Router();

/**
 * Rate limiters for message operations
 * VBT-190: Different limits for sending vs reading
 */

// Sending messages: 20 requests per minute
const messageSendRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20,
  message: {
    error: 'Too many message requests',
    message: 'You can only send 20 messages per minute. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Reading messages: 60 requests per minute
const messageReadRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: {
    error: 'Too many requests',
    message: 'You can only make 60 read requests per minute. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Message Routes
 * All routes require authentication
 */

// POST /api/messages - Create new message and trigger AI processing
router.post(
  '/',
  authenticateToken,
  messageSendRateLimiter,
  validateRequest(createMessageSchema),
  createMessageHandler
);

// GET /api/messages?conversationId=xxx - List messages for a conversation
router.get(
  '/',
  authenticateToken,
  messageReadRateLimiter,
  validateQuery(listMessagesQuerySchema),
  listMessagesHandler
);

// GET /api/messages/:id - Get single message by ID
router.get(
  '/:id',
  authenticateToken,
  messageReadRateLimiter,
  validateParams(messageIdSchema),
  getMessageHandler
);

export default router;
