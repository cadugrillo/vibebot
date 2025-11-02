/**
 * Select By Cost Strategy
 * VBT-171: Select provider based on cost optimization
 *
 * Selects the most cost-effective provider for the given request.
 * Considers model pricing and estimated token usage.
 */

import {
  ProviderType,
  SelectionContext,
  SelectionStrategyType,
} from '../types';
import { BaseSelectionStrategy } from './ISelectionStrategy';
import { getModelRegistry } from '../model-registry';

/**
 * Default token estimates for cost calculation
 */
const DEFAULT_ESTIMATED_TOKENS = {
  input: 500,   // Average input prompt length
  output: 500,  // Average response length
};

/**
 * Select By Cost Strategy
 *
 * Selection logic:
 * 1. Calculate estimated cost for each provider's default/cheapest model
 * 2. Respect maxCostPerToken constraint if specified
 * 3. Return provider with lowest estimated cost
 *
 * Cost calculation uses:
 * - Model pricing per 1M tokens
 * - Estimated input/output token counts
 * - Tier preferences (ECONOMY models preferred if no specific requirement)
 */
export class SelectByCostStrategy extends BaseSelectionStrategy {
  public readonly name = SelectionStrategyType.BY_COST;

  /**
   * Select provider by lowest cost
   */
  public select(
    availableProviders: ProviderType[],
    context: SelectionContext
  ): ProviderType | null {
    if (this.noProvidersAvailable(availableProviders)) {
      return null;
    }

    // Filter excluded providers
    const filtered = this.filterExcluded(availableProviders, context);
    if (filtered.length === 0) {
      return null;
    }

    const registry = getModelRegistry();
    let cheapestProvider: ProviderType | null = null;
    let lowestCost = Infinity;

    // Calculate cost for each provider
    for (const provider of filtered) {
      const cost = this.estimateProviderCost(provider, context, registry);

      if (cost === null) {
        console.warn(`SelectByCostStrategy: Could not estimate cost for ${provider}`);
        continue;
      }

      // Check max cost constraint
      if (context.maxCostPerToken) {
        const costPerToken = cost / (context.estimatedTokens || DEFAULT_ESTIMATED_TOKENS.input + DEFAULT_ESTIMATED_TOKENS.output);
        if (costPerToken > context.maxCostPerToken) {
          console.log(
            `SelectByCostStrategy: ${provider} exceeds max cost per token (${costPerToken} > ${context.maxCostPerToken})`
          );
          continue;
        }
      }

      if (cost < lowestCost) {
        lowestCost = cost;
        cheapestProvider = provider;
      }
    }

    if (cheapestProvider) {
      console.log(
        `SelectByCostStrategy: Selected ${cheapestProvider} with estimated cost $${lowestCost.toFixed(6)}`
      );
    } else {
      console.warn('SelectByCostStrategy: No suitable provider found within cost constraints');
    }

    return cheapestProvider;
  }

  /**
   * Estimate cost for a provider
   *
   * Uses the cheapest available model from the provider
   * (typically ECONOMY tier, or lowest-priced STANDARD)
   */
  private estimateProviderCost(
    provider: ProviderType,
    context: SelectionContext,
    registry: any
  ): number | null {
    const models = registry.getModelsForProvider(provider);

    if (models.length === 0) {
      return null;
    }

    // Find cheapest model for this provider
    let cheapestModel = models[0];
    let lowestModelCost = this.calculateModelCost(cheapestModel, context);

    for (let i = 1; i < models.length; i++) {
      const model = models[i];
      const cost = this.calculateModelCost(model, context);

      if (cost < lowestModelCost) {
        lowestModelCost = cost;
        cheapestModel = model;
      }
    }

    return lowestModelCost;
  }

  /**
   * Calculate cost for a specific model
   *
   * @param model - Model configuration
   * @param context - Selection context with token estimates
   * @returns Estimated cost in USD
   */
  private calculateModelCost(model: any, context: SelectionContext): number {
    const inputTokens = context.estimatedTokens || DEFAULT_ESTIMATED_TOKENS.input;
    const outputTokens = DEFAULT_ESTIMATED_TOKENS.output; // Assume equal output

    // Cost per 1M tokens, so divide by 1M
    const inputCost = (inputTokens / 1_000_000) * model.pricing.input;
    const outputCost = (outputTokens / 1_000_000) * model.pricing.output;

    return inputCost + outputCost;
  }

  /**
   * This strategy can handle any context
   * Cost optimization is always applicable
   */
  public override canHandle(_context: SelectionContext): boolean {
    return true;
  }

  /**
   * Medium priority - cost is important but not critical
   */
  public override getPriority(): number {
    return 50;
  }
}
