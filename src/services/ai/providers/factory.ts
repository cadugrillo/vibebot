/**
 * AI Provider Factory
 * VBT-165: Factory pattern for creating and managing AI provider instances
 *
 * This factory provides a centralized way to create, register, and cache
 * AI provider instances. It supports dynamic provider registration and
 * ensures efficient resource usage through instance caching.
 */

import { IAIProvider } from './IAIProvider';
import { ProviderType, ProviderConfig } from './types';

/**
 * Provider constructor type
 * A function that creates a new provider instance from configuration
 */
export type ProviderConstructor = (config: ProviderConfig) => IAIProvider;

/**
 * Provider factory error
 */
export class ProviderFactoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderFactoryError';
  }
}

/**
 * Cache key generator options
 */
interface CacheKeyOptions {
  /** Include API key in cache key (creates separate instances per API key) */
  includeApiKey?: boolean;
  /** Include model in cache key (creates separate instances per model) */
  includeModel?: boolean;
}

/**
 * AI Provider Factory
 *
 * Singleton factory for creating and managing AI provider instances.
 *
 * Features:
 * - Singleton pattern: Single factory instance
 * - Provider registration: Register new provider types dynamically
 * - Lazy initialization: Providers created only when first requested
 * - Instance caching: Reuse provider instances to avoid overhead
 * - Multiple instances: Support multiple instances of same provider type
 *
 * @example
 * ```typescript
 * // Get factory instance
 * const factory = AIProviderFactory.getInstance();
 *
 * // Register a provider
 * factory.registerProvider(ProviderType.CLAUDE, (config) => new ClaudeProvider(config));
 *
 * // Create a provider
 * const provider = factory.createProvider(ProviderType.CLAUDE, claudeConfig);
 * ```
 */
export class AIProviderFactory {
  private static instance: AIProviderFactory | null = null;

  /** Registry of provider constructors */
  private providers: Map<ProviderType, ProviderConstructor> = new Map();

  /** Cache of created provider instances */
  private cache: Map<string, IAIProvider> = new Map();

  /** Cache key generation options */
  private cacheKeyOptions: CacheKeyOptions = {
    includeApiKey: true,  // Default: separate instances per API key
    includeModel: false,  // Default: share instances across models
  };

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    // Initialize empty registry
    console.log('AIProviderFactory initialized');
  }

  /**
   * Get singleton instance of the factory
   * @returns The factory instance
   */
  public static getInstance(): AIProviderFactory {
    if (!AIProviderFactory.instance) {
      AIProviderFactory.instance = new AIProviderFactory();
    }
    return AIProviderFactory.instance;
  }

  /**
   * Reset factory instance (useful for testing)
   * Clears all registrations and cached instances
   */
  public static resetInstance(): void {
    if (AIProviderFactory.instance) {
      // Destroy all cached providers
      AIProviderFactory.instance.clearCache();
    }
    AIProviderFactory.instance = null;
  }

  /**
   * Register a provider constructor
   *
   * Allows dynamic registration of new provider types. This enables
   * the factory to create instances of the provider.
   *
   * @param type - Provider type to register
   * @param constructor - Constructor function for the provider
   * @throws ProviderFactoryError if provider type is already registered
   *
   * @example
   * ```typescript
   * factory.registerProvider(ProviderType.CLAUDE, (config) => new ClaudeProvider(config));
   * ```
   */
  public registerProvider(
    type: ProviderType,
    constructor: ProviderConstructor
  ): void {
    if (this.providers.has(type)) {
      console.warn(
        `Provider ${type} is already registered. Overwriting existing registration.`
      );
    }

    this.providers.set(type, constructor);
    console.log(`Provider ${type} registered successfully`);
  }

  /**
   * Unregister a provider
   * Removes provider from registry and clears cached instances
   *
   * @param type - Provider type to unregister
   */
  public unregisterProvider(type: ProviderType): void {
    this.providers.delete(type);

    // Clear cached instances of this provider type
    const keysToDelete: string[] = [];
    for (const [key, provider] of this.cache.entries()) {
      if (provider.getProviderType() === type) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      const provider = this.cache.get(key);
      if (provider) {
        provider.destroy().catch((err) => {
          console.error(`Error destroying provider during unregister: ${err}`);
        });
      }
      this.cache.delete(key);
    });

    console.log(`Provider ${type} unregistered`);
  }

  /**
   * Check if a provider type is registered
   * @param type - Provider type to check
   * @returns True if provider is registered
   */
  public isProviderRegistered(type: ProviderType): boolean {
    return this.providers.has(type);
  }

  /**
   * Get list of registered provider types
   * @returns Array of registered provider types
   */
  public getRegisteredProviders(): ProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Generate cache key for a provider instance
   *
   * Cache key determines when instances are reused vs created new.
   * By default, includes provider type and API key to create separate
   * instances per API key.
   *
   * @param type - Provider type
   * @param config - Provider configuration
   * @returns Cache key string
   */
  private generateCacheKey(type: ProviderType, config: ProviderConfig): string {
    const parts: string[] = [type];

    if (this.cacheKeyOptions.includeApiKey) {
      // Use a hash of the API key to avoid storing full key in cache key
      const apiKeyHash = this.hashString(config.apiKey);
      parts.push(apiKeyHash);
    }

    if (this.cacheKeyOptions.includeModel && config.defaultModel) {
      parts.push(config.defaultModel);
    }

    // Include organization ID if present (for OpenAI)
    if (config.organizationId) {
      parts.push(config.organizationId);
    }

    return parts.join(':');
  }

  /**
   * Simple string hash function
   * Used to create a short hash of API key for cache key
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Configure cache key generation options
   *
   * Controls how cache keys are generated, which affects when
   * provider instances are reused vs created new.
   *
   * @param options - Cache key options
   */
  public configureCaching(options: CacheKeyOptions): void {
    this.cacheKeyOptions = { ...this.cacheKeyOptions, ...options };
    console.log('Cache key options updated:', this.cacheKeyOptions);
  }

  /**
   * Create a provider instance
   *
   * Creates a new provider or returns a cached instance if one exists.
   * Uses lazy initialization - provider is only created when first requested.
   *
   * @param type - Provider type to create
   * @param config - Provider configuration
   * @param forceNew - Force creation of new instance (bypass cache)
   * @returns Provider instance
   * @throws ProviderFactoryError if provider type is not registered
   *
   * @example
   * ```typescript
   * const provider = factory.createProvider(ProviderType.CLAUDE, {
   *   provider: ProviderType.CLAUDE,
   *   apiKey: 'sk-ant-...',
   *   defaultModel: 'claude-sonnet-4-5-20250929',
   *   maxTokens: 4096,
   *   timeout: 60000,
   *   maxRetries: 3
   * });
   * ```
   */
  public createProvider(
    type: ProviderType,
    config: ProviderConfig,
    forceNew: boolean = false
  ): IAIProvider {
    // Check if provider type is registered
    const constructor = this.providers.get(type);
    if (!constructor) {
      throw new ProviderFactoryError(
        `Provider type ${type} is not registered. ` +
        `Available providers: ${this.getRegisteredProviders().join(', ')}`
      );
    }

    // Validate config
    this.validateConfig(config);

    // Generate cache key
    const cacheKey = this.generateCacheKey(type, config);

    // Check cache (unless forceNew is true)
    if (!forceNew && this.cache.has(cacheKey)) {
      const cachedProvider = this.cache.get(cacheKey)!;
      console.log(`Returning cached provider instance for ${type} (key: ${cacheKey})`);
      return cachedProvider;
    }

    // Create new provider instance
    console.log(`Creating new provider instance for ${type} (key: ${cacheKey})`);
    const provider = constructor(config);

    // Verify provider implements the interface correctly
    if (provider.getProviderType() !== type) {
      throw new ProviderFactoryError(
        `Provider constructor returned incorrect type. ` +
        `Expected ${type}, got ${provider.getProviderType()}`
      );
    }

    // Cache the instance
    this.cache.set(cacheKey, provider);

    return provider;
  }

  /**
   * Get a cached provider instance
   *
   * @param type - Provider type
   * @param config - Provider configuration (used to generate cache key)
   * @returns Cached provider instance, or undefined if not cached
   */
  public getCachedProvider(
    type: ProviderType,
    config: ProviderConfig
  ): IAIProvider | undefined {
    const cacheKey = this.generateCacheKey(type, config);
    return this.cache.get(cacheKey);
  }

  /**
   * Check if a provider instance is cached
   *
   * @param type - Provider type
   * @param config - Provider configuration
   * @returns True if provider is cached
   */
  public isCached(type: ProviderType, config: ProviderConfig): boolean {
    const cacheKey = this.generateCacheKey(type, config);
    return this.cache.has(cacheKey);
  }

  /**
   * Get cache statistics
   * Useful for monitoring and debugging
   *
   * @returns Cache statistics
   */
  public getCacheStats(): {
    size: number;
    providers: { type: ProviderType; cacheKey: string }[];
  } {
    const providers = Array.from(this.cache.entries()).map(([key, provider]) => ({
      type: provider.getProviderType(),
      cacheKey: key,
    }));

    return {
      size: this.cache.size,
      providers,
    };
  }

  /**
   * Clear all cached provider instances
   * Destroys all cached providers and clears the cache
   */
  public async clearCache(): Promise<void> {
    console.log(`Clearing provider cache (${this.cache.size} instances)`);

    const destroyPromises: Promise<void>[] = [];

    for (const [key, provider] of this.cache.entries()) {
      console.log(`Destroying cached provider: ${key}`);
      destroyPromises.push(
        provider.destroy().catch((err) => {
          console.error(`Error destroying provider ${key}: ${err}`);
        })
      );
    }

    await Promise.all(destroyPromises);
    this.cache.clear();

    console.log('Provider cache cleared');
  }

  /**
   * Remove a specific provider from cache
   *
   * @param type - Provider type
   * @param config - Provider configuration
   * @returns True if provider was cached and removed
   */
  public async removeCachedProvider(
    type: ProviderType,
    config: ProviderConfig
  ): Promise<boolean> {
    const cacheKey = this.generateCacheKey(type, config);
    const provider = this.cache.get(cacheKey);

    if (!provider) {
      return false;
    }

    console.log(`Removing cached provider: ${cacheKey}`);
    await provider.destroy();
    this.cache.delete(cacheKey);

    return true;
  }

  /**
   * Validate provider configuration
   * Ensures required fields are present and valid
   *
   * @param config - Configuration to validate
   * @throws ProviderFactoryError if configuration is invalid
   */
  private validateConfig(config: ProviderConfig): void {
    if (!config.provider) {
      throw new ProviderFactoryError('Provider type is required in configuration');
    }

    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new ProviderFactoryError('API key is required');
    }

    if (!config.defaultModel || config.defaultModel.trim() === '') {
      throw new ProviderFactoryError('Default model is required');
    }

    if (config.maxTokens <= 0) {
      throw new ProviderFactoryError('maxTokens must be greater than 0');
    }

    if (config.timeout <= 0) {
      throw new ProviderFactoryError('timeout must be greater than 0');
    }

    if (config.maxRetries < 0) {
      throw new ProviderFactoryError('maxRetries must be 0 or greater');
    }
  }

  /**
   * Destroy the factory and all cached providers
   * Should be called on application shutdown
   */
  public async destroy(): Promise<void> {
    console.log('Destroying AIProviderFactory');
    await this.clearCache();
    this.providers.clear();
  }
}

/**
 * Get singleton instance of AIProviderFactory
 * Convenience function for easy access
 *
 * @returns Factory instance
 */
export function getProviderFactory(): AIProviderFactory {
  return AIProviderFactory.getInstance();
}

/**
 * Reset provider factory (for testing)
 */
export function resetProviderFactory(): void {
  AIProviderFactory.resetInstance();
}
