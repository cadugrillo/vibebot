/**
 * Provider Utilities
 * Provider-agnostic utilities for AI provider implementations
 *
 * This module provides four core utilities:
 * 1. RateLimitManager - Automatic retry with exponential backoff
 * 2. CircuitBreakerManager - Prevent cascading failures
 * 3. ErrorLogger - Structured error logging with statistics
 * 4. SystemPromptManager - System prompt validation and presets
 *
 * @example
 * ```typescript
 * import {
 *   RateLimitManager,
 *   CircuitBreakerManager,
 *   ErrorLogger,
 *   SystemPromptManager,
 * } from './utils';
 *
 * // Or import convenience wrapper:
 * import { ProviderUtilities } from './utils';
 *
 * const utilities = new ProviderUtilities({
 *   rateLimitHeaderParser: new AnthropicRateLimitHeaderParser(),
 * });
 * ```
 */

// Rate limiting
export * from './rate-limit';

// Circuit breaker
export * from './circuit-breaker';

// Error logging
export * from './error-logging';

// System prompts
export * from './system-prompts';

// Convenience wrapper
export * from './ProviderUtilities';

// Factory helpers
export * from './ProviderUtilitiesFactory';
