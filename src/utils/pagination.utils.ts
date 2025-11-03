import { PaginationParams, PaginationMeta } from '../types/conversation.types';

/**
 * Default pagination values
 */
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Normalized pagination parameters with defaults applied
 */
export interface NormalizedPaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/**
 * Normalize and validate pagination parameters
 *
 * Ensures page and pageSize are within acceptable ranges
 * and calculates skip/take values for database queries
 *
 * @param params - Raw pagination parameters (may be undefined)
 * @returns Normalized pagination parameters with skip/take for Prisma
 */
export function normalizePaginationParams(
  params: Partial<PaginationParams> = {}
): NormalizedPaginationParams {
  // Apply defaults
  let page = params.page ?? PAGINATION_DEFAULTS.PAGE;
  let pageSize = params.pageSize ?? PAGINATION_DEFAULTS.PAGE_SIZE;

  // Validate and constrain values
  page = Math.max(1, Math.floor(page));
  pageSize = Math.max(1, Math.min(PAGINATION_DEFAULTS.MAX_PAGE_SIZE, Math.floor(pageSize)));

  // Calculate skip and take for Prisma
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return {
    page,
    pageSize,
    skip,
    take,
  };
}

/**
 * Generate pagination metadata for API responses
 *
 * Calculates total pages, hasNext, hasPrevious, etc.
 *
 * @param totalItems - Total number of items in the database
 * @param page - Current page number
 * @param pageSize - Number of items per page
 * @returns Complete pagination metadata
 */
export function generatePaginationMeta(
  totalItems: number,
  page: number,
  pageSize: number
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages); // Clamp to max page

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1,
  };
}

/**
 * Helper function to create a paginated response
 *
 * Combines data array with pagination metadata
 *
 * @param data - Array of items for current page
 * @param totalItems - Total number of items across all pages
 * @param params - Pagination parameters used for the query
 * @returns Object with data and pagination metadata
 */
export function createPaginatedResponse<T>(
  data: T[],
  totalItems: number,
  params: NormalizedPaginationParams
) {
  return {
    data,
    pagination: generatePaginationMeta(totalItems, params.page, params.pageSize),
  };
}
