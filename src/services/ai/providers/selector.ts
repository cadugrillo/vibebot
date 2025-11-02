/**
 * Provider Selector
 * VBT-171: Main orchestrator for provider selection logic
 *
 * Coordinates all selection components to choose the best provider
 * for a given request based on multiple factors.
 */

import { ProviderType, SelectionContext, SelectionStrategyType } from './types';
import { AIProviderFactory } from './factory';
import { ModelRegistry } from './model-registry';
import { ProviderPreferenceManager } from './preferences';
import {
  ISelectionStrategy,
  SelectByNameStrategy,
  SelectByCapabilityStrategy,
  SelectByCostStrategy,
  SelectByAvailabilityStrategy,
} from './strategies';

/**
 * Provider selector error
 */
export class ProviderSelectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderSelectorError';
  }
}

/**
 * Provider Selector
 *
 * Main orchestrator that uses multiple strategies and data sources
 * to select the optimal provider for a given request.
 *
 * Selection process:
 * 1. Load user/conversation preferences
 * 2. Get available providers from factory
 * 3. Apply selection strategy (or auto-select best)
 * 4. Return selected provider type
 *
 * Features:
 * - Multiple selection strategies (name, capability, cost, availability)
 * - Automatic strategy selection based on context
 * - User/conversation preference integration
 * - Model-to-provider mapping
 * - Fallback to default when no match found
 *
 * @example
 * ```typescript
 * const selector = new ProviderSelector();
 *
 * // Select by explicit model ID
 * const provider = selector.selectProvider({
 *   modelId: 'claude-sonnet-4-5-20250929'
 * });
 * // Returns: ProviderType.CLAUDE
 *
 * // Select by capability requirements
 * const provider = selector.selectProvider({
 *   requiredCapabilities: [ModelCapability.VISION],
 *   strategy: SelectionStrategyType.BY_CAPABILITY
 * });
 *
 * // Select cheapest provider
 * const provider = selector.selectProvider({
 *   strategy: SelectionStrategyType.BY_COST,
 *   estimatedTokens: 1000
 * });
 * ```
 */
export class ProviderSelector {
  private static instance: ProviderSelector | null = null;

  /** Selection strategies (sorted by priority) */
  private strategies: Map<SelectionStrategyType, ISelectionStrategy> = new Map();

  /** Provider factory for getting available providers */
  private factory: AIProviderFactory;

  /** Model registry for model-to-provider mapping */
  private registry: ModelRegistry;

  /** Preference manager for user/conversation preferences */
  private preferenceManager: ProviderPreferenceManager;

  /**
   * Constructor
   * Initializes all selection strategies
   */
  constructor() {
    // Get shared instances
    this.factory = AIProviderFactory.getInstance();
    this.registry = ModelRegistry.getInstance();
    this.preferenceManager = ProviderPreferenceManager.getInstance();

    // Register strategies
    this.registerStrategies();

    console.log('ProviderSelector initialized');
    console.log(`  Registered ${this.strategies.size} selection strategies`);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ProviderSelector {
    if (!ProviderSelector.instance) {
      ProviderSelector.instance = new ProviderSelector();
    }
    return ProviderSelector.instance;
  }

  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    ProviderSelector.instance = null;
  }

  /**
   * Register all selection strategies
   */
  private registerStrategies(): void {
    // Create strategy instances
    const strategies: ISelectionStrategy[] = [
      new SelectByNameStrategy(),
      new SelectByCapabilityStrategy(),
      new SelectByCostStrategy(),
      new SelectByAvailabilityStrategy(),
    ];

    // Register each strategy
    for (const strategy of strategies) {
      this.strategies.set(strategy.name, strategy);
    }
  }

  /**
   * Select provider based on context
   *
   * Main selection method. Analyzes context and chooses appropriate provider.
   *
   * @param context - Selection context with requirements and preferences
   * @returns Selected provider type
   * @throws ProviderSelectorError if no suitable provider found
   */
  public selectProvider(context: SelectionContext): ProviderType {
    // Step 1: Enrich context with user/conversation preferences
    const enrichedContext = this.enrichContext(context);

    // Step 2: Get available providers from factory
    const availableProviders = this.factory.getRegisteredProviders();

    if (availableProviders.length === 0) {
      throw new ProviderSelectorError(
        'No providers registered in factory. Register at least one provider.'
      );
    }

    // Step 3: Select strategy and execute
    let selectedProvider: ProviderType | null = null;

    if (enrichedContext.strategy) {
      // Use explicitly specified strategy
      selectedProvider = this.selectByStrategy(
        enrichedContext.strategy,
        availableProviders,
        enrichedContext
      );
    } else {
      // Auto-select using priority order
      selectedProvider = this.autoSelect(availableProviders, enrichedContext);
    }

    // Step 4: Validate and return
    if (!selectedProvider) {
      // No strategy selected a provider, use fallback
      selectedProvider = this.selectFallback(availableProviders, enrichedContext);
    }

    if (!selectedProvider) {
      throw new ProviderSelectorError(
        'Failed to select provider: no suitable provider found'
      );
    }

    console.log(`ProviderSelector: Selected ${selectedProvider}`);
    return selectedProvider;
  }

  /**
   * Enrich context with user/conversation preferences
   */
  private enrichContext(context: SelectionContext): SelectionContext {
    const enriched = { ...context };

    // Load user/conversation preferences if available
    if (enriched.userId) {
      const preferredProvider = this.preferenceManager.getPreferredProvider(
        enriched.userId,
        enriched.conversationId
      );

      const preferredModel = this.preferenceManager.getPreferredModel(
        enriched.userId,
        enriched.conversationId
      );

      const maxCost = this.preferenceManager.getMaxCostPerMessage(
        enriched.userId,
        enriched.conversationId
      );

      // Only set if not already specified in context (context overrides)
      if (!enriched.preferredProvider && preferredProvider) {
        enriched.preferredProvider = preferredProvider;
      }

      if (!enriched.modelId && preferredModel) {
        enriched.modelId = preferredModel;
      }

      if (!enriched.maxCostPerToken && maxCost) {
        // Convert max cost per message to max cost per token (rough estimate)
        enriched.maxCostPerToken = maxCost / 1000; // Assume ~1000 tokens per message
      }
    }

    return enriched;
  }

  /**
   * Select provider using a specific strategy
   */
  private selectByStrategy(
    strategyType: SelectionStrategyType,
    availableProviders: ProviderType[],
    context: SelectionContext
  ): ProviderType | null {
    const strategy = this.strategies.get(strategyType);

    if (!strategy) {
      console.warn(`ProviderSelector: Unknown strategy ${strategyType}`);
      return null;
    }

    console.log(`ProviderSelector: Using strategy ${strategyType}`);
    return strategy.select(availableProviders, context);
  }

  /**
   * Auto-select provider using priority-ordered strategies
   *
   * Tries each strategy in priority order until one returns a provider
   */
  private autoSelect(
    availableProviders: ProviderType[],
    context: SelectionContext
  ): ProviderType | null {
    console.log('ProviderSelector: Auto-selecting provider (trying all strategies)');

    // Get strategies sorted by priority (descending)
    const sortedStrategies = Array.from(this.strategies.values()).sort(
      (a, b) => (b.getPriority?.() || 0) - (a.getPriority?.() || 0)
    );

    // Try each strategy in order
    for (const strategy of sortedStrategies) {
      // Check if strategy can handle this context
      if (strategy.canHandle && !strategy.canHandle(context)) {
        continue;
      }

      console.log(`  Trying strategy: ${strategy.name} (priority: ${strategy.getPriority?.() || 0})`);

      const result = strategy.select(availableProviders, context);

      if (result) {
        console.log(`  ✓ Strategy ${strategy.name} selected: ${result}`);
        return result;
      }

      console.log(`  ✗ Strategy ${strategy.name} returned null`);
    }

    console.log('  No strategy succeeded');
    return null;
  }

  /**
   * Select fallback provider
   *
   * Used when no strategy selected a provider.
   * Returns first available provider or system default.
   */
  private selectFallback(
    availableProviders: ProviderType[],
    _context: SelectionContext
  ): ProviderType | null {
    console.log('ProviderSelector: Using fallback selection');

    // Try system default from preference manager
    const systemDefault = this.preferenceManager.getSystemDefault();
    if (availableProviders.includes(systemDefault)) {
      console.log(`  Using system default: ${systemDefault}`);
      return systemDefault;
    }

    // Fall back to first available provider
    if (availableProviders.length > 0) {
      const fallback = availableProviders[0];
      if (fallback) {
        console.log(`  Using first available provider: ${fallback}`);
        return fallback;
      }
    }

    return null;
  }

  /**
   * Get provider for a specific model ID
   *
   * Convenience method for model-to-provider lookup
   *
   * @param modelId - Model identifier
   * @returns Provider type, or null if model unknown
   */
  public getProviderForModel(modelId: string): ProviderType | null {
    return this.registry.getProviderForModel(modelId);
  }

  /**
   * Get recommended provider for a user
   *
   * Convenience method that considers user preferences
   *
   * @param userId - User ID
   * @param conversationId - Optional conversation ID
   * @returns Recommended provider type
   */
  public getRecommendedProvider(
    userId: string,
    conversationId?: string
  ): ProviderType {
    return this.selectProvider({
      userId,
      conversationId,
      strategy: SelectionStrategyType.AUTO,
    });
  }

  /**
   * Get cheapest available provider
   *
   * Convenience method for cost optimization
   *
   * @param estimatedTokens - Estimated token count
   * @returns Cheapest provider type
   */
  public getCheapestProvider(estimatedTokens?: number): ProviderType {
    return this.selectProvider({
      strategy: SelectionStrategyType.BY_COST,
      estimatedTokens,
    });
  }

  /**
   * Get healthiest (most available) provider
   *
   * Convenience method for reliability
   *
   * @returns Healthiest provider type
   */
  public getHealthiestProvider(): ProviderType {
    return this.selectProvider({
      strategy: SelectionStrategyType.BY_AVAILABILITY,
    });
  }

  /**
   * Get registered strategies
   *
   * @returns Array of strategy types
   */
  public getStrategies(): SelectionStrategyType[] {
    return Array.from(this.strategies.keys());
  }
}

/**
 * Get singleton instance of ProviderSelector
 */
export function getProviderSelector(): ProviderSelector {
  return ProviderSelector.getInstance();
}

/**
 * Reset provider selector (for testing)
 */
export function resetProviderSelector(): void {
  ProviderSelector.resetInstance();
}
