/**
 * Search API Validation Schemas
 * VBT-233: Search Validation Schemas
 */

import { z } from 'zod';

/**
 * Date range filter schema
 */
export const dateRangeSchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to);
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
    }
  );

/**
 * Search filters schema
 */
export const searchFiltersSchema = z.object({
  dateRange: dateRangeSchema.optional(),
  model: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe('AI model filter (e.g., claude-sonnet-4-5)'),
  userId: z.string().uuid().optional().describe('User ID filter (internal use)'),
});

/**
 * Search query validation
 * - Minimum 1 character (trimmed)
 * - Maximum 200 characters
 * - Sanitize special regex characters
 */
export const searchQuerySchema = z
  .string()
  .trim()
  .min(1, 'Search query must be at least 1 character')
  .max(200, 'Search query must be at most 200 characters')
  .transform((val) => {
    // Sanitize: remove leading/trailing spaces, collapse multiple spaces
    return val.replace(/\s+/g, ' ').trim();
  });

/**
 * Search conversations request schema (body)
 */
export const searchConversationsBodySchema = z.object({
  query: searchQuerySchema,
  filters: searchFiltersSchema.optional(),
});

/**
 * Search query parameters schema
 */
export const searchQueryParamsSchema = z.object({
  q: searchQuerySchema.describe('Search query'),
  from: z.string().datetime().optional().describe('Start date (ISO 8601)'),
  to: z.string().datetime().optional().describe('End date (ISO 8601)'),
  model: z.string().trim().min(1).max(100).optional().describe('AI model filter'),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(1000))
    .describe('Page number (1-indexed)'),
  pageSize: z
    .string()
    .optional()
    .default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .describe('Page size (default: 20, max: 100)'),
});

/**
 * Type inference helpers
 */
export type SearchConversationsBodyInput = z.infer<typeof searchConversationsBodySchema>;
export type SearchQueryParamsInput = z.infer<typeof searchQueryParamsSchema>;
export type SearchFiltersInput = z.infer<typeof searchFiltersSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;

/**
 * Sanitize search query to prevent ReDoS attacks
 * Escapes special regex characters
 */
export function sanitizeSearchQuery(query: string): string {
  // Escape special regex characters
  return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse search query into terms
 * Handles quoted phrases and individual words
 */
export function parseSearchQuery(query: string): {
  phrases: string[];
  terms: string[];
} {
  const phrases: string[] = [];
  const terms: string[] = [];

  // Extract quoted phrases
  const phraseRegex = /"([^"]+)"/g;
  let match;

  let remainingQuery = query;

  while ((match = phraseRegex.exec(query)) !== null) {
    if (match[1]) {
      phrases.push(match[1]);
    }
    remainingQuery = remainingQuery.replace(match[0], '');
  }

  // Extract individual terms from remaining query
  const individualTerms = remainingQuery
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0);

  terms.push(...individualTerms);

  return { phrases, terms };
}

/**
 * Validate and normalize pagination parameters
 */
export function normalizePagination(page: number = 1, pageSize: number = 20): {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
} {
  // Ensure page is at least 1
  const normalizedPage = Math.max(1, Math.min(page, 1000));

  // Ensure pageSize is between 1 and 100
  const normalizedPageSize = Math.max(1, Math.min(pageSize, 100));

  // Calculate skip/take for Prisma
  const skip = (normalizedPage - 1) * normalizedPageSize;
  const take = normalizedPageSize;

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    skip,
    take,
  };
}
