/**
 * Rate Limit Manager Tests
 * Tests for provider-agnostic rate limiting with retry logic
 */

import { RateLimitManager, AnthropicRateLimitHeaderParser, OpenAIRateLimitHeaderParser } from '../rate-limit';
import { ProviderError, ProviderErrorType } from '../../errors';

describe('RateLimitManager', () => {
  describe('Basic Functionality', () => {
    it('should execute function successfully on first try', async () => {
      const manager = new RateLimitManager();
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await manager.executeWithRetry(mockFn, 'test operation');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should pass through successful results', async () => {
      const manager = new RateLimitManager();
      const testData = { id: 123, message: 'test' };
      const mockFn = jest.fn().mockResolvedValue(testData);

      const result = await manager.executeWithRetry(mockFn);

      expect(result).toEqual(testData);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on rate limit errors', async () => {
      const manager = new RateLimitManager({ maxRetries: 3, baseDelay: 10 });
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(
          new ProviderError(ProviderErrorType.RATE_LIMIT, 'Rate limited', {
            retryable: true,
            retryAfter: 0.01, // 10ms
          })
        )
        .mockResolvedValue('success');

      const result = await manager.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should respect maxRetries limit', async () => {
      const manager = new RateLimitManager({ maxRetries: 2, baseDelay: 1 });
      const error = new ProviderError(ProviderErrorType.RATE_LIMIT, 'Rate limited', {
        retryable: true,
      });
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(manager.executeWithRetry(mockFn)).rejects.toThrow(ProviderError);
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-rate-limit errors', async () => {
      const manager = new RateLimitManager();
      const error = new ProviderError(ProviderErrorType.VALIDATION, 'Invalid input', {
        retryable: false,
      });
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(manager.executeWithRetry(mockFn)).rejects.toThrow(error);
      expect(mockFn).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Backoff Calculation', () => {
    it('should calculate exponential backoff correctly', () => {
      const manager = new RateLimitManager({ baseDelay: 1000, maxDelay: 32000, jitterFactor: 0 });

      const delay0 = manager.calculateBackoffDelay(0);
      const delay1 = manager.calculateBackoffDelay(1);
      const delay2 = manager.calculateBackoffDelay(2);

      expect(delay0).toBe(1000); // 1000 * 2^0
      expect(delay1).toBe(2000); // 1000 * 2^1
      expect(delay2).toBe(4000); // 1000 * 2^2
    });

    it('should cap delay at maxDelay', () => {
      const manager = new RateLimitManager({ baseDelay: 1000, maxDelay: 5000, jitterFactor: 0 });

      const delay10 = manager.calculateBackoffDelay(10);

      expect(delay10).toBe(5000); // Capped at maxDelay
    });

    it('should add jitter to delay', () => {
      const manager = new RateLimitManager({ baseDelay: 1000, maxDelay: 32000, jitterFactor: 0.1 });

      const delays = Array.from({ length: 10 }, () => manager.calculateBackoffDelay(1));
      const uniqueDelays = new Set(delays);

      // With jitter, delays should vary
      expect(uniqueDelays.size).toBeGreaterThan(1);

      // All delays should be within expected range (2000 +/- 10%)
      delays.forEach((delay) => {
        expect(delay).toBeGreaterThanOrEqual(1800);
        expect(delay).toBeLessThanOrEqual(2200);
      });
    });
  });

  describe('Header Parsers', () => {
    describe('AnthropicRateLimitHeaderParser', () => {
      it('should parse Anthropic rate limit headers', () => {
        const parser = new AnthropicRateLimitHeaderParser();
        const headers = {
          'anthropic-ratelimit-requests-limit': '100',
          'anthropic-ratelimit-requests-remaining': '95',
          'anthropic-ratelimit-requests-reset': '2024-01-01T00:00:00Z',
          'anthropic-ratelimit-tokens-limit': '100000',
          'anthropic-ratelimit-tokens-remaining': '95000',
          'retry-after': '60',
        };

        const info = parser.parseHeaders(headers);

        expect(info.requestsPerMinute).toBe(100);
        expect(info.remaining).toBe(95);
        expect(info.tokensPerMinute).toBe(100000);
        expect(info.retryAfter).toBe(60);
      });

      it('should handle missing headers gracefully', () => {
        const parser = new AnthropicRateLimitHeaderParser();
        const headers = {};

        const info = parser.parseHeaders(headers);

        expect(info.requestsPerMinute).toBeUndefined();
        expect(info.remaining).toBeUndefined();
      });
    });

    describe('OpenAIRateLimitHeaderParser', () => {
      it('should parse OpenAI rate limit headers', () => {
        const parser = new OpenAIRateLimitHeaderParser();
        const headers = {
          'x-ratelimit-limit-requests': '100',
          'x-ratelimit-remaining-requests': '95',
          'x-ratelimit-reset-requests': '1704067200',
          'x-ratelimit-limit-tokens': '100000',
          'x-ratelimit-remaining-tokens': '95000',
          'retry-after': '60',
        };

        const info = parser.parseHeaders(headers);

        expect(info.limit).toBe(100);
        expect(info.remaining).toBe(95);
        expect(info.retryAfter).toBe(60);
      });

      it('should handle missing headers gracefully', () => {
        const parser = new OpenAIRateLimitHeaderParser();
        const headers = {};

        const info = parser.parseHeaders(headers);

        expect(info.limit).toBeUndefined();
        expect(info.remaining).toBeUndefined();
      });
    });
  });

  describe('retryAfter Handling', () => {
    it('should use retryAfter from error if available', async () => {
      const manager = new RateLimitManager({ baseDelay: 1000, maxRetries: 2 });
      let callTime = 0;

      const mockFn = jest
        .fn()
        .mockImplementationOnce(() => {
          callTime = Date.now();
          throw new ProviderError(ProviderErrorType.RATE_LIMIT, 'Rate limited', {
            retryable: true,
            retryAfter: 0.05, // 50ms
          });
        })
        .mockResolvedValue('success');

      await manager.executeWithRetry(mockFn);

      // Second call should be at least 50ms after first
      const secondCallTime = Date.now();
      expect(secondCallTime - callTime).toBeGreaterThanOrEqual(40); // Allow some margin
    });
  });

  describe('Error Messages', () => {
    it('should include context in max retries error', async () => {
      const manager = new RateLimitManager({ maxRetries: 1, baseDelay: 1 });
      const mockFn = jest.fn().mockRejectedValue(
        new ProviderError(ProviderErrorType.RATE_LIMIT, 'Rate limited', {
          retryable: true,
        })
      );

      try {
        await manager.executeWithRetry(mockFn, 'Test API call');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).message).toContain('Test API call');
        expect((error as ProviderError).message).toContain('1 attempts');
      }
    });
  });

  describe('getStats', () => {
    it('should return current retry count', () => {
      const manager = new RateLimitManager({ maxRetries: 3 });

      const stats = manager.getStats();

      expect(stats.currentRetryCount).toBe(0);
      expect(stats.maxRetries).toBe(3);
    });
  });
});
