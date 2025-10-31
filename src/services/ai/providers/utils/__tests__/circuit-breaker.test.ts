/**
 * Circuit Breaker Manager Tests
 * Tests for provider-agnostic circuit breaker pattern
 */

import { CircuitBreakerManager } from '../circuit-breaker';
import { CircuitState } from '../circuit-breaker/CircuitBreakerConfig';
import { ProviderError, ProviderErrorType } from '../../errors';

describe('CircuitBreakerManager', () => {
  describe('Basic Functionality', () => {
    it('should execute function successfully', async () => {
      const manager = new CircuitBreakerManager();
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await manager.execute('test-operation', mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should create breaker on first use', async () => {
      const manager = new CircuitBreakerManager();
      const mockFn = jest.fn().mockResolvedValue('success');

      await manager.execute('new-operation', mockFn);

      expect(manager.hasBreaker('new-operation')).toBe(true);
    });

    it('should reuse existing breaker', async () => {
      const manager = new CircuitBreakerManager();
      const mockFn = jest.fn().mockResolvedValue('success');

      await manager.execute('operation', mockFn);
      await manager.execute('operation', mockFn);

      expect(manager.getCount()).toBe(1); // Only one breaker created
    });
  });

  describe('Circuit States', () => {
    it('should start in CLOSED state', async () => {
      const manager = new CircuitBreakerManager();
      await manager.execute('test', async () => 'success');

      const stats = manager.getStats('test');
      expect(stats?.state).toBe(CircuitState.CLOSED);
    });

    it('should open circuit after failure threshold', async () => {
      const manager = new CircuitBreakerManager();
      const config = { failureThreshold: 3, timeout: 100 };
      const error = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(error);

      // First 3 failures should open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await manager.execute('test', mockFn, config);
        } catch (e) {
          // Expected
        }
      }

      const stats = manager.getStats('test');
      expect(stats?.state).toBe(CircuitState.OPEN);
    });

    it('should reject immediately when circuit is OPEN', async () => {
      const manager = new CircuitBreakerManager();
      const config = { failureThreshold: 2, timeout: 1000 };
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      // Trigger circuit open
      for (let i = 0; i < 2; i++) {
        try {
          await manager.execute('test', mockFn, config);
        } catch (e) {
          // Expected
        }
      }

      // Next call should fail immediately without calling function
      const callCount = mockFn.mock.calls.length;
      try {
        await manager.execute('test', mockFn, config);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).type).toBe(ProviderErrorType.OVERLOADED);
        expect(mockFn.mock.calls.length).toBe(callCount); // Function not called
      }
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      const manager = new CircuitBreakerManager();
      const config = { failureThreshold: 2, timeout: 50 };
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      // Open circuit
      for (let i = 0; i < 2; i++) {
        try {
          await manager.execute('test', mockFn, config);
        } catch (e) {
          // Expected
        }
      }

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Next call should attempt (HALF_OPEN)
      mockFn.mockResolvedValueOnce('success');
      await manager.execute('test', mockFn, config);

      const stats = manager.getStats('test');
      expect(stats?.state).toBe(CircuitState.CLOSED); // Success in HALF_OPEN closes circuit
    });

    it('should close circuit after success threshold in HALF_OPEN', async () => {
      const manager = new CircuitBreakerManager();
      const config = { failureThreshold: 2, successThreshold: 2, timeout: 50 };
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      // Open circuit
      for (let i = 0; i < 2; i++) {
        try {
          await manager.execute('test', mockFn, config);
        } catch (e) {
          // Expected
        }
      }

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Succeed twice to close circuit
      mockFn.mockResolvedValue('success');
      await manager.execute('test', mockFn, config);
      await manager.execute('test', mockFn, config);

      const stats = manager.getStats('test');
      expect(stats?.state).toBe(CircuitState.CLOSED);
    });
  });

  describe('Statistics', () => {
    it('should track successes and failures', async () => {
      const manager = new CircuitBreakerManager();
      const successFn = jest.fn().mockResolvedValue('success');
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));

      await manager.execute('test', successFn);
      await manager.execute('test', successFn);
      try {
        await manager.execute('test', failFn);
      } catch (e) {
        // Expected
      }

      const stats = manager.getStats('test');
      expect(stats?.successes).toBe(2);
      expect(stats?.failures).toBe(1);
    });

    it('should track consecutive failures', async () => {
      const manager = new CircuitBreakerManager();
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      for (let i = 0; i < 3; i++) {
        try {
          await manager.execute('test', mockFn);
        } catch (e) {
          // Expected
        }
      }

      const stats = manager.getStats('test');
      expect(stats?.consecutiveFailures).toBe(3);
    });

    it('should reset consecutive failures on success', async () => {
      const manager = new CircuitBreakerManager();
      let shouldFail = true;
      const mockFn = jest.fn().mockImplementation(() => {
        if (shouldFail) {
          throw new Error('fail');
        }
        return 'success';
      });

      // Two failures
      for (let i = 0; i < 2; i++) {
        try {
          await manager.execute('test', mockFn);
        } catch (e) {
          // Expected
        }
      }

      // One success
      shouldFail = false;
      await manager.execute('test', mockFn);

      const stats = manager.getStats('test');
      expect(stats?.consecutiveFailures).toBe(0);
    });

    it('should return all breaker stats', async () => {
      const manager = new CircuitBreakerManager();

      await manager.execute('operation1', async () => 'success');
      await manager.execute('operation2', async () => 'success');

      const allStats = manager.getAllStats();
      expect(Object.keys(allStats)).toHaveLength(2);
      expect(allStats['operation1']).toBeDefined();
      expect(allStats['operation2']).toBeDefined();
    });
  });

  describe('Management', () => {
    it('should get breaker names', async () => {
      const manager = new CircuitBreakerManager();

      await manager.execute('op1', async () => 'success');
      await manager.execute('op2', async () => 'success');

      const names = manager.getBreakerNames();
      expect(names).toContain('op1');
      expect(names).toContain('op2');
      expect(names).toHaveLength(2);
    });

    it('should reset individual breaker', async () => {
      const manager = new CircuitBreakerManager();
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Create failures
      for (let i = 0; i < 2; i++) {
        try {
          await manager.execute('test', mockFn);
        } catch (e) {
          // Expected
        }
      }

      const resetResult = manager.resetBreaker('test');
      expect(resetResult).toBe(true);

      const stats = manager.getStats('test');
      expect(stats?.failures).toBe(0);
      expect(stats?.consecutiveFailures).toBe(0);
    });

    it('should reset all breakers', async () => {
      const manager = new CircuitBreakerManager();
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      try {
        await manager.execute('op1', mockFn);
      } catch (e) {
        // Expected
      }
      try {
        await manager.execute('op2', mockFn);
      } catch (e) {
        // Expected
      }

      manager.resetAll();

      const stats1 = manager.getStats('op1');
      const stats2 = manager.getStats('op2');
      expect(stats1?.failures).toBe(0);
      expect(stats2?.failures).toBe(0);
    });

    it('should remove breaker', async () => {
      const manager = new CircuitBreakerManager();

      await manager.execute('test', async () => 'success');
      expect(manager.hasBreaker('test')).toBe(true);

      const removed = manager.removeBreaker('test');
      expect(removed).toBe(true);
      expect(manager.hasBreaker('test')).toBe(false);
    });

    it('should clear all breakers', async () => {
      const manager = new CircuitBreakerManager();

      await manager.execute('op1', async () => 'success');
      await manager.execute('op2', async () => 'success');

      manager.clear();

      expect(manager.getCount()).toBe(0);
      expect(manager.hasBreaker('op1')).toBe(false);
      expect(manager.hasBreaker('op2')).toBe(false);
    });
  });

  describe('Custom Configuration', () => {
    it('should use custom failure threshold', async () => {
      const manager = new CircuitBreakerManager();
      const config = { failureThreshold: 1 }; // Open after 1 failure
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      try {
        await manager.execute('test', mockFn, config);
      } catch (e) {
        // Expected
      }

      const stats = manager.getStats('test');
      expect(stats?.state).toBe(CircuitState.OPEN);
    });

    it('should use custom timeout', async () => {
      const manager = new CircuitBreakerManager();
      const config = { failureThreshold: 1, timeout: 20 };
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open circuit
      try {
        await manager.execute('test', mockFn, config);
      } catch (e) {
        // Expected
      }

      // Wait for short timeout
      await new Promise((resolve) => setTimeout(resolve, 25));

      // Should allow retry
      mockFn.mockResolvedValueOnce('success');
      const result = await manager.execute('test', mockFn, config);
      expect(result).toBe('success');
    });
  });
});
