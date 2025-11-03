/**
 * Message Validation Schemas
 * VBT-185: Zod schemas for message API endpoints
 */

import { z } from 'zod';

// ============================================================================
// Message ID Validation
// ============================================================================

/**
 * Validate message ID parameter (CUID format)
 */
export const messageIdSchema = z.object({
  id: z
    .string()
    .min(1, 'Message ID is required')
    .regex(/^c[a-z0-9]{24}$/, 'Invalid message ID format'),
});

export type MessageIdParams = z.infer<typeof messageIdSchema>;

// ============================================================================
// Create Message Validation
// ============================================================================

/**
 * Validate POST /api/messages request body
 */
export const createMessageSchema = z.object({
  conversationId: z
    .string()
    .min(1, 'Conversation ID is required')
    .regex(/^c[a-z0-9]{24}$/, 'Invalid conversation ID format'),

  content: z
    .string()
    .min(1, 'Message content is required')
    .max(50000, 'Message content must not exceed 50,000 characters')
    .trim(),

  modelOverride: z
    .string()
    .min(1, 'Model override must not be empty if provided')
    .max(100, 'Model override must not exceed 100 characters')
    .optional(),
});

export type CreateMessageRequest = z.infer<typeof createMessageSchema>;

// ============================================================================
// List Messages Query Validation
// ============================================================================

/**
 * Validate GET /api/messages query parameters
 */
export const listMessagesQuerySchema = z.object({
  conversationId: z
    .string()
    .min(1, 'Conversation ID is required')
    .regex(/^c[a-z0-9]{24}$/, 'Invalid conversation ID format'),

  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1, 'Page must be at least 1')),

  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .pipe(
      z
        .number()
        .int()
        .min(1, 'Page size must be at least 1')
        .max(100, 'Page size must not exceed 100')
    ),

  // Optional cursor-based pagination
  beforeMessageId: z
    .string()
    .regex(/^c[a-z0-9]{24}$/, 'Invalid message ID format')
    .optional(),

  afterMessageId: z
    .string()
    .regex(/^c[a-z0-9]{24}$/, 'Invalid message ID format')
    .optional(),
});

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;

// ============================================================================
// Message Content Validation (Utility)
// ============================================================================

/**
 * Standalone content validator for reuse
 */
export const messageContentSchema = z
  .string()
  .min(1, 'Message content cannot be empty')
  .max(50000, 'Message content must not exceed 50,000 characters')
  .trim();

/**
 * Conversation ID validator for reuse
 */
export const conversationIdSchema = z
  .string()
  .regex(/^c[a-z0-9]{24}$/, 'Invalid conversation ID format');

// ============================================================================
// Message Metadata Validation (for updates)
// ============================================================================

/**
 * Token usage validation
 */
const tokenUsageSchema = z.object({
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
});

/**
 * Cost information validation
 */
const messageCostSchema = z.object({
  inputCost: z.number().min(0),
  outputCost: z.number().min(0),
  totalCost: z.number().min(0),
  currency: z.string().length(3, 'Currency must be a 3-letter code (e.g., USD)'),
});

/**
 * Model information validation
 */
const modelInfoSchema = z.object({
  provider: z.string().min(1),
  modelId: z.string().min(1),
  modelName: z.string().optional(),
});

/**
 * Complete message metadata validation
 */
export const messageMetadataSchema = z.object({
  model: modelInfoSchema.optional(),
  tokens: tokenUsageSchema.optional(),
  cost: messageCostSchema.optional(),
  finishReason: z.string().optional(),
  streamingDuration: z.number().int().min(0).optional(),
  processingTime: z.number().int().min(0).optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// ============================================================================
// Validation Rules Summary
// ============================================================================

/**
 * Validation constraints for reference:
 *
 * **Message Content:**
 * - Min length: 1 character (required)
 * - Max length: 50,000 characters
 * - Trimmed automatically
 *
 * **Conversation ID:**
 * - Format: CUID (starts with 'c', followed by 24 alphanumeric chars)
 * - Required for all message operations
 *
 * **Model Override:**
 * - Optional field
 * - Min length: 1 character (if provided)
 * - Max length: 100 characters
 *
 * **Pagination:**
 * - Page: Min 1, defaults to 1
 * - Page size: Min 1, max 100, defaults to 50
 *
 * **Message ID:**
 * - Format: CUID (starts with 'c', followed by 24 alphanumeric chars)
 * - Used for cursor-based pagination and direct access
 */
