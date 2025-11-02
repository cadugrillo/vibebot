/**
 * Model Registry
 * VBT-171: Central registry for model-to-provider mapping
 *
 * Provides automatic detection of which provider owns a given model ID,
 * enabling seamless provider selection based on requested model.
 */

import { ProviderType, ModelConfig } from './types';
import { getAllClaudeModels } from './claude';

/**
 * Model registry error
 */
export class ModelRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelRegistryError';
  }
}

/**
 * Model Registry
 *
 * Singleton registry that maintains mapping between model IDs and their providers.
 * Supports exact matching and pattern-based matching for flexibility.
 *
 * Features:
 * - Exact model ID lookup
 * - Pattern-based matching (e.g., "claude-*" → CLAUDE)
 * - Model enumeration by provider
 * - Automatic registration from model configurations
 *
 * @example
 * ```typescript
 * const registry = ModelRegistry.getInstance();
 * const provider = registry.getProviderForModel('claude-sonnet-4-5-20250929');
 * // Returns: ProviderType.CLAUDE
 * ```
 */
export class ModelRegistry {
  private static instance: ModelRegistry | null = null;

  /** Map of model ID to provider type */
  private modelMap: Map<string, ProviderType> = new Map();

  /** Map of provider to available models */
  private providerModels: Map<ProviderType, ModelConfig[]> = new Map();

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    console.log('ModelRegistry initialized');
    this.registerAllModels();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    ModelRegistry.instance = null;
  }

  /**
   * Register all known models from all providers
   */
  private registerAllModels(): void {
    // Register Claude models
    this.registerClaudeModels();

    // Register OpenAI models (when implemented)
    // this.registerOpenAIModels();

    console.log(`ModelRegistry: Registered ${this.modelMap.size} models`);
  }

  /**
   * Register Claude models
   */
  private registerClaudeModels(): void {
    const claudeModels = getAllClaudeModels();

    for (const model of claudeModels) {
      this.modelMap.set(model.id, ProviderType.CLAUDE);
    }

    this.providerModels.set(ProviderType.CLAUDE, claudeModels);

    console.log(`ModelRegistry: Registered ${claudeModels.length} Claude models`);
  }

  /**
   * Register OpenAI models (placeholder for VBT-169)
   */
  // Commented out until VBT-169 implementation
  // private registerOpenAIModels(): void {
  //   // TODO: Implement when OpenAI provider is ready (VBT-169)
  //   // const openaiModels = getAllOpenAIModels();
  //   // for (const model of openaiModels) {
  //   //   this.modelMap.set(model.id, ProviderType.OPENAI);
  //   // }
  //   // this.providerModels.set(ProviderType.OPENAI, openaiModels);
  // }

  /**
   * Get provider type for a given model ID
   *
   * Attempts exact match first, then falls back to pattern matching
   * for flexibility with model version strings.
   *
   * @param modelId - Model identifier
   * @returns Provider type, or null if model is unknown
   *
   * @example
   * ```typescript
   * registry.getProviderForModel('claude-sonnet-4-5-20250929'); // → CLAUDE
   * registry.getProviderForModel('gpt-4-turbo'); // → OPENAI
   * registry.getProviderForModel('unknown-model'); // → null
   * ```
   */
  public getProviderForModel(modelId: string): ProviderType | null {
    if (!modelId || modelId.trim() === '') {
      return null;
    }

    // Try exact match first
    const exactMatch = this.modelMap.get(modelId);
    if (exactMatch) {
      return exactMatch;
    }

    // Try pattern matching
    return this.matchModelPattern(modelId);
  }

  /**
   * Pattern-based model matching
   *
   * Useful for matching model IDs with version strings or variants
   *
   * @param modelId - Model identifier
   * @returns Matched provider type, or null
   */
  private matchModelPattern(modelId: string): ProviderType | null {
    const lowerModelId = modelId.toLowerCase();

    // Claude patterns
    if (
      lowerModelId.startsWith('claude-') ||
      lowerModelId.includes('anthropic')
    ) {
      return ProviderType.CLAUDE;
    }

    // OpenAI patterns
    if (
      lowerModelId.startsWith('gpt-') ||
      lowerModelId.startsWith('o1-') ||
      lowerModelId.startsWith('text-') ||
      lowerModelId.startsWith('davinci') ||
      lowerModelId.startsWith('curie') ||
      lowerModelId.startsWith('babbage') ||
      lowerModelId.startsWith('ada')
    ) {
      return ProviderType.OPENAI;
    }

    // No match found
    return null;
  }

  /**
   * Get all models for a specific provider
   *
   * @param provider - Provider type
   * @returns Array of model configurations
   *
   * @example
   * ```typescript
   * const claudeModels = registry.getModelsForProvider(ProviderType.CLAUDE);
   * console.log(`Claude has ${claudeModels.length} models`);
   * ```
   */
  public getModelsForProvider(provider: ProviderType): ModelConfig[] {
    return this.providerModels.get(provider) || [];
  }

  /**
   * Get model configuration by ID
   *
   * @param modelId - Model identifier
   * @returns Model configuration, or null if not found
   */
  public getModelConfig(modelId: string): ModelConfig | null {
    const provider = this.getProviderForModel(modelId);
    if (!provider) {
      return null;
    }

    const models = this.getModelsForProvider(provider);
    return models.find((m) => m.id === modelId) || null;
  }

  /**
   * Check if a model ID is valid (registered)
   *
   * @param modelId - Model identifier
   * @returns True if model is registered
   */
  public isValidModel(modelId: string): boolean {
    return this.getProviderForModel(modelId) !== null;
  }

  /**
   * Get all registered model IDs
   *
   * @returns Array of all registered model IDs
   */
  public getAllModelIds(): string[] {
    return Array.from(this.modelMap.keys());
  }

  /**
   * Get all registered providers
   *
   * @returns Array of provider types that have models registered
   */
  public getRegisteredProviders(): ProviderType[] {
    return Array.from(this.providerModels.keys());
  }

  /**
   * Register a custom model manually
   *
   * Useful for testing or custom provider implementations
   *
   * @param modelId - Model identifier
   * @param provider - Provider type
   */
  public registerModel(modelId: string, provider: ProviderType): void {
    this.modelMap.set(modelId, provider);
    console.log(`ModelRegistry: Manually registered ${modelId} → ${provider}`);
  }

  /**
   * Unregister a model
   *
   * @param modelId - Model identifier to unregister
   * @returns True if model was registered and removed
   */
  public unregisterModel(modelId: string): boolean {
    const existed = this.modelMap.has(modelId);
    this.modelMap.delete(modelId);
    return existed;
  }

  /**
   * Clear all registrations
   * Useful for testing
   */
  public clearAll(): void {
    this.modelMap.clear();
    this.providerModels.clear();
    console.log('ModelRegistry: All registrations cleared');
  }

  /**
   * Get registry statistics
   *
   * @returns Statistics about registered models
   */
  public getStats(): {
    totalModels: number;
    providerCounts: Record<string, number>;
    providers: ProviderType[];
  } {
    const providerCounts: Record<string, number> = {};

    for (const provider of this.providerModels.keys()) {
      providerCounts[provider] = this.providerModels.get(provider)?.length || 0;
    }

    return {
      totalModels: this.modelMap.size,
      providerCounts,
      providers: this.getRegisteredProviders(),
    };
  }
}

/**
 * Get singleton instance of ModelRegistry
 * Convenience function
 *
 * @returns Registry instance
 */
export function getModelRegistry(): ModelRegistry {
  return ModelRegistry.getInstance();
}

/**
 * Reset model registry (for testing)
 */
export function resetModelRegistry(): void {
  ModelRegistry.resetInstance();
}
