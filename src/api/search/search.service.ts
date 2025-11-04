/**
 * Search Service
 * VBT-234: Full-text Search Service
 * VBT-235: Search Filters Implementation
 * VBT-236: Relevance Scoring Implementation
 * VBT-237: Match Context Highlighting
 */

import prisma from '../../config/database';
import type {
  SearchOptions,
  SearchMatch,
  MatchHighlight,
  SearchPaginationMeta,
  SearchConversationsResponse,
} from './search.types';
import { parseSearchQuery } from './search.validators';

/**
 * Search Service
 * Handles full-text search across conversations and messages
 */
export class SearchService {
  /**
   * Default snippet length (characters)
   */
  private static readonly DEFAULT_SNIPPET_LENGTH = 150;

  /**
   * Search conversations and messages
   */
  public static async searchConversations(options: SearchOptions): Promise<SearchConversationsResponse> {
    const startTime = Date.now();
    const { query, userId, filters, skip, take, snippetLength = this.DEFAULT_SNIPPET_LENGTH } = options;

    // Parse search query
    const { phrases, terms } = parseSearchQuery(query);
    const searchTerms = [...phrases, ...terms];

    // Build search filters
    const whereClause: any = {
      userId, // Security: only search user's conversations
    };

    // Date range filter
    if (filters?.dateRange) {
      whereClause.createdAt = {};
      if (filters.dateRange.from) {
        whereClause.createdAt.gte = new Date(filters.dateRange.from);
      }
      if (filters.dateRange.to) {
        whereClause.createdAt.lte = new Date(filters.dateRange.to);
      }
    }

    // Model filter
    if (filters?.model) {
      whereClause.model = {
        equals: filters.model,
        mode: 'insensitive',
      };
    }

    // Search in conversation titles
    const titleMatches = await this.searchConversationTitles(searchTerms, whereClause, snippetLength);

    // Search in message content
    const contentMatches = await this.searchMessageContent(searchTerms, whereClause, snippetLength);

    // Combine and deduplicate matches (by conversationId)
    const allMatches = [...titleMatches, ...contentMatches];
    const matchMap = new Map<string, SearchMatch>();

    for (const match of allMatches) {
      const existing = matchMap.get(match.conversationId);
      if (!existing || match.score > existing.score) {
        // Keep highest score match per conversation
        matchMap.set(match.conversationId, match);
      }
    }

    // Sort by relevance score (descending)
    const sortedMatches = Array.from(matchMap.values()).sort((a, b) => b.score - a.score);

    // Get total count before pagination
    const totalResults = sortedMatches.length;

    // Apply pagination
    const paginatedMatches = sortedMatches.slice(skip, skip + take);

    // Calculate pagination metadata
    const pagination = this.buildPaginationMeta(options.skip / options.take + 1, take, totalResults);

    const executionTime = Date.now() - startTime;

    return {
      query,
      filters,
      matches: paginatedMatches,
      pagination,
      executionTime,
    };
  }

  /**
   * Search in conversation titles
   */
  private static async searchConversationTitles(
    searchTerms: string[],
    whereClause: any,
    snippetLength: number
  ): Promise<SearchMatch[]> {
    const matches: SearchMatch[] = [];

    for (const term of searchTerms) {
      const conversations = await prisma.conversation.findMany({
        where: {
          ...whereClause,
          title: {
            contains: term,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          title: true,
          model: true,
          createdAt: true,
        },
        take: 100, // Limit per term
      });

      for (const conversation of conversations) {
        const highlights = this.findHighlights(conversation.title, term);
        const snippet = this.extractSnippet(conversation.title, highlights[0]?.start || 0, snippetLength);

        // Calculate relevance score
        const score = this.calculateRelevanceScore(
          term,
          conversation.title,
          'title',
          conversation.createdAt
        );

        matches.push({
          conversationId: conversation.id,
          conversationTitle: conversation.title,
          snippet,
          highlights,
          score,
          matchType: 'title',
          timestamp: conversation.createdAt,
          model: conversation.model || undefined,
        });
      }
    }

    return matches;
  }

  /**
   * Search in message content
   */
  private static async searchMessageContent(
    searchTerms: string[],
    whereClause: any,
    snippetLength: number
  ): Promise<SearchMatch[]> {
    const matches: SearchMatch[]  = [];

    for (const term of searchTerms) {
      // Build the conversation filter for messages
      const conversationFilter: any = {};

      // Apply userId filter
      if (whereClause.userId) {
        conversationFilter.userId = whereClause.userId;
      }

      // Apply date range filter
      if (whereClause.createdAt) {
        conversationFilter.createdAt = whereClause.createdAt;
      }

      // Apply model filter
      if (whereClause.model) {
        conversationFilter.model = whereClause.model;
      }

      const messages = await prisma.message.findMany({
        where: {
          content: {
            contains: term,
            mode: 'insensitive',
          },
          conversation: conversationFilter,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          conversation: {
            select: {
              id: true,
              title: true,
              model: true,
              createdAt: true,
            },
          },
        },
        take: 100, // Limit per term
      });

      for (const message of messages) {
        const highlights = this.findHighlights(message.content, term);
        const snippet = this.extractSnippet(
          message.content,
          highlights[0]?.start || 0,
          snippetLength
        );

        // Calculate relevance score
        const score = this.calculateRelevanceScore(
          term,
          message.content,
          'content',
          message.conversation.createdAt
        );

        matches.push({
          conversationId: message.conversation.id,
          conversationTitle: message.conversation.title,
          messageId: message.id,
          snippet,
          highlights,
          score,
          matchType: 'content',
          timestamp: message.createdAt,
          model: message.conversation.model || undefined,
        });
      }
    }

    return matches;
  }

  /**
   * VBT-236: Calculate relevance score
   * Higher score = more relevant
   */
  private static calculateRelevanceScore(
    searchTerm: string,
    text: string,
    matchType: 'title' | 'content',
    timestamp: Date
  ): number {
    let score = 0;

    // Base score by match type (title matches are more relevant)
    score += matchType === 'title' ? 100 : 50;

    // Frequency score (number of occurrences)
    const lowerText = text.toLowerCase();
    const lowerTerm = searchTerm.toLowerCase();
    const occurrences = (lowerText.match(new RegExp(lowerTerm, 'g')) || []).length;
    score += occurrences * 10;

    // Exact match bonus
    if (lowerText === lowerTerm) {
      score += 200;
    }

    // Starts with bonus
    if (lowerText.startsWith(lowerTerm)) {
      score += 50;
    }

    // Word boundary bonus (whole word match)
    const wordBoundaryRegex = new RegExp(`\\b${lowerTerm}\\b`, 'i');
    if (wordBoundaryRegex.test(text)) {
      score += 30;
    }

    // Recency bonus (decay over time)
    const now = Date.now();
    const age = now - timestamp.getTime();
    const daysOld = age / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 50 - daysOld); // Max 50 points for very recent
    score += recencyScore;

    return score;
  }

  /**
   * VBT-237: Find highlight positions in text
   */
  private static findHighlights(text: string, searchTerm: string): MatchHighlight[] {
    const highlights: MatchHighlight[] = [];
    const lowerText = text.toLowerCase();
    const lowerTerm = searchTerm.toLowerCase();

    let startIndex = 0;
    while (true) {
      const index = lowerText.indexOf(lowerTerm, startIndex);
      if (index === -1) break;

      highlights.push({
        start: index,
        end: index + searchTerm.length,
        text: text.substring(index, index + searchTerm.length),
      });

      startIndex = index + 1;
    }

    return highlights;
  }

  /**
   * VBT-237: Extract snippet with context around match
   */
  private static extractSnippet(text: string, matchPosition: number, length: number): string {
    // Calculate snippet boundaries
    const halfLength = Math.floor(length / 2);
    let start = Math.max(0, matchPosition - halfLength);
    let end = Math.min(text.length, matchPosition + halfLength);

    // Adjust to word boundaries if possible
    if (start > 0) {
      const spaceIndex = text.lastIndexOf(' ', start);
      if (spaceIndex > 0 && start - spaceIndex < 20) {
        start = spaceIndex + 1;
      }
    }

    if (end < text.length) {
      const spaceIndex = text.indexOf(' ', end);
      if (spaceIndex !== -1 && spaceIndex - end < 20) {
        end = spaceIndex;
      }
    }

    // Extract snippet
    let snippet = text.substring(start, end);

    // Add ellipsis
    if (start > 0) {
      snippet = '...' + snippet;
    }
    if (end < text.length) {
      snippet = snippet + '...';
    }

    return snippet;
  }

  /**
   * Build pagination metadata
   */
  private static buildPaginationMeta(
    page: number,
    pageSize: number,
    totalResults: number
  ): SearchPaginationMeta {
    const totalPages = Math.ceil(totalResults / pageSize);

    return {
      page,
      pageSize,
      totalResults,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
