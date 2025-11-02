/**
 * Select By Name Strategy
 * VBT-171: Direct provider selection by explicit name
 *
 * Selects provider based on explicit preference or model name.
 * This is the highest priority strategy - if user explicitly requests
 * a provider or model, that choice should be honored.
 */

import { ProviderType, SelectionContext, SelectionStrategyType } from '../types';
import { BaseSelectionStrategy } from './ISelectionStrategy';
import { getModelRegistry } from '../model-registry';

/**
 * Select By Name Strategy
 *
 * Selection logic:
 * 1. If context.preferredProvider is set, use it (if available)
 * 2. If context.modelId is set, lookup provider for that model
 * 3. Otherwise, return null (no explicit preference)
 *
 * This strategy has the highest priority since it represents
 * explicit user choice.
 */
export class SelectByNameStrategy extends BaseSelectionStrategy {
  public readonly name = SelectionStrategyType.BY_NAME;

  /**
   * Select provider by explicit name or model
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

    // Priority 1: Explicit provider preference
    if (context.preferredProvider) {
      if (filtered.includes(context.preferredProvider)) {
        console.log(
          `SelectByNameStrategy: Using preferred provider ${context.preferredProvider}`
        );
        return context.preferredProvider;
      } else {
        console.warn(
          `SelectByNameStrategy: Preferred provider ${context.preferredProvider} not available`
        );
      }
    }

    // Priority 2: Model ID lookup
    if (context.modelId) {
      const registry = getModelRegistry();
      const providerForModel = registry.getProviderForModel(context.modelId);

      if (providerForModel && filtered.includes(providerForModel)) {
        console.log(
          `SelectByNameStrategy: Model ${context.modelId} maps to ${providerForModel}`
        );
        return providerForModel;
      } else if (providerForModel) {
        console.warn(
          `SelectByNameStrategy: Provider ${providerForModel} for model ${context.modelId} not available`
        );
      } else {
        console.warn(
          `SelectByNameStrategy: Unknown model ${context.modelId}`
        );
      }
    }

    // No explicit preference found
    return null;
  }

  /**
   * This strategy can only handle contexts with explicit preferences
   */
  public override canHandle(context: SelectionContext): boolean {
    return !!(context.preferredProvider || context.modelId);
  }

  /**
   * Highest priority - explicit user choice should be honored first
   */
  public override getPriority(): number {
    return 100;
  }
}
