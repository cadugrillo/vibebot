/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different operations
 *
 * Use this to create and manage circuit breakers for different API
 * endpoints, models, or operations. Each circuit breaker is independent.
 */

import { CircuitBreaker } from './CircuitBreaker';
import { CircuitBreakerConfig, CircuitBreakerStats } from './CircuitBreakerConfig';

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different operations
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker for an operation
   *
   * If a circuit breaker with the given name already exists, it is returned.
   * Otherwise, a new circuit breaker is created with the provided configuration.
   *
   * @param name - Unique name for the circuit breaker
   * @param config - Optional configuration (only used if creating new breaker)
   * @returns Circuit breaker instance
   */
  public getBreaker(
    name: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(name, config);
      this.breakers.set(name, breaker);
      console.log(`Circuit breaker "${name}" created by manager`);
    }
    return this.breakers.get(name)!;
  }

  /**
   * Execute a function with circuit breaker protection
   *
   * This is a convenience method that gets (or creates) a circuit breaker
   * and executes the function with protection.
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
   * Check if a circuit breaker exists
   *
   * @param name - Circuit breaker name
   * @returns True if circuit breaker exists
   */
  public hasBreaker(name: string): boolean {
    return this.breakers.has(name);
  }

  /**
   * Remove a circuit breaker
   *
   * @param name - Circuit breaker name
   * @returns True if circuit breaker was removed
   */
  public removeBreaker(name: string): boolean {
    const existed = this.breakers.has(name);
    this.breakers.delete(name);
    if (existed) {
      console.log(`Circuit breaker "${name}" removed from manager`);
    }
    return existed;
  }

  /**
   * Get statistics for a specific circuit breaker
   *
   * @param name - Circuit breaker name
   * @returns Circuit breaker statistics, or undefined if not found
   */
  public getStats(name: string): CircuitBreakerStats | undefined {
    const breaker = this.breakers.get(name);
    return breaker?.getStats();
  }

  /**
   * Get statistics for all circuit breakers
   *
   * @returns Map of circuit breaker name to statistics
   */
  public getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset a specific circuit breaker
   *
   * @param name - Circuit breaker name
   * @returns True if circuit breaker was reset
   */
  public resetBreaker(name: string): boolean {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
      return true;
    }
    return false;
  }

  /**
   * Reset all circuit breakers
   */
  public resetAll(): void {
    console.log('Resetting all circuit breakers');
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

  /**
   * Get all circuit breaker names
   */
  public getBreakerNames(): string[] {
    return Array.from(this.breakers.keys());
  }

  /**
   * Clear all circuit breakers
   */
  public clear(): void {
    console.log('Clearing all circuit breakers');
    this.breakers.clear();
  }

  /**
   * Print summary of all circuit breakers
   * Useful for debugging and monitoring
   */
  public printSummary(): void {
    console.log('\n' + '='.repeat(70));
    console.log('Circuit Breaker Manager Summary');
    console.log('='.repeat(70));
    console.log(`Total circuit breakers: ${this.breakers.size}`);

    if (this.breakers.size === 0) {
      console.log('No circuit breakers registered');
    } else {
      for (const [name, breaker] of this.breakers.entries()) {
        const stats = breaker.getStats();
        const stateIcon = this.getStateIcon(stats.state);

        console.log(`\n${stateIcon} ${name}`);
        console.log(`   State: ${stats.state}`);
        console.log(
          `   Requests: ${stats.totalRequests} ` +
            `(${stats.totalSuccesses} success, ${stats.totalFailures} failures)`
        );

        if (stats.state !== 'CLOSED') {
          console.log(`   Consecutive failures: ${stats.consecutiveFailures}`);
        }

        if (stats.nextAttemptTime) {
          const waitTime = Math.ceil(
            (stats.nextAttemptTime.getTime() - Date.now()) / 1000
          );
          console.log(`   Next attempt in: ${Math.max(0, waitTime)}s`);
        }
      }
    }

    console.log('='.repeat(70) + '\n');
  }

  /**
   * Get icon for circuit state
   */
  private getStateIcon(state: string): string {
    switch (state) {
      case 'CLOSED':
        return '✅';
      case 'HALF_OPEN':
        return '🟡';
      case 'OPEN':
        return '🔴';
      default:
        return '❓';
    }
  }
}
