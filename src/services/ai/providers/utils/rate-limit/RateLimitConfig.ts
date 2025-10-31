/**
 * Rate Limit Configuration
 * Provider-agnostic retry configuration
 */

/**
 * Retry configuration for rate limit handling
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries: number;

  /**
   * Base delay in milliseconds before first retry
   * @default 1000 (1 second)
   */
  baseDelay: number;

  /**
   * Maximum delay in milliseconds between retries
   * @default 32000 (32 seconds)
   */
  maxDelay: number;

  /**
   * Jitter factor (0-1) to add randomness to delays
   * Helps prevent thundering herd problem
   * @default 0.1 (10% jitter)
   */
  jitterFactor: number;
}

/**
 * Default retry configuration
 * Conservative settings that work well for most providers
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,    // 1 second
  maxDelay: 32000,    // 32 seconds
  jitterFactor: 0.1,  // 10% jitter
};

/**
 * Rate limit information
 * Provider-agnostic representation of rate limit data
 */
export interface RateLimitInfo {
  /**
   * Whether the request is rate limited
   */
  isRateLimited: boolean;

  /**
   * Seconds to wait before retrying
   */
  retryAfter?: number;

  /**
   * Total rate limit (requests or tokens)
   */
  limit?: number;

  /**
   * Remaining requests or tokens
   */
  remaining?: number;

  /**
   * When the rate limit resets
   */
  reset?: Date;

  /**
   * Requests per minute limit
   */
  requestsPerMinute?: number;

  /**
   * Tokens per minute limit
   */
  tokensPerMinute?: number;

  /**
   * Tokens per day limit
   */
  tokensPerDay?: number;
}
