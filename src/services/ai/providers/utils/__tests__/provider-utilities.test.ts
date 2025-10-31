/**
 * Provider Utilities Integration Tests
 * Tests for the convenience wrapper bundling all utilities
 */

import {
  ProviderUtilities,
  createProviderUtilities,
  createUtilitiesForProvider,
  createSharedUtilities,
} from '../ProviderUtilities';
import { ProviderType } from '../../types';
import { ProviderError, ProviderErrorType } from '../../errors';

describe('ProviderUtilities', () => {
  describe('Initialization', () => {
    it('should initialize all utilities', () => {
      const utilities = new ProviderUtilities();

      expect(utilities.rateLimitManager).toBeDefined();
      expect(utilities.circuitBreaker).toBeDefined();
      expect(utilities.errorLogger).toBeDefined();
      expect(utilities.systemPromptManager).toBeDefined();
    });

    it('should create with factory function', () => {
      const utilities = createProviderUtilities();

      expect(utilities).toBeInstanceOf(ProviderUtilities);
      expect(utilities.rateLimitManager).toBeDefined();
    });

    it('should create with custom config', () => {
      const utilities = createProviderUtilities({
        retryConfig: { maxRetries: 5 },
        errorLoggerMaxEntries: 100,
      });

      expect(utilities.errorLogger.getMaxEntries()).toBe(100);
    });
  });

  describe('Getters', () => {
    it('should provide getter methods', () => {
      const utilities = new ProviderUtilities();

      expect(utilities.getRateLimitManager()).toBe(utilities.rateLimitManager);
      expect(utilities.getCircuitBreaker()).toBe(utilities.circuitBreaker);
      expect(utilities.getErrorLogger()).toBe(utilities.errorLogger);
      expect(utilities.getSystemPromptManager()).toBe(utilities.systemPromptManager);
    });

    it('should provide getAll method', () => {
      const utilities = new ProviderUtilities();

      const all = utilities.getAll();

      expect(all.rateLimitManager).toBe(utilities.rateLimitManager);
      expect(all.circuitBreaker).toBe(utilities.circuitBreaker);
      expect(all.errorLogger).toBe(utilities.errorLogger);
      expect(all.systemPromptManager).toBe(utilities.systemPromptManager);
    });
  });

  describe('Integration', () => {
    it('should work with all utilities together', async () => {
      const utilities = new ProviderUtilities();
      let callCount = 0;

      const mockOperation = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new ProviderError(ProviderErrorType.RATE_LIMIT, 'Rate limited', {
            retryable: true,
            retryAfter: 0.01,
          });
        }
        return 'success';
      });

      // Execute with circuit breaker and rate limiting
      const result = await utilities.circuitBreaker.execute(
        'test-op',
        async () => {
          return await utilities.rateLimitManager.executeWithRetry(mockOperation);
        }
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2); // Initial + 1 retry

      // Check error was logged
      const stats = utilities.errorLogger.getStats();
      expect(stats.total).toBe(1); // Rate limit error logged
      expect(stats.byType[ProviderErrorType.RATE_LIMIT]).toBe(1);

      // Check circuit breaker stats
      const breakerStats = utilities.circuitBreaker.getStats('test-op');
      expect(breakerStats?.successes).toBe(1);
    });

    it('should handle system prompt validation', () => {
      const utilities = new ProviderUtilities();

      const validation = utilities.systemPromptManager.validate(
        'You are a helpful assistant.'
      );

      expect(validation.isValid).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should print statistics without errors', async () => {
      const utilities = new ProviderUtilities();

      // Generate some activity
      await utilities.circuitBreaker.execute('op1', async () => 'success');
      await utilities.circuitBreaker.execute('op2', async () => 'success');
      utilities.errorLogger.logError(new Error('Test error'));
      utilities.systemPromptManager.createCustomPreset({
        name: 'Test',
        description: 'Test',
        prompt: 'Test prompt',
        category: 'custom',
      });

      // Should not throw
      expect(() => utilities.printStatistics()).not.toThrow();
    });
  });

  describe('Reset', () => {
    it('should reset all utilities', async () => {
      const utilities = new ProviderUtilities();

      // Create some state
      await utilities.circuitBreaker.execute('test', async () => 'success');
      utilities.errorLogger.logError(new Error('Test'));
      utilities.systemPromptManager.createCustomPreset({
        name: 'Test',
        description: 'Test',
        prompt: 'Test',
        category: 'custom',
      });

      utilities.reset();

      // Verify reset
      expect(utilities.errorLogger.getCount()).toBe(0);
      expect(utilities.circuitBreaker.getCount()).toBe(0);
      expect(utilities.systemPromptManager.getCustomPresets()).toHaveLength(0);
    });
  });

  describe('Factory Functions', () => {
    describe('createUtilitiesForProvider', () => {
      it('should create with Claude configuration', () => {
        const utilities = createUtilitiesForProvider(ProviderType.CLAUDE);

        expect(utilities).toBeInstanceOf(ProviderUtilities);
        // Anthropic header parser should be configured
      });

      it('should create with OpenAI configuration', () => {
        const utilities = createUtilitiesForProvider(ProviderType.OPENAI);

        expect(utilities).toBeInstanceOf(ProviderUtilities);
        // OpenAI header parser should be configured
      });

      it('should accept additional config', () => {
        const utilities = createUtilitiesForProvider(ProviderType.CLAUDE, {
          errorLoggerMaxEntries: 50,
        });

        expect(utilities.errorLogger.getMaxEntries()).toBe(50);
      });
    });

    describe('createSharedUtilities', () => {
      it('should create shared utilities', () => {
        const utilities = createSharedUtilities();

        expect(utilities).toBeInstanceOf(ProviderUtilities);
      });

      it('should allow sharing across providers', () => {
        const shared = createSharedUtilities();

        // Simulate using same error logger for multiple providers
        shared.errorLogger.logError(new Error('Error 1'), {
          provider: ProviderType.CLAUDE,
        });
        shared.errorLogger.logError(new Error('Error 2'), {
          provider: ProviderType.OPENAI,
        });

        const stats = shared.errorLogger.getStats();
        expect(stats.byProvider![ProviderType.CLAUDE]).toBe(1);
        expect(stats.byProvider![ProviderType.OPENAI]).toBe(1);
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle circuit breaker opening', async () => {
      const utilities = new ProviderUtilities();
      const config = { failureThreshold: 2, timeout: 100 };
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      // Trigger circuit open
      for (let i = 0; i < 2; i++) {
        try {
          await utilities.circuitBreaker.execute('test', mockFn, config);
        } catch (e) {
          // Expected
        }
      }

      // Should reject immediately
      try {
        await utilities.circuitBreaker.execute('test', mockFn, config);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).type).toBe(ProviderErrorType.OVERLOADED);
      }

      // Error should be logged
      const stats = utilities.errorLogger.getStats();
      expect(stats.total).toBeGreaterThan(0);
    });

    it('should handle rate limit exhaustion', async () => {
      const utilities = new ProviderUtilities({
        retryConfig: { maxRetries: 2, baseDelay: 1 },
      });
      const error = new ProviderError(ProviderErrorType.RATE_LIMIT, 'Rate limited', {
        retryable: true,
      });
      const mockFn = jest.fn().mockRejectedValue(error);

      try {
        await utilities.rateLimitManager.executeWithRetry(mockFn);
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ProviderError);
      }

      // All errors should be logged
      const stats = utilities.errorLogger.getStats();
      expect(stats.byType[ProviderErrorType.RATE_LIMIT]).toBe(3); // Initial + 2 retries
    });

    it('should handle invalid system prompts', () => {
      const utilities = new ProviderUtilities({
        systemPromptConfig: { maxLength: 50 },
      });

      const validation = utilities.systemPromptManager.validate('a'.repeat(100));

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical API call pattern', async () => {
      const utilities = new ProviderUtilities();

      // Simulate API call with all protections
      const apiCall = async () => {
        // Validate system prompt
        const prompt = 'You are a helpful assistant.';
        const validation = utilities.systemPromptManager.validate(prompt);
        if (!validation.isValid) {
          throw new ProviderError(
            ProviderErrorType.VALIDATION,
            `Invalid prompt: ${validation.errors.join(', ')}`,
            { retryable: false }
          );
        }

        // Make API call (simulated)
        return { response: 'Hello!', tokens: 5 };
      };

      // Execute with protections
      const result = await utilities.circuitBreaker.execute(
        'api-call',
        async () => {
          return await utilities.rateLimitManager.executeWithRetry(apiCall);
        }
      );

      expect(result.response).toBe('Hello!');

      // Check stats
      const breakerStats = utilities.circuitBreaker.getStats('api-call');
      expect(breakerStats?.successes).toBe(1);
      expect(breakerStats?.failures).toBe(0);
    });

    it('should track errors across multiple operations', async () => {
      const utilities = new ProviderUtilities();

      // Simulate multiple operations with errors
      try {
        await utilities.circuitBreaker.execute('op1', async () => {
          throw new ProviderError(ProviderErrorType.NETWORK, 'Network error', {
            retryable: true,
          });
        });
      } catch (e) {
        utilities.errorLogger.logError(e as Error, { operation: 'op1' });
      }

      try {
        await utilities.circuitBreaker.execute('op2', async () => {
          throw new ProviderError(ProviderErrorType.RATE_LIMIT, 'Rate limit', {
            retryable: true,
          });
        });
      } catch (e) {
        utilities.errorLogger.logError(e as Error, { operation: 'op2' });
      }

      // Check aggregated stats
      const stats = utilities.errorLogger.getStats();
      expect(stats.total).toBe(2);
      expect(stats.byType[ProviderErrorType.NETWORK]).toBe(1);
      expect(stats.byType[ProviderErrorType.RATE_LIMIT]).toBe(1);
    });
  });
});
