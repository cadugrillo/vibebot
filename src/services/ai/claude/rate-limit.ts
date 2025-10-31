/**
 * Rate Limit Handler
 * VBT-159: Implement Rate Limit Detection and Handling
 *
 * Handles Claude API rate limits with exponential backoff and retry logic
 *
 * @deprecated This file is deprecated and maintained for backward compatibility only.
 * Use the new provider-agnostic RateLimitManager from '@/services/ai/providers/utils/rate-limit/RateLimitManager' instead.
 * See MIGRATION.md for migration guide.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ClaudeServiceError, ClaudeErrorType } from './types';

/**
 * Rate limit information extracted from API responses
 */
export interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfter?: number; // Seconds to wait before retrying
  limit?: number; // Total rate limit
  remaining?: number; // Remaining requests
  reset?: Date; // When the rate limit resets
  requestsPerMinute?: number; // Requests per minute limit
  tokensPerMinute?: number; // Tokens per minute limit
}

/**
 * Retry configuration options
 */
export interface RetryConfig {
  maxRetries: number; // Maximum number of retry attempts (default: 3)
  baseDelay: number; // Base delay in milliseconds (default: 1000)
  maxDelay: number; // Maximum delay in milliseconds (default: 32000)
  jitterFactor: number; // Jitter factor 0-1 (default: 0.1)
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 32000, // 32 seconds
  jitterFactor: 0.1, // 10% jitter
};

/**
 * Rate limit handler class
 * Manages rate limit detection, parsing, and retry logic
 *
 * @deprecated Use RateLimitManager from '@/services/ai/providers/utils/rate-limit/RateLimitManager' instead
 */
export class RateLimitHandler {
  private config: RetryConfig;
  private retryCount: number = 0;

  constructor(config: Partial<RetryConfig> = {}) {
    console.warn(
      '⚠️ RateLimitHandler is deprecated. Use RateLimitManager from @/services/ai/providers/utils/rate-limit/RateLimitManager instead. See MIGRATION.md for details.'
    );
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Parse rate limit information from Anthropic error
   * Claude API uses standard rate limit headers
   *
   * @param error - Anthropic rate limit error
   * @returns Rate limit information
   */
  public parseRateLimitError(error: any): RateLimitInfo {
    const info: RateLimitInfo = {
      isRateLimited: true,
    };

    // Extract rate limit info from error response
    // Anthropic API returns rate limit info in the error
    // Note: headers property may not be directly accessible, use type assertion
    const errorWithHeaders = error as any;

    if (errorWithHeaders.headers) {
      const headers = errorWithHeaders.headers;

      // Standard retry-after header (in seconds)
      const retryAfter = headers['retry-after'];
      if (retryAfter) {
        info.retryAfter = parseInt(String(retryAfter), 10);
      }

      // X-RateLimit headers (if provided)
      const limit = headers['x-ratelimit-limit'];
      if (limit) {
        info.limit = parseInt(String(limit), 10);
      }

      const remaining = headers['x-ratelimit-remaining'];
      if (remaining) {
        info.remaining = parseInt(String(remaining), 10);
      }

      const reset = headers['x-ratelimit-reset'];
      if (reset) {
        // Reset can be Unix timestamp or ISO date string
        const resetValue = parseInt(String(reset), 10);
        info.reset = new Date(resetValue * 1000);
      }

      // Anthropic-specific rate limit headers
      const requestsPerMinute = headers['anthropic-ratelimit-requests-limit'];
      if (requestsPerMinute) {
        info.requestsPerMinute = parseInt(String(requestsPerMinute), 10);
      }

      const tokensPerMinute = headers['anthropic-ratelimit-tokens-limit'];
      if (tokensPerMinute) {
        info.tokensPerMinute = parseInt(String(tokensPerMinute), 10);
      }
    }

    // If no retry-after header, use exponential backoff
    if (!info.retryAfter) {
      info.retryAfter = this.calculateBackoffDelay(this.retryCount) / 1000;
    }

    return info;
  }

  /**
   * Calculate exponential backoff delay with jitter
   * Formula: min(maxDelay, baseDelay * 2^attempt) + randomJitter
   *
   * @param attempt - Current retry attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  public calculateBackoffDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = this.config.baseDelay * Math.pow(2, attempt);

    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);

    // Add random jitter to prevent thundering herd
    const jitterRange = cappedDelay * this.config.jitterFactor;
    const jitter = Math.random() * jitterRange - jitterRange / 2;

    const finalDelay = Math.max(0, cappedDelay + jitter);

    console.log(
      `Backoff delay calculation: attempt=${attempt}, exponential=${exponentialDelay}ms, ` +
        `capped=${cappedDelay}ms, jitter=${jitter.toFixed(0)}ms, final=${finalDelay.toFixed(0)}ms`
    );

    return finalDelay;
  }

  /**
   * Wait for the specified delay
   * Used for implementing retry delays
   *
   * @param delayMs - Delay in milliseconds
   * @returns Promise that resolves after the delay
   */
  public async wait(delayMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  /**
   * Execute a function with automatic retry on rate limit errors
   * Implements exponential backoff with jitter
   *
   * @param fn - Async function to execute
   * @param context - Context string for logging
   * @returns Result of the function
   * @throws ClaudeServiceError if max retries exceeded
   */
  public async executeWithRetry<T>(
    fn: () => Promise<T>,
    context: string = 'API call'
  ): Promise<T> {
    this.retryCount = 0;

    while (true) {
      try {
        const result = await fn();

        // Success - reset retry count
        if (this.retryCount > 0) {
          console.log(`✅ ${context} succeeded after ${this.retryCount} retries`);
        }

        return result;
      } catch (error) {
        // Check if it's a rate limit error
        if (error instanceof Anthropic.RateLimitError) {
          // Parse rate limit info
          const rateLimitInfo = this.parseRateLimitError(error);

          console.warn(`⚠️ Rate limit hit for ${context}`);
          console.warn(`   Retry attempt: ${this.retryCount + 1}/${this.config.maxRetries}`);
          console.warn(`   Retry after: ${rateLimitInfo.retryAfter}s`);

          if (rateLimitInfo.remaining !== undefined) {
            console.warn(`   Remaining requests: ${rateLimitInfo.remaining}`);
          }

          // Check if we've exceeded max retries
          if (this.retryCount >= this.config.maxRetries) {
            console.error(`❌ Max retries (${this.config.maxRetries}) exceeded for ${context}`);

            throw new ClaudeServiceError(
              ClaudeErrorType.RATE_LIMIT,
              `Rate limit exceeded. Maximum retries (${this.config.maxRetries}) reached. ` +
                `Please try again in ${rateLimitInfo.retryAfter} seconds.`,
              429,
              false, // Not retryable anymore
              rateLimitInfo
            );
          }

          // Calculate delay (prefer retry-after header if available)
          const delayMs = rateLimitInfo.retryAfter
            ? rateLimitInfo.retryAfter * 1000
            : this.calculateBackoffDelay(this.retryCount);

          console.log(`   Waiting ${(delayMs / 1000).toFixed(1)}s before retry...`);

          // Wait before retrying
          await this.wait(delayMs);

          // Increment retry count and try again
          this.retryCount++;
          continue;
        }

        // Not a rate limit error - rethrow
        throw error;
      }
    }
  }

  /**
   * Get current retry count
   */
  public getRetryCount(): number {
    return this.retryCount;
  }

  /**
   * Reset retry count
   * Useful when starting a new request
   */
  public reset(): void {
    this.retryCount = 0;
  }

  /**
   * Check if an error is retryable
   *
   * @param error - Error to check
   * @returns True if the error is retryable
   */
  public isRetryableError(error: unknown): boolean {
    if (error instanceof Anthropic.RateLimitError) {
      return true;
    }

    if (error instanceof Anthropic.APIError) {
      // Retry on 5xx errors (server errors)
      return error.status ? error.status >= 500 && error.status < 600 : false;
    }

    // Network errors might be retryable
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('enotfound')
      );
    }

    return false;
  }
}

/**
 * Enhanced ClaudeServiceError with rate limit info
 * Extends the base error to include rate limit details
 */
export class ClaudeRateLimitError extends ClaudeServiceError {
  constructor(
    message: string,
    public override rateLimitInfo: RateLimitInfo
  ) {
    super(ClaudeErrorType.RATE_LIMIT, message, 429, false, rateLimitInfo);
    this.name = 'ClaudeRateLimitError';
  }
}

/**
 * Format rate limit info for user display
 *
 * @param info - Rate limit information
 * @returns Formatted string for display
 */
export function formatRateLimitInfo(info: RateLimitInfo): string {
  const parts: string[] = ['Rate limit exceeded.'];

  if (info.retryAfter) {
    parts.push(`Please try again in ${info.retryAfter} seconds.`);
  }

  if (info.remaining !== undefined && info.limit !== undefined) {
    parts.push(`Rate limit: ${info.remaining}/${info.limit} remaining.`);
  }

  if (info.reset) {
    const resetTime = info.reset.toLocaleTimeString();
    parts.push(`Resets at ${resetTime}.`);
  }

  if (info.requestsPerMinute) {
    parts.push(`Limit: ${info.requestsPerMinute} requests/minute.`);
  }

  if (info.tokensPerMinute) {
    parts.push(`Limit: ${info.tokensPerMinute.toLocaleString()} tokens/minute.`);
  }

  return parts.join(' ');
}

/**
 * Log rate limit event
 * Centralized logging for rate limit events
 *
 * @param info - Rate limit information
 * @param context - Context string for the event
 */
export function logRateLimitEvent(info: RateLimitInfo, context: string): void {
  console.warn('\n' + '='.repeat(60));
  console.warn('⚠️  RATE LIMIT EVENT');
  console.warn('='.repeat(60));
  console.warn(`Context: ${context}`);
  console.warn(`Time: ${new Date().toISOString()}`);

  if (info.retryAfter) {
    console.warn(`Retry after: ${info.retryAfter} seconds`);
  }

  if (info.remaining !== undefined && info.limit !== undefined) {
    console.warn(`Rate limit: ${info.remaining}/${info.limit} remaining`);
  }

  if (info.reset) {
    console.warn(`Resets at: ${info.reset.toISOString()}`);
  }

  if (info.requestsPerMinute) {
    console.warn(`Requests/minute limit: ${info.requestsPerMinute}`);
  }

  if (info.tokensPerMinute) {
    console.warn(`Tokens/minute limit: ${info.tokensPerMinute.toLocaleString()}`);
  }

  console.warn('='.repeat(60) + '\n');
}
