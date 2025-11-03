import { z } from 'zod';
import { SortOrder, ConversationSortField } from '../types/conversation.types';

/**
 * Validation schema for conversation ID parameter
 * Ensures ID is a valid CUID format
 */
export const conversationIdSchema = z.object({
  id: z.string().cuid('Invalid conversation ID format'),
});

/**
 * Validation schema for creating a new conversation
 * All fields are optional with sensible defaults
 */
export const createConversationSchema = z.object({
  title: z
    .string()
    .min(1, 'Title must not be empty')
    .max(200, 'Title must be at most 200 characters')
    .optional(),
  model: z
    .string()
    .min(1, 'Model must not be empty')
    .max(100, 'Model must be at most 100 characters')
    .optional(),
  systemPrompt: z
    .string()
    .max(10000, 'System prompt must be at most 10000 characters')
    .optional(),
});

/**
 * Validation schema for updating an existing conversation
 * All fields are optional to support partial updates
 * At least one field must be provided
 */
export const updateConversationSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title must not be empty')
      .max(200, 'Title must be at most 200 characters')
      .optional(),
    model: z
      .string()
      .min(1, 'Model must not be empty')
      .max(100, 'Model must be at most 100 characters')
      .optional(),
    systemPrompt: z
      .string()
      .max(10000, 'System prompt must be at most 10000 characters')
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/**
 * Validation schema for pagination query parameters
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1, 'Page must be at least 1')),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(
      z
        .number()
        .int()
        .min(1, 'Page size must be at least 1')
        .max(100, 'Page size must be at most 100')
    ),
});

/**
 * Validation schema for sorting query parameters
 */
export const sortSchema = z.object({
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'title'] as const)
    .optional()
    .default('createdAt' as ConversationSortField),
  sortOrder: z
    .enum([SortOrder.ASC, SortOrder.DESC] as const)
    .optional()
    .default(SortOrder.DESC),
});

/**
 * Combined validation schema for list conversations query parameters
 * Includes both pagination and sorting
 */
export const listConversationsQuerySchema = paginationSchema.merge(sortSchema);

/**
 * Type inference for create conversation DTO
 */
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

/**
 * Type inference for update conversation DTO
 */
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;

/**
 * Type inference for list conversations query
 */
export type ListConversationsQueryInput = z.infer<
  typeof listConversationsQuerySchema
>;

/**
 * Type inference for conversation ID parameter
 */
export type ConversationIdInput = z.infer<typeof conversationIdSchema>;
