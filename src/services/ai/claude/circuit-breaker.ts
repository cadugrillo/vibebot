/**
 * Circuit Breaker Pattern
 * VBT-160: Add circuit breaker for repeated failures
 *
 * Prevents cascading failures by stopping requests to a failing service
 * and allowing time for recovery.
 */

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation, requests allowed
  OPEN = 'OPEN',         // Too many failures, requests blocked
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening circuit
  successThreshold: number;    // Number of successes to close circuit from half-open
  timeout: number;             // Time in ms before trying again (half-open)
  monitoringPeriod: number;    // Time window in ms for failure counting
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

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

  private config: CircuitBreakerConfig = {
    failureThreshold: 5,        // Open after 5 failures
    successThreshold: 2,        // Close after 2 successes in half-open
    timeout: 60000,             // Wait 60 seconds before retry
    monitoringPeriod: 120000,   // Count failures in 2-minute window
  };

  constructor(
    private readonly name: string,
    config?: Partial<CircuitBreakerConfig>
  ) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Execute a function with circuit breaker protection
   *
   * @param fn - Function to execute
   * @returns Result of the function
   * @throws Error if circuit is open
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

        throw new Error(
          `Circuit breaker "${this.name}" is OPEN. ` +
          `Too many failures detected. Please try again in ${waitTime} seconds.`
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
        console.log(`✅ Circuit breaker "${this.name}": Closing circuit (service recovered)`);
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
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different operations
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker for an operation
   *
   * @param name - Unique name for the circuit breaker
   * @param config - Optional configuration
   * @returns Circuit breaker instance
   */
  public getBreaker(
    name: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Execute a function with circuit breaker protection
   *
   * @param name - Circuit breaker name
   * @param fn - Function to execute
   * @param config - Optional configuration for new circuit breakers
   * @returns Result of the function
   */
  public async execute<T>(
    name: string,
    fn: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const breaker = this.getBreaker(name, config);
    return await breaker.execute(fn);
  }

  /**
   * Get statistics for all circuit breakers
   */
  public getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  public resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Get total number of circuit breakers
   */
  public getCount(): number {
    return this.breakers.size;
  }
}
