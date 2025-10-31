/**
 * Circuit Breaker
 * Prevents cascading failures by stopping requests to a failing service
 *
 * The circuit breaker has three states:
 * - CLOSED: Normal operation, all requests allowed
 * - OPEN: Too many failures, all requests blocked
 * - HALF_OPEN: Testing recovery, limited requests allowed
 */

import { ProviderError, ProviderErrorType } from '../../errors';
import {
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerStats,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from './CircuitBreakerConfig';

/**
 * Circuit Breaker class
 * Implements the circuit breaker pattern to prevent repeated failures
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private consecutiveFailures: number = 0;
  private consecutiveSuccesses: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private failureTimestamps: number[] = [];

  private config: CircuitBreakerConfig;

  /**
   * Create a new circuit breaker
   *
   * @param name - Unique name for this circuit breaker (for logging)
   * @param config - Circuit breaker configuration (optional)
   */
  constructor(
    private readonly name: string,
    config?: Partial<CircuitBreakerConfig>
  ) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };

    console.log(`CircuitBreaker "${this.name}" initialized`);
    console.log(`  Failure threshold: ${this.config.failureThreshold}`);
    console.log(`  Success threshold: ${this.config.successThreshold}`);
    console.log(`  Timeout: ${this.config.timeout}ms`);
    console.log(`  Monitoring period: ${this.config.monitoringPeriod}ms`);
  }

  /**
   * Execute a function with circuit breaker protection
   *
   * @param fn - Function to execute
   * @returns Result of the function
   * @throws ProviderError if circuit is open
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        console.log(`🔄 Circuit breaker "${this.name}": Entering HALF_OPEN state`);
        this.state = CircuitState.HALF_OPEN;
      } else {
        const waitTime = this.nextAttemptTime
          ? Math.ceil((this.nextAttemptTime.getTime() - Date.now()) / 1000)
          : Math.ceil(this.config.timeout / 1000);

        throw new ProviderError(
          ProviderErrorType.OVERLOADED,
          `Circuit breaker "${this.name}" is OPEN. ` +
            `Too many failures detected. Please try again in ${waitTime} seconds.`,
          {
            retryable: false,
            statusCode: 503,
            context: {
              circuitBreaker: this.name,
              state: this.state,
              consecutiveFailures: this.consecutiveFailures,
              nextAttemptTime: this.nextAttemptTime,
            },
          }
        );
      }
    }

    this.totalRequests++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record a successful execution
   */
  private onSuccess(): void {
    this.successes++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = new Date();
    this.totalSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        console.log(
          `✅ Circuit breaker "${this.name}": Closing circuit (service recovered)`
        );
        this.close();
      }
    }
  }

  /**
   * Record a failed execution
   */
  private onFailure(): void {
    this.failures++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = new Date();
    this.totalFailures++;

    // Add timestamp to failure window
    const now = Date.now();
    this.failureTimestamps.push(now);

    // Remove old timestamps outside monitoring period
    this.failureTimestamps = this.failureTimestamps.filter(
      (timestamp) => now - timestamp < this.config.monitoringPeriod
    );

    // Check if we should open the circuit
    if (
      this.state === CircuitState.HALF_OPEN ||
      this.failureTimestamps.length >= this.config.failureThreshold
    ) {
      this.open();
    }
  }

  /**
   * Open the circuit (block requests)
   */
  private open(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = new Date(Date.now() + this.config.timeout);

    console.error(`🔴 Circuit breaker "${this.name}": Circuit OPENED`);
    console.error(`   Consecutive failures: ${this.consecutiveFailures}`);
    console.error(`   Failures in window: ${this.failureTimestamps.length}`);
    console.error(`   Next attempt at: ${this.nextAttemptTime.toLocaleTimeString()}`);
  }

  /**
   * Close the circuit (resume normal operation)
   */
  private close(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.failureTimestamps = [];
    this.nextAttemptTime = undefined;
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) {
      return true;
    }
    return Date.now() >= this.nextAttemptTime.getTime();
  }

  /**
   * Get current circuit breaker state
   */
  public getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  public getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Reset the circuit breaker to closed state
   * Useful for testing or manual recovery
   */
  public reset(): void {
    console.log(`🔄 Circuit breaker "${this.name}": Manual reset`);
    this.close();
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
  }

  /**
   * Check if circuit allows requests
   */
  public isAllowingRequests(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.HALF_OPEN) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      return this.shouldAttemptReset();
    }

    return false;
  }

  /**
   * Get circuit breaker name
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Get configuration
   */
  public getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * Note: Does not affect current state, only future behavior
   */
  public updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
    console.log(`Circuit breaker "${this.name}" configuration updated`);
  }
}
