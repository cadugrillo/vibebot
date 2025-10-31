/**
 * Rate Limit Manager
 * Provider-agnostic rate limit handling with automatic retry
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Pluggable header parsers for different providers
 * - Configurable retry limits and delays
 * - Jitter to prevent thundering herd
 */

import { ProviderError, ProviderErrorType } from '../../errors';
import {
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  RateLimitInfo,
} from './RateLimitConfig';
import { RateLimitHeaderParser, GenericRateLimitHeaderParser } from './RateLimitHeaderParser';

/**
 * Rate Limit Manager
 * Handles rate limit errors from any AI provider with automatic retry
 */
export class RateLimitManager {
  private config: RetryConfig;
  private retryCount: number = 0;
  private headerParser: RateLimitHeaderParser;

  /**
   * Create a new RateLimitManager
   *
   * @param config - Retry configuration (optional, uses defaults if not provided)
   * @param headerParser - Provider-specific header parser (optional, uses generic if not provided)
   */
  constructor(
    config?: Partial<RetryConfig>,
    headerParser?: RateLimitHeaderParser
  ) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.headerParser = headerParser || new GenericRateLimitHeaderParser();

    console.log('RateLimitManager initialized');
    console.log(`  Max retries: ${this.config.maxRetries}`);
    console.log(`  Base delay: ${this.config.baseDelay}ms`);
    console.log(`  Max delay: ${this.config.maxDelay}ms`);
    console.log(`  Jitter factor: ${(this.config.jitterFactor * 100).toFixed(0)}%`);
  }

  /**
   * Parse rate limit information from ProviderError
   * Works with any provider's error format
   *
   * Priority:
   * 1. Use error.rateLimitInfo if available
   * 2. Parse from headers using provider-specific parser
   * 3. Fallback to exponential backoff calculation
   *
   * @param error - ProviderError with rate limit information
   * @returns Rate limit info
   */
  public parseRateLimitError(error: ProviderError): RateLimitInfo {
    // 1. Check if error already has rate limit info
    if (error.rateLimitInfo) {
      return error.rateLimitInfo;
    }

    // 2. Try to parse from headers using provider-specific parser
    if (error.context?.headers) {
      const parsed = this.headerParser.parseHeaders(error.context.headers);

      // If we got useful information from headers, return it
      if (Object.keys(parsed).length > 0) {
        return {
          isRateLimited: true,
          ...parsed,
        };
      }
    }

    // 3. Fallback: calculate backoff delay
    return {
      isRateLimited: true,
      retryAfter: this.calculateBackoffDelay(this.retryCount) / 1000,
    };
  }

  /**
   * Execute a function with automatic retry on rate limit errors
   * Works with ANY provider that throws ProviderError
   *
   * @param fn - Async function to execute
   * @param context - Context string for logging (e.g., "Stream message")
   * @returns Result of the function
   * @throws ProviderError if max retries exceeded or non-retryable error
   */
  public async executeWithRetry<T>(
    fn: () => Promise<T>,
    context: string = 'API call'
  ): Promise<T> {
    this.retryCount = 0;

    while (true) {
      try {
        // Execute the function
        const result = await fn();

        // Success! Log if we had to retry
        if (this.retryCount > 0) {
          console.log(`✅ ${context} succeeded after ${this.retryCount} retry(ies)`);
        }

        return result;
      } catch (error) {
        // Check if it's a rate limit error from ANY provider
        if (
          error instanceof ProviderError &&
          error.type === ProviderErrorType.RATE_LIMIT
        ) {
          // Parse rate limit information
          const rateLimitInfo = this.parseRateLimitError(error);

          console.warn(`⚠️ Rate limit hit for ${context}`);
          console.warn(`   Retry attempt: ${this.retryCount + 1}/${this.config.maxRetries}`);

          if (rateLimitInfo.retryAfter) {
            console.warn(`   Retry after: ${rateLimitInfo.retryAfter}s`);
          }

          if (rateLimitInfo.remaining !== undefined) {
            console.warn(`   Remaining: ${rateLimitInfo.remaining}`);
          }

          if (rateLimitInfo.limit !== undefined) {
            console.warn(`   Limit: ${rateLimitInfo.limit}`);
          }

          if (rateLimitInfo.reset) {
            console.warn(`   Resets at: ${rateLimitInfo.reset.toLocaleTimeString()}`);
          }

          // Check if we've exceeded max retries
          if (this.retryCount >= this.config.maxRetries) {
            console.error(`❌ Max retries (${this.config.maxRetries}) exceeded for ${context}`);

            // Throw a non-retryable error
            throw new ProviderError(
              ProviderErrorType.RATE_LIMIT,
              `Rate limit exceeded. Maximum retries (${this.config.maxRetries}) reached. ` +
                `Please try again in ${rateLimitInfo.retryAfter || 'a few'} seconds.`,
              {
                statusCode: 429,
                retryable: false,
                rateLimitInfo,
                context: {
                  ...error.context,
                  retryAttempts: this.retryCount,
                  maxRetries: this.config.maxRetries,
                  originalOperation: context,
                },
              }
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

        // Not a rate limit error - rethrow immediately
        throw error;
      }
    }
  }

  /**
   * Calculate exponential backoff delay with jitter
   *
   * Formula: min(maxDelay, baseDelay * 2^attempt) + randomJitter
   *
   * The jitter is added to prevent "thundering herd" problem where many
   * clients retry at exactly the same time, causing another rate limit spike.
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
    // Jitter range: ±(cappedDelay * jitterFactor / 2)
    const jitterRange = cappedDelay * this.config.jitterFactor;
    const jitter = Math.random() * jitterRange - jitterRange / 2;

    // Ensure delay is never negative
    const finalDelay = Math.max(0, cappedDelay + jitter);

    console.log(
      `Backoff calculation: attempt=${attempt}, ` +
        `exponential=${exponentialDelay}ms, ` +
        `capped=${cappedDelay}ms, ` +
        `jitter=${jitter.toFixed(0)}ms, ` +
        `final=${finalDelay.toFixed(0)}ms`
    );

    return finalDelay;
  }

  /**
   * Wait for the specified delay
   * Used internally for implementing retry delays
   *
   * @param delayMs - Delay in milliseconds
   * @returns Promise that resolves after the delay
   */
  private async wait(delayMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  /**
   * Get current retry count
   * Useful for monitoring and debugging
   *
   * @returns Current retry count
   */
  public getRetryCount(): number {
    return this.retryCount;
  }

  /**
   * Reset retry count to zero
   * Call this when starting a new independent operation
   */
  public reset(): void {
    this.retryCount = 0;
  }

  /**
   * Get current retry configuration
   * Returns a copy to prevent external modification
   *
   * @returns Current retry configuration
   */
  public getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Update retry configuration
   * Merges with existing configuration
   *
   * @param config - Partial configuration to update
   */
  public updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('RateLimitManager configuration updated');
  }

  /**
   * Check if an error is retryable
   * Determines if the error should trigger a retry attempt
   *
   * @param error - Error to check
   * @returns True if the error is retryable
   */
  public isRetryableError(error: unknown): boolean {
    if (error instanceof ProviderError) {
      // Rate limit errors are always retryable (until max retries)
      if (error.type === ProviderErrorType.RATE_LIMIT) {
        return true;
      }

      // Some other errors might be retryable (network, timeout, server errors)
      return error.retryable;
    }

    // Generic network errors might be retryable
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('enotfound') ||
        message.includes('econnrefused')
      );
    }

    return false;
  }

  /**
   * Format rate limit info for display
   * Creates a human-readable string from rate limit info
   *
   * @param info - Rate limit information
   * @returns Formatted string
   */
  public formatRateLimitInfo(info: RateLimitInfo): string {
    const parts: string[] = ['Rate limit exceeded.'];

    if (info.retryAfter) {
      parts.push(`Retry after ${info.retryAfter} seconds.`);
    }

    if (info.remaining !== undefined && info.limit !== undefined) {
      parts.push(`${info.remaining}/${info.limit} remaining.`);
    }

    if (info.reset) {
      parts.push(`Resets at ${info.reset.toLocaleTimeString()}.`);
    }

    if (info.requestsPerMinute) {
      parts.push(`Limit: ${info.requestsPerMinute} requests/minute.`);
    }

    if (info.tokensPerMinute) {
      parts.push(`Limit: ${info.tokensPerMinute.toLocaleString()} tokens/minute.`);
    }

    if (info.tokensPerDay) {
      parts.push(`Daily limit: ${info.tokensPerDay.toLocaleString()} tokens/day.`);
    }

    return parts.join(' ');
  }

  /**
   * Log rate limit event
   * Centralized logging for rate limit events with detailed information
   *
   * @param info - Rate limit information
   * @param context - Context string for the event
   */
  public logRateLimitEvent(info: RateLimitInfo, context: string): void {
    console.warn('\n' + '='.repeat(70));
    console.warn('⚠️  RATE LIMIT EVENT');
    console.warn('='.repeat(70));
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

    if (info.tokensPerDay) {
      console.warn(`Tokens/day limit: ${info.tokensPerDay.toLocaleString()}`);
    }

    console.warn('='.repeat(70) + '\n');
  }
}
