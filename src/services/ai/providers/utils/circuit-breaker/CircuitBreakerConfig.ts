/**
 * Circuit Breaker Configuration
 * Provider-agnostic circuit breaker settings
 */

/**
 * Circuit breaker states
 */
export enum CircuitState {
  /**
   * Normal operation - requests allowed
   */
  CLOSED = 'CLOSED',

  /**
   * Too many failures - requests blocked
   */
  OPEN = 'OPEN',

  /**
   * Testing if service recovered - limited requests allowed
   */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Number of failures before opening circuit
   * @default 5
   */
  failureThreshold: number;

  /**
   * Number of successes to close circuit from half-open
   * @default 2
   */
  successThreshold: number;

  /**
   * Time in milliseconds before trying again (half-open)
   * @default 60000 (60 seconds)
   */
  timeout: number;

  /**
   * Time window in milliseconds for failure counting
   * @default 120000 (2 minutes)
   */
  monitoringPeriod: number;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,      // Open after 5 failures
  successThreshold: 2,      // Close after 2 successes in half-open
  timeout: 60000,           // Wait 60 seconds before retry
  monitoringPeriod: 120000, // Count failures in 2-minute window
};

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  /**
   * Current circuit state
   */
  state: CircuitState;

  /**
   * Total failures in monitoring period
   */
  failures: number;

  /**
   * Total successes
   */
  successes: number;

  /**
   * Consecutive failures (resets on success)
   */
  consecutiveFailures: number;

  /**
   * Consecutive successes (resets on failure)
   */
  consecutiveSuccesses: number;

  /**
   * Timestamp of last failure
   */
  lastFailureTime?: Date;

  /**
   * Timestamp of last success
   */
  lastSuccessTime?: Date;

  /**
   * When the circuit will attempt to reset (only when OPEN)
   */
  nextAttemptTime?: Date;

  /**
   * Total requests processed
   */
  totalRequests: number;

  /**
   * Total failures (all time)
   */
  totalFailures: number;

  /**
   * Total successes (all time)
   */
  totalSuccesses: number;
}
