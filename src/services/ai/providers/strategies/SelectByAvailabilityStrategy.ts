/**
 * Select By Availability Strategy
 * VBT-171: Select provider based on availability and health
 *
 * Selects provider based on health status and circuit breaker state.
 * Avoids providers that are currently failing or rate-limited.
 */

import {
  ProviderType,
  SelectionContext,
  SelectionStrategyType,
} from '../types';
import { BaseSelectionStrategy } from './ISelectionStrategy';
import { CircuitBreakerManager } from '../utils/circuit-breaker/CircuitBreakerManager';
import { CircuitState } from '../utils/circuit-breaker/CircuitBreakerConfig';

/**
 * Select By Availability Strategy
 *
 * Selection logic:
 * 1. Check circuit breaker state for each provider
 * 2. Filter out providers with OPEN circuit (currently failing)
 * 3. Prefer providers with CLOSED circuit (healthy)
 * 4. Accept HALF_OPEN as last resort (testing recovery)
 *
 * This strategy ensures we don't send requests to failing providers.
 */
export class SelectByAvailabilityStrategy extends BaseSelectionStrategy {
  public readonly name = SelectionStrategyType.BY_AVAILABILITY;

  private circuitBreakerManager: CircuitBreakerManager;

  constructor(circuitBreakerManager?: CircuitBreakerManager) {
    super();
    // Use provided manager or create new instance
    this.circuitBreakerManager = circuitBreakerManager || new CircuitBreakerManager();
  }

  /**
   * Select provider by availability/health
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

    // Categorize providers by health status
    const healthy: ProviderType[] = [];
    const recovering: ProviderType[] = [];
    const unhealthy: ProviderType[] = [];

    for (const provider of filtered) {
      const state = this.getProviderHealth(provider);

      switch (state) {
        case CircuitState.CLOSED:
          healthy.push(provider);
          break;
        case CircuitState.HALF_OPEN:
          recovering.push(provider);
          break;
        case CircuitState.OPEN:
          unhealthy.push(provider);
          break;
      }
    }

    // Prefer healthy providers
    if (healthy.length > 0) {
      const selected = healthy[0];
      if (selected) {
        console.log(`SelectByAvailabilityStrategy: Selected healthy provider ${selected}`);
        return selected;
      }
    }

    // Fall back to recovering providers
    if (recovering.length > 0) {
      const selected = recovering[0];
      if (selected) {
        console.log(
          `SelectByAvailabilityStrategy: Selected recovering provider ${selected} (HALF_OPEN)`
        );
        return selected;
      }
    }

    // All providers are unhealthy - return first one anyway
    // The circuit breaker will handle the failure gracefully
    if (unhealthy.length > 0) {
      const selected = unhealthy[0];
      if (selected) {
        console.warn(
          `SelectByAvailabilityStrategy: All providers unhealthy, selecting ${selected} anyway`
        );
        return selected;
      }
    }

    return null;
  }

  /**
   * Get health status for a provider
   *
   * @param provider - Provider type
   * @returns Circuit breaker state: CLOSED (healthy), HALF_OPEN (recovering), OPEN (unhealthy)
   */
  private getProviderHealth(provider: ProviderType): CircuitState {
    // Use provider name as circuit breaker key
    const circuitKey = `provider:${provider}`;

    // Get circuit breaker for this provider (creates if doesn't exist)
    const breaker = this.circuitBreakerManager.getBreaker(circuitKey);

    // Get current state
    return breaker.getState();
  }

  /**
   * This strategy can handle any context
   * Availability checking is always applicable
   */
  public override canHandle(_context: SelectionContext): boolean {
    return true;
  }

  /**
   * Medium-high priority - availability is important for reliability
   */
  public override getPriority(): number {
    return 70;
  }
}
