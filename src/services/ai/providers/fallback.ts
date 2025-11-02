/**
 * Fallback Chain Manager
 * VBT-171: Manages provider fallback logic
 *
 * Provides automatic failover to backup providers when primary fails.
 * Implements retry logic with exponential backoff between providers.
 */

import { ProviderType } from './types';
import { IAIProvider } from './IAIProvider';
import { ProviderError, ProviderErrorType } from './errors';

/**
 * Fallback options
 */
export interface FallbackOptions {
  /** Maximum number of fallback attempts (default: 2) */
  maxAttempts?: number;

  /** Delay between fallback attempts in ms (default: 0) */
  delayMs?: number;

  /** Whether to log fallback attempts (default: true) */
  logAttempts?: boolean;

  /** Callback when fallback occurs */
  onFallback?: (from: ProviderType, to: ProviderType, error: Error) => void;
}

/**
 * Default fallback options
 */
const DEFAULT_OPTIONS: Required<FallbackOptions> = {
  maxAttempts: 2,
  delayMs: 0,
  logAttempts: true,
  onFallback: () => {}, // No-op
};

/**
 * Fallback Chain Manager
 *
 * Manages provider fallback chains and executes operations with automatic
 * failover when providers fail.
 *
 * Features:
 * - Configurable fallback chains per provider
 * - Automatic retry with fallback providers
 * - Optional delay between attempts
 * - Detailed error tracking
 *
 * @example
 * ```typescript
 * const manager = new FallbackChainManager();
 * manager.setFallbackChain(ProviderType.CLAUDE, [ProviderType.OPENAI]);
 *
 * const result = await manager.executeWithFallback(
 *   ProviderType.CLAUDE,
 *   async (provider) => await provider.sendMessage({...})
 * );
 * ```
 */
export class FallbackChainManager {
  private static instance: FallbackChainManager | null = null;

  /** Fallback chains: primary provider → array of fallback providers */
  private chains: Map<ProviderType, ProviderType[]> = new Map();

  /** Track fallback statistics */
  private stats: Map<string, number> = new Map();

  /**
   * Constructor
   * Initializes with default fallback chains
   */
  constructor() {
    // Default fallback chains
    this.setDefaultChains();
    console.log('FallbackChainManager initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): FallbackChainManager {
    if (!FallbackChainManager.instance) {
      FallbackChainManager.instance = new FallbackChainManager();
    }
    return FallbackChainManager.instance;
  }

  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    FallbackChainManager.instance = null;
  }

  /**
   * Set up default fallback chains
   */
  private setDefaultChains(): void {
    // Claude → OpenAI
    this.chains.set(ProviderType.CLAUDE, [ProviderType.OPENAI]);

    // OpenAI → Claude
    this.chains.set(ProviderType.OPENAI, [ProviderType.CLAUDE]);

    console.log('Default fallback chains configured');
  }

  /**
   * Get fallback chain for a provider
   *
   * @param primary - Primary provider
   * @returns Array of fallback providers (empty if no fallbacks)
   */
  public getFallbackChain(primary: ProviderType): ProviderType[] {
    return this.chains.get(primary) || [];
  }

  /**
   * Set custom fallback chain for a provider
   *
   * @param primary - Primary provider
   * @param fallbacks - Array of fallback providers (in priority order)
   *
   * @example
   * ```typescript
   * manager.setFallbackChain(ProviderType.CLAUDE, [ProviderType.OPENAI]);
   * ```
   */
  public setFallbackChain(primary: ProviderType, fallbacks: ProviderType[]): void {
    // Validate: don't allow provider to be its own fallback
    const validFallbacks = fallbacks.filter((f) => f !== primary);

    if (validFallbacks.length !== fallbacks.length) {
      console.warn(
        `FallbackChainManager: Removed ${primary} from its own fallback chain`
      );
    }

    this.chains.set(primary, validFallbacks);
    console.log(
      `FallbackChainManager: Set fallback chain for ${primary}: [${validFallbacks.join(', ')}]`
    );
  }

  /**
   * Clear fallback chain for a provider
   *
   * @param primary - Primary provider
   */
  public clearFallbackChain(primary: ProviderType): void {
    this.chains.delete(primary);
    console.log(`FallbackChainManager: Cleared fallback chain for ${primary}`);
  }

  /**
   * Execute operation with fallback support
   *
   * Attempts operation with primary provider. If it fails, tries each
   * fallback provider in order until one succeeds or all fail.
   *
   * @param primary - Primary provider to try first
   * @param operation - Operation to execute (receives provider instance)
   * @param getProvider - Function to get provider instance by type
   * @param options - Fallback options
   * @returns Result of the operation
   * @throws Error if all providers fail
   *
   * @example
   * ```typescript
   * const result = await manager.executeWithFallback(
   *   ProviderType.CLAUDE,
   *   async (provider) => await provider.sendMessage({...}),
   *   (type) => factory.createProvider(type, config)
   * );
   * ```
   */
  public async executeWithFallback<T>(
    primary: ProviderType,
    operation: (provider: IAIProvider) => Promise<T>,
    getProvider: (type: ProviderType) => IAIProvider,
    options?: FallbackOptions
  ): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const chain = [primary, ...this.getFallbackChain(primary)];
    const errors: Array<{ provider: ProviderType; error: Error }> = [];

    // Try each provider in the chain
    for (let i = 0; i < chain.length && i < opts.maxAttempts; i++) {
      const providerType = chain[i];

      // Type guard: ensure providerType is defined
      if (!providerType) {
        continue;
      }

      try {
        if (opts.logAttempts) {
          if (i === 0) {
            console.log(`FallbackChainManager: Attempting ${providerType} (primary)`);
          } else {
            console.log(
              `FallbackChainManager: Attempting ${providerType} (fallback ${i}/${chain.length - 1})`
            );
          }
        }

        // Get provider instance
        const provider = getProvider(providerType);

        // Execute operation
        const result = await operation(provider);

        // Success!
        if (i > 0) {
          // Track fallback success
          this.recordFallback(primary, providerType);

          if (opts.logAttempts) {
            console.log(
              `FallbackChainManager: Success with fallback provider ${providerType}`
            );
          }
        }

        return result;
      } catch (error) {
        const err = error as Error;
        errors.push({ provider: providerType, error: err });

        if (opts.logAttempts) {
          console.warn(
            `FallbackChainManager: ${providerType} failed: ${err.message}`
          );
        }

        // Notify callback if this is a fallback (not the primary)
        if (i > 0 && opts.onFallback) {
          opts.onFallback(primary, providerType, err);
        }

        // If this is not the last provider, wait before trying next
        if (i < chain.length - 1 && opts.delayMs > 0) {
          await this.delay(opts.delayMs);
        }
      }
    }

    // All providers failed
    const errorMessage = this.formatFailureMessage(primary, errors);
    throw new ProviderError(
      ProviderErrorType.OVERLOADED,
      errorMessage,
      {
        retryable: true, // Can retry later when providers are available
        context: {
          primary,
          attemptedProviders: errors.map((e) => e.provider),
          errors: errors.map((e) => e.error.message),
        },
      }
    );
  }

  /**
   * Format failure message when all providers fail
   */
  private formatFailureMessage(
    primary: ProviderType,
    errors: Array<{ provider: ProviderType; error: Error }>
  ): string {
    const errorDetails = errors
      .map((e) => `${e.provider}: ${e.error.message}`)
      .join('; ');

    return `All providers failed. Primary: ${primary}. Errors: ${errorDetails}`;
  }

  /**
   * Record fallback occurrence for statistics
   */
  private recordFallback(from: ProviderType, to: ProviderType): void {
    const key = `${from}->${to}`;
    const count = this.stats.get(key) || 0;
    this.stats.set(key, count + 1);
  }

  /**
   * Get fallback statistics
   *
   * @returns Map of fallback transitions to occurrence counts
   */
  public getStats(): Map<string, number> {
    return new Map(this.stats);
  }

  /**
   * Clear fallback statistics
   */
  public clearStats(): void {
    this.stats.clear();
    console.log('FallbackChainManager: Statistics cleared');
  }

  /**
   * Get all configured chains
   *
   * @returns Map of provider to fallback array
   */
  public getAllChains(): Map<ProviderType, ProviderType[]> {
    return new Map(this.chains);
  }

  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Get singleton instance of FallbackChainManager
 */
export function getFallbackManager(): FallbackChainManager {
  return FallbackChainManager.getInstance();
}

/**
 * Reset fallback manager (for testing)
 */
export function resetFallbackManager(): void {
  FallbackChainManager.resetInstance();
}
