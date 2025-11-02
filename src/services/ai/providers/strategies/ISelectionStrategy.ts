/**
 * Selection Strategy Interface
 * VBT-171: Interface for provider selection strategies
 *
 * Defines contract for different provider selection strategies.
 * Each strategy implements its own logic for choosing a provider.
 */

import { ProviderType, SelectionContext, SelectionStrategyType } from '../types';

/**
 * Selection strategy interface
 *
 * All selection strategies must implement this interface.
 * Strategies receive a list of available providers and a context,
 * then return the best provider according to their logic.
 */
export interface ISelectionStrategy {
  /**
   * Strategy name/type
   */
  readonly name: SelectionStrategyType;

  /**
   * Select a provider based on strategy logic
   *
   * @param availableProviders - List of providers to choose from
   * @param context - Selection context with requirements and preferences
   * @returns Selected provider, or null if no suitable provider found
   *
   * @throws Never - Strategies should return null rather than throw
   */
  select(
    availableProviders: ProviderType[],
    context: SelectionContext
  ): ProviderType | null;

  /**
   * Check if this strategy can handle the given context
   *
   * Optional method to validate if strategy is applicable.
   * Default implementation returns true (strategy always applicable).
   *
   * @param context - Selection context
   * @returns True if strategy can be used with this context
   */
  canHandle?(context: SelectionContext): boolean;

  /**
   * Get strategy priority
   *
   * Optional method to indicate strategy priority when multiple strategies
   * could be used. Higher priority = preferred strategy.
   * Default priority is 0.
   *
   * @returns Priority value (higher = more preferred)
   */
  getPriority?(): number;
}

/**
 * Abstract base class for selection strategies
 *
 * Provides common functionality and default implementations.
 * Strategies can extend this for convenience.
 */
export abstract class BaseSelectionStrategy implements ISelectionStrategy {
  public abstract readonly name: SelectionStrategyType;

  /**
   * Select provider (must be implemented by subclass)
   */
  public abstract select(
    availableProviders: ProviderType[],
    context: SelectionContext
  ): ProviderType | null;

  /**
   * Default implementation: all contexts are acceptable
   */
  public canHandle(_context: SelectionContext): boolean {
    return true;
  }

  /**
   * Default priority: 0 (neutral)
   */
  public getPriority(): number {
    return 0;
  }

  /**
   * Helper: Filter providers by exclusion list
   */
  protected filterExcluded(
    providers: ProviderType[],
    context: SelectionContext
  ): ProviderType[] {
    if (!context.excludeProviders || context.excludeProviders.length === 0) {
      return providers;
    }

    return providers.filter((p) => !context.excludeProviders!.includes(p));
  }

  /**
   * Helper: Check if no providers available
   */
  protected noProvidersAvailable(providers: ProviderType[]): boolean {
    return !providers || providers.length === 0;
  }
}
