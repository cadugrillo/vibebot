/**
 * Rate Limit Header Parser
 * Provider-specific implementations for parsing rate limit headers
 */

import { RateLimitInfo } from './RateLimitConfig';

/**
 * Interface for provider-specific rate limit header parsing
 * Each AI provider implements this to parse their specific header format
 */
export interface RateLimitHeaderParser {
  /**
   * Parse rate limit information from HTTP headers
   * @param headers - HTTP response headers
   * @returns Partial rate limit info (fields that could be parsed)
   */
  parseHeaders(headers: Record<string, string>): Partial<RateLimitInfo>;
}

/**
 * Anthropic (Claude) rate limit header parser
 *
 * Anthropic uses custom headers like:
 * - anthropic-ratelimit-requests-limit
 * - anthropic-ratelimit-requests-remaining
 * - anthropic-ratelimit-requests-reset
 * - anthropic-ratelimit-tokens-limit
 * - anthropic-ratelimit-tokens-remaining
 * - anthropic-ratelimit-tokens-reset
 * - retry-after (standard header)
 */
export class AnthropicRateLimitHeaderParser implements RateLimitHeaderParser {
  public parseHeaders(headers: Record<string, string>): Partial<RateLimitInfo> {
    const info: Partial<RateLimitInfo> = {};

    // Standard retry-after header (in seconds)
    const retryAfter = this.parseInt(headers['retry-after']);
    if (retryAfter !== undefined) {
      info.retryAfter = retryAfter;
    }

    // Anthropic-specific request rate limits
    const requestsLimit = this.parseInt(headers['anthropic-ratelimit-requests-limit']);
    if (requestsLimit !== undefined) {
      info.requestsPerMinute = requestsLimit;
    }

    const requestsRemaining = this.parseInt(headers['anthropic-ratelimit-requests-remaining']);
    if (requestsRemaining !== undefined) {
      info.remaining = requestsRemaining;
    }

    const requestsReset = headers['anthropic-ratelimit-requests-reset'];
    if (requestsReset) {
      info.reset = this.parseDate(requestsReset);
    }

    // Anthropic-specific token rate limits
    const tokensLimit = this.parseInt(headers['anthropic-ratelimit-tokens-limit']);
    if (tokensLimit !== undefined) {
      info.tokensPerMinute = tokensLimit;
    }

    // Daily token limit (if available)
    const tokensDailyLimit = this.parseInt(headers['anthropic-ratelimit-tokens-daily-limit']);
    if (tokensDailyLimit !== undefined) {
      info.tokensPerDay = tokensDailyLimit;
    }

    return info;
  }

  /**
   * Parse integer from header value
   */
  private parseInt(value: string | undefined): number | undefined {
    if (!value || value.trim() === '') {
      return undefined;
    }

    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Parse date from header value
   * Supports Unix timestamp or ISO date string
   */
  private parseDate(value: string | undefined): Date | undefined {
    if (!value || value.trim() === '') {
      return undefined;
    }

    // Try Unix timestamp first
    const timestamp = parseInt(value, 10);
    if (!isNaN(timestamp)) {
      return new Date(timestamp * 1000);
    }

    // Try ISO date string
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }
}

/**
 * OpenAI rate limit header parser
 *
 * OpenAI uses headers like:
 * - x-ratelimit-limit-requests
 * - x-ratelimit-remaining-requests
 * - x-ratelimit-reset-requests
 * - x-ratelimit-limit-tokens
 * - x-ratelimit-remaining-tokens
 * - x-ratelimit-reset-tokens
 * - retry-after (standard header)
 */
export class OpenAIRateLimitHeaderParser implements RateLimitHeaderParser {
  public parseHeaders(headers: Record<string, string>): Partial<RateLimitInfo> {
    const info: Partial<RateLimitInfo> = {};

    // Standard retry-after header (in seconds)
    const retryAfter = this.parseInt(headers['retry-after']);
    if (retryAfter !== undefined) {
      info.retryAfter = retryAfter;
    }

    // OpenAI request rate limits
    const requestsLimit = this.parseInt(headers['x-ratelimit-limit-requests']);
    if (requestsLimit !== undefined) {
      info.limit = requestsLimit;
      info.requestsPerMinute = requestsLimit; // Assuming per minute
    }

    const requestsRemaining = this.parseInt(headers['x-ratelimit-remaining-requests']);
    if (requestsRemaining !== undefined) {
      info.remaining = requestsRemaining;
    }

    const requestsReset = headers['x-ratelimit-reset-requests'];
    if (requestsReset) {
      info.reset = this.parseDate(requestsReset);
    }

    // OpenAI token rate limits
    const tokensLimit = this.parseInt(headers['x-ratelimit-limit-tokens']);
    if (tokensLimit !== undefined) {
      info.tokensPerMinute = tokensLimit; // Assuming per minute
    }

    const tokensRemaining = this.parseInt(headers['x-ratelimit-remaining-tokens']);
    // If we didn't get request remaining, use tokens remaining as fallback
    if (tokensRemaining !== undefined && info.remaining === undefined) {
      info.remaining = tokensRemaining;
    }

    return info;
  }

  /**
   * Parse integer from header value
   */
  private parseInt(value: string | undefined): number | undefined {
    if (!value || value.trim() === '') {
      return undefined;
    }

    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Parse date from header value
   * Supports Unix timestamp or ISO date string
   */
  private parseDate(value: string | undefined): Date | undefined {
    if (!value || value.trim() === '') {
      return undefined;
    }

    // Try Unix timestamp first
    const timestamp = parseInt(value, 10);
    if (!isNaN(timestamp)) {
      // OpenAI sometimes uses Unix timestamp in seconds, sometimes milliseconds
      // If timestamp is very large, it's probably milliseconds
      return timestamp > 1e10 ? new Date(timestamp) : new Date(timestamp * 1000);
    }

    // Try ISO date string
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }
}

/**
 * Generic rate limit header parser
 * Falls back to standard HTTP headers only
 * Used when provider-specific parser is not available
 */
export class GenericRateLimitHeaderParser implements RateLimitHeaderParser {
  public parseHeaders(headers: Record<string, string>): Partial<RateLimitInfo> {
    const info: Partial<RateLimitInfo> = {};

    // Standard retry-after header
    const retryAfter = headers['retry-after'];
    if (retryAfter) {
      const parsed = parseInt(retryAfter, 10);
      if (!isNaN(parsed)) {
        info.retryAfter = parsed;
      }
    }

    // Standard X-RateLimit headers (used by many APIs)
    const limit = headers['x-ratelimit-limit'];
    if (limit) {
      const parsed = parseInt(limit, 10);
      if (!isNaN(parsed)) {
        info.limit = parsed;
      }
    }

    const remaining = headers['x-ratelimit-remaining'];
    if (remaining) {
      const parsed = parseInt(remaining, 10);
      if (!isNaN(parsed)) {
        info.remaining = parsed;
      }
    }

    const reset = headers['x-ratelimit-reset'];
    if (reset) {
      const timestamp = parseInt(reset, 10);
      if (!isNaN(timestamp)) {
        info.reset = new Date(timestamp * 1000);
      }
    }

    return info;
  }
}
