/**
 * Select By Capability Strategy
 * VBT-171: Select provider based on required capabilities
 *
 * Selects provider that supports all required capabilities (streaming, vision, etc.)
 */

import {
  ProviderType,
  SelectionContext,
  SelectionStrategyType,
  ModelCapability,
} from '../types';
import { BaseSelectionStrategy } from './ISelectionStrategy';
import { getModelRegistry } from '../model-registry';

/**
 * Capability checker
 * Maps ModelCapability enum to ModelCapabilities interface fields
 */
const CAPABILITY_CHECKERS = {
  [ModelCapability.STREAMING]: (caps: any) => caps.streaming === true,
  [ModelCapability.VISION]: (caps: any) => caps.vision === true,
  [ModelCapability.FUNCTION_CALLING]: (caps: any) => caps.functionCalling === true,
  [ModelCapability.PROMPT_CACHING]: (caps: any) => caps.promptCaching === true,
  [ModelCapability.JSON_MODE]: (caps: any) => caps.jsonMode === true,
};

/**
 * Select By Capability Strategy
 *
 * Selection logic:
 * 1. Filter providers by required capabilities
 * 2. Return first provider that supports all requirements
 * 3. If specific model requested, verify it has capabilities
 *
 * This strategy ensures functional requirements are met.
 */
export class SelectByCapabilityStrategy extends BaseSelectionStrategy {
  public readonly name = SelectionStrategyType.BY_CAPABILITY;

  /**
   * Select provider by required capabilities
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

    // If no capabilities required, any provider works
    if (!context.requiredCapabilities || context.requiredCapabilities.length === 0) {
      console.log('SelectByCapabilityStrategy: No capabilities required');
      return filtered[0] || null; // Return first available
    }

    // Check each provider for capability support
    const registry = getModelRegistry();

    for (const provider of filtered) {
      if (this.providerSupportsCapabilities(provider, context.requiredCapabilities, registry)) {
        console.log(
          `SelectByCapabilityStrategy: ${provider} supports all required capabilities`
        );
        return provider;
      }
    }

    console.warn(
      `SelectByCapabilityStrategy: No provider found with capabilities: ${context.requiredCapabilities.join(', ')}`
    );
    return null;
  }

  /**
   * Check if provider supports all required capabilities
   */
  private providerSupportsCapabilities(
    provider: ProviderType,
    requiredCapabilities: ModelCapability[],
    registry: any
  ): boolean {
    // Get models for this provider
    const models = registry.getModelsForProvider(provider);

    if (models.length === 0) {
      console.warn(`SelectByCapabilityStrategy: No models found for ${provider}`);
      return false;
    }

    // Check if ANY model from this provider has all required capabilities
    // This is a provider-level check
    for (const model of models) {
      if (this.modelSupportsCapabilities(model.capabilities, requiredCapabilities)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a specific model supports all required capabilities
   */
  private modelSupportsCapabilities(
    modelCapabilities: any,
    requiredCapabilities: ModelCapability[]
  ): boolean {
    for (const capability of requiredCapabilities) {
      const checker = CAPABILITY_CHECKERS[capability];
      if (!checker) {
        console.warn(`SelectByCapabilityStrategy: Unknown capability ${capability}`);
        return false;
      }

      if (!checker(modelCapabilities)) {
        return false; // Missing required capability
      }
    }

    return true; // All capabilities present
  }

  /**
   * This strategy can only handle contexts with capability requirements
   */
  public override canHandle(context: SelectionContext): boolean {
    return !!(
      context.requiredCapabilities &&
      context.requiredCapabilities.length > 0
    );
  }

  /**
   * High priority - functional requirements are important
   */
  public override getPriority(): number {
    return 80;
  }
}
