/**
 * Provider Utilities
 * Convenience wrapper bundling all provider utilities
 *
 * This class provides a single entry point for providers to access
 * all utility classes (rate limiting, circuit breaking, error logging, system prompts).
 *
 * Usage:
 * ```typescript
 * // Option 1: Create with defaults
 * const utilities = new ProviderUtilities();
 *
 * // Option 2: Create with custom rate limit parser
 * const utilities = new ProviderUtilities({
 *   rateLimitHeaderParser: new OpenAIRateLimitHeaderParser(),
 * });
 *
 * // Option 3: Share utilities across multiple providers
 * const sharedUtilities = new ProviderUtilities();
 * const claudeProvider = new ClaudeProvider({ config, utilities: sharedUtilities });
 * const openaiProvider = new OpenAIProvider({ config, utilities: sharedUtilities });
 * ```
 */

import { RateLimitManager, RateLimitHeaderParser, RetryConfig } from './rate-limit';
import { CircuitBreakerManager, CircuitBreakerConfig } from './circuit-breaker';
import { ErrorLogger } from './error-logging';
import { SystemPromptManager, SystemPromptConfig } from './system-prompts';

/**
 * Configuration for ProviderUtilities
 */
export interface ProviderUtilitiesConfig {
  /**
   * Custom rate limit header parser
   * Different providers use different header formats
   */
  rateLimitHeaderParser?: RateLimitHeaderParser;

  /**
   * Retry configuration for rate limiting
   */
  retryConfig?: Partial<RetryConfig>;

  /**
   * Circuit breaker configuration defaults
   */
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;

  /**
   * Error logger max entries
   */
  errorLoggerMaxEntries?: number;

  /**
   * System prompt configuration
   */
  systemPromptConfig?: Partial<SystemPromptConfig>;
}

/**
 * Provider Utilities
 * Bundles all provider utilities into a single convenient class
 */
export class ProviderUtilities {
  public readonly rateLimitManager: RateLimitManager;
  public readonly circuitBreaker: CircuitBreakerManager;
  public readonly errorLogger: ErrorLogger;
  public readonly systemPromptManager: SystemPromptManager;

  /**
   * Create a new ProviderUtilities instance
   *
   * @param config - Optional configuration for utilities
   */
  constructor(config?: ProviderUtilitiesConfig) {
    // Initialize rate limit manager
    this.rateLimitManager = new RateLimitManager(
      config?.retryConfig,
      config?.rateLimitHeaderParser
    );

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreakerManager();

    // Initialize error logger
    this.errorLogger = new ErrorLogger(config?.errorLoggerMaxEntries);

    // Initialize system prompt manager
    this.systemPromptManager = new SystemPromptManager(config?.systemPromptConfig);

    console.log('ProviderUtilities initialized with all utilities');
  }

  /**
   * Get rate limit manager
   */
  public getRateLimitManager(): RateLimitManager {
    return this.rateLimitManager;
  }

  /**
   * Get circuit breaker manager
   */
  public getCircuitBreaker(): CircuitBreakerManager {
    return this.circuitBreaker;
  }

  /**
   * Get error logger
   */
  public getErrorLogger(): ErrorLogger {
    return this.errorLogger;
  }

  /**
   * Get system prompt manager
   */
  public getSystemPromptManager(): SystemPromptManager {
    return this.systemPromptManager;
  }

  /**
   * Get all utilities as an object
   * Useful for spreading into provider options
   */
  public getAll() {
    return {
      rateLimitManager: this.rateLimitManager,
      circuitBreaker: this.circuitBreaker,
      errorLogger: this.errorLogger,
      systemPromptManager: this.systemPromptManager,
    };
  }

  /**
   * Print utility statistics
   * Useful for monitoring and debugging
   */
  public printStatistics(): void {
    console.log('\n' + '='.repeat(70));
    console.log('Provider Utilities Statistics');
    console.log('='.repeat(70));

    // Error statistics
    const errorStats = this.errorLogger.getStats();
    console.log('\n📊 Error Statistics:');
    console.log(`  Total errors: ${errorStats.total}`);
    console.log(`  Retryable: ${errorStats.retryableCount}`);
    console.log(`  Non-retryable: ${errorStats.nonRetryableCount}`);

    if (errorStats.total > 0) {
      console.log('\n  By severity:');
      Object.entries(errorStats.bySeverity).forEach(([severity, count]) => {
        if (count > 0) {
          console.log(`    ${severity}: ${count}`);
        }
      });

      console.log('\n  By type:');
      Object.entries(errorStats.byType).forEach(([type, count]) => {
        if (count && count > 0) {
          console.log(`    ${type}: ${count}`);
        }
      });

      if (errorStats.byProvider && Object.keys(errorStats.byProvider).length > 0) {
        console.log('\n  By provider:');
        Object.entries(errorStats.byProvider).forEach(([provider, count]) => {
          if (count && count > 0) {
            console.log(`    ${provider}: ${count}`);
          }
        });
      }
    }

    // Circuit breaker statistics
    const breakerNames = this.circuitBreaker.getBreakerNames();
    if (breakerNames.length > 0) {
      console.log('\n⚡ Circuit Breakers:');
      const allStats = this.circuitBreaker.getAllStats();
      Object.entries(allStats).forEach(([name, stats]) => {
        const total = stats.successes + stats.failures;
        const successRate = total > 0 ? (stats.successes / total) * 100 : 0;
        console.log(`\n  ${name}:`);
        console.log(`    State: ${stats.state}`);
        console.log(`    Total executions: ${total}`);
        console.log(`    Successes: ${stats.successes}`);
        console.log(`    Failures: ${stats.failures}`);
        console.log(`    Consecutive failures: ${stats.consecutiveFailures}`);
        console.log(`    Success rate: ${successRate.toFixed(2)}%`);
      });
    } else {
      console.log('\n⚡ Circuit Breakers: None active');
    }

    // Rate limit info
    console.log('\n⏱️  Rate Limit Manager:');
    console.log(`  Retry count (current): ${this.rateLimitManager['retryCount'] || 0}`);
    console.log(`  Max retries: ${this.rateLimitManager['config'].maxRetries}`);

    // System prompts
    const allPresets = this.systemPromptManager.getAllPresets();
    const customPresets = this.systemPromptManager.getCustomPresets();
    console.log('\n📝 System Prompts:');
    console.log(`  Total presets: ${allPresets.length}`);
    console.log(`  Custom presets: ${customPresets.length}`);

    console.log('\n' + '='.repeat(70) + '\n');
  }

  /**
   * Reset all utilities
   * Useful for testing or starting fresh
   */
  public reset(): void {
    // Reset error logger
    this.errorLogger.clear();

    // Reset circuit breakers
    this.circuitBreaker.resetAll();

    // Clear custom system prompts
    this.systemPromptManager.clearCustomPresets();

    console.log('ProviderUtilities reset: all utilities cleared');
  }
}

/**
 * Create a new ProviderUtilities instance
 * Factory function for convenience
 *
 * @param config - Optional configuration
 * @returns New ProviderUtilities instance
 */
export function createProviderUtilities(
  config?: ProviderUtilitiesConfig
): ProviderUtilities {
  return new ProviderUtilities(config);
}
