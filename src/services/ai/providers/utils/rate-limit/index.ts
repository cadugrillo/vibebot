/**
 * Rate Limit Utilities
 * Provider-agnostic rate limiting with automatic retry
 *
 * @example
 * ```typescript
 * import { RateLimitManager, AnthropicRateLimitHeaderParser } from './utils/rate-limit';
 *
 * const rateLimitManager = new RateLimitManager(
 *   { maxRetries: 5 },
 *   new AnthropicRateLimitHeaderParser()
 * );
 *
 * const result = await rateLimitManager.executeWithRetry(
 *   () => provider.sendMessage(params),
 *   'Send message'
 * );
 * ```
 */

// Main class
export { RateLimitManager } from './RateLimitManager';

// Configuration
export {
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  RateLimitInfo,
} from './RateLimitConfig';

// Header parsers
export {
  RateLimitHeaderParser,
  AnthropicRateLimitHeaderParser,
  OpenAIRateLimitHeaderParser,
  GenericRateLimitHeaderParser,
} from './RateLimitHeaderParser';
