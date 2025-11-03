import { SortOrder, SortParams, ConversationSortField } from '../types/conversation.types';

/**
 * Default sorting values
 */
export const SORT_DEFAULTS = {
  SORT_BY: 'createdAt' as ConversationSortField,
  SORT_ORDER: SortOrder.DESC,
} as const;

/**
 * Whitelisted sort fields for conversations
 * Only these fields are allowed to prevent SQL injection and invalid queries
 */
export const ALLOWED_SORT_FIELDS: readonly ConversationSortField[] = [
  'createdAt',
  'updatedAt',
  'title',
] as const;

/**
 * Prisma orderBy type for Conversation model
 */
export type PrismaOrderBy = {
  [K in ConversationSortField]?: 'asc' | 'desc';
};

/**
 * Normalized sorting parameters with defaults applied
 */
export interface NormalizedSortParams {
  sortBy: ConversationSortField;
  sortOrder: SortOrder;
  orderBy: PrismaOrderBy;
}

/**
 * Validate if a sort field is allowed
 *
 * @param field - Field name to validate
 * @returns true if field is in the whitelist
 */
export function isValidSortField(field: string): field is ConversationSortField {
  return ALLOWED_SORT_FIELDS.includes(field as ConversationSortField);
}

/**
 * Normalize and validate sorting parameters
 *
 * Applies defaults and validates that sortBy is in the whitelist
 * Converts to Prisma orderBy format for database queries
 *
 * @param params - Raw sorting parameters (may be undefined)
 * @returns Normalized sorting parameters with Prisma orderBy
 * @throws Error if sortBy is not in the allowed fields list
 */
export function normalizeSortParams(
  params: Partial<SortParams> = {}
): NormalizedSortParams {
  // Apply defaults
  const sortBy = params.sortBy ?? SORT_DEFAULTS.SORT_BY;
  const sortOrder = params.sortOrder ?? SORT_DEFAULTS.SORT_ORDER;

  // Validate sortBy is in whitelist
  if (!isValidSortField(sortBy)) {
    throw new Error(
      `Invalid sort field: ${sortBy}. Allowed fields: ${ALLOWED_SORT_FIELDS.join(', ')}`
    );
  }

  // Validate sortOrder is valid enum value
  if (!Object.values(SortOrder).includes(sortOrder)) {
    throw new Error(
      `Invalid sort order: ${sortOrder}. Allowed values: ${Object.values(SortOrder).join(', ')}`
    );
  }

  // Convert to Prisma orderBy format
  const orderBy: PrismaOrderBy = {
    [sortBy]: sortOrder,
  };

  return {
    sortBy,
    sortOrder,
    orderBy,
  };
}

/**
 * Create multiple sort criteria for Prisma
 *
 * Useful for composite sorting (e.g., sort by title, then by createdAt)
 *
 * @param sortFields - Array of sort field and order pairs
 * @returns Array of Prisma orderBy objects
 */
export function createMultipleSortCriteria(
  sortFields: Array<{ field: ConversationSortField; order: SortOrder }>
): PrismaOrderBy[] {
  return sortFields.map(({ field, order }) => {
    if (!isValidSortField(field)) {
      throw new Error(
        `Invalid sort field: ${field}. Allowed fields: ${ALLOWED_SORT_FIELDS.join(', ')}`
      );
    }
    return { [field]: order } as PrismaOrderBy;
  });
}
