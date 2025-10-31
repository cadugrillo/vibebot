/**
 * Provider Utilities Factory
 * Helper functions to create utilities configured for specific providers
 */

import { ProviderType } from '../types';
import {
  ProviderUtilities,
  ProviderUtilitiesConfig,
  createProviderUtilities,
} from './ProviderUtilities';
import {
  AnthropicRateLimitHeaderParser,
  OpenAIRateLimitHeaderParser,
  RateLimitHeaderParser,
} from './rate-limit';

/**
 * Get the appropriate rate limit header parser for a provider
 *
 * @param provider - Provider type
 * @returns Rate limit header parser for the provider
 */
export function getRateLimitHeaderParser(
  provider: ProviderType
): RateLimitHeaderParser {
  switch (provider) {
    case ProviderType.CLAUDE:
      return new AnthropicRateLimitHeaderParser();

    case ProviderType.OPENAI:
      return new OpenAIRateLimitHeaderParser();

    default:
      console.warn(
        `No rate limit header parser defined for provider: ${provider}. Using Anthropic parser as default.`
      );
      return new AnthropicRateLimitHeaderParser();
  }
}

/**
 * Create utilities configured for a specific provider
 *
 * @param provider - Provider type
 * @param config - Optional additional configuration
 * @returns ProviderUtilities instance configured for the provider
 *
 * @example
 * ```typescript
 * const claudeUtilities = createUtilitiesForProvider(ProviderType.CLAUDE);
 * const openaiUtilities = createUtilitiesForProvider(ProviderType.OPENAI);
 * ```
 */
export function createUtilitiesForProvider(
  provider: ProviderType,
  config?: Omit<ProviderUtilitiesConfig, 'rateLimitHeaderParser'>
): ProviderUtilities {
  const headerParser = getRateLimitHeaderParser(provider);

  return createProviderUtilities({
    ...config,
    rateLimitHeaderParser: headerParser,
  });
}

/**
 * Create shared utilities for multiple providers
 * Useful when you want all providers to share the same error logger and circuit breakers
 *
 * @param config - Optional configuration
 * @returns ProviderUtilities instance that can be shared
 *
 * @example
 * ```typescript
 * // Create shared utilities (all providers will share the same error logger)
 * const sharedUtilities = createSharedUtilities();
 *
 * // Each provider gets its own rate limit parser but shares other utilities
 * const claude = new ClaudeProvider({
 *   config: claudeConfig,
 *   utilities: {
 *     ...sharedUtilities.getAll(),
 *     rateLimitManager: new RateLimitManager(undefined, new AnthropicRateLimitHeaderParser()),
 *   }
 * });
 *
 * const openai = new OpenAIProvider({
 *   config: openaiConfig,
 *   utilities: {
 *     ...sharedUtilities.getAll(),
 *     rateLimitManager: new RateLimitManager(undefined, new OpenAIRateLimitHeaderParser()),
 *   }
 * });
 * ```
 */
export function createSharedUtilities(
  config?: ProviderUtilitiesConfig
): ProviderUtilities {
  console.log('Creating shared utilities for multiple providers');
  return createProviderUtilities(config);
}
