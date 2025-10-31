/**
 * Circuit Breaker Utilities
 * Provider-agnostic circuit breaker pattern implementation
 *
 * @example
 * ```typescript
 * import { CircuitBreakerManager } from './utils/circuit-breaker';
 *
 * const circuitBreaker = new CircuitBreakerManager();
 *
 * const result = await circuitBreaker.execute(
 *   'claude-stream',
 *   () => provider.streamMessage(params),
 *   { failureThreshold: 5, timeout: 60000 }
 * );
 * ```
 */

// Main classes
export { CircuitBreaker } from './CircuitBreaker';
export { CircuitBreakerManager } from './CircuitBreakerManager';

// Configuration and types
export {
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerStats,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from './CircuitBreakerConfig';
