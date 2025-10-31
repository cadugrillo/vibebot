/**
 * Error Logger Tests
 * Tests for provider-agnostic error logging and statistics
 */

import { ErrorLogger } from '../error-logging';
import { ProviderError, ProviderErrorType, ErrorSeverity } from '../../errors';
import { ProviderType } from '../../types';

describe('ErrorLogger', () => {
  describe('Basic Logging', () => {
    it('should log ProviderError correctly', () => {
      const logger = new ErrorLogger();
      const error = new ProviderError(
        ProviderErrorType.AUTHENTICATION,
        'Invalid API key',
        {
          retryable: false,
          statusCode: 401,
        }
      );

      logger.logError(error, { userId: 'user-123' });

      const errors = logger.getAllErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(ProviderErrorType.AUTHENTICATION);
      expect(errors[0].message).toBe('Invalid API key');
      expect(errors[0].retryable).toBe(false);
      expect(errors[0].statusCode).toBe(401);
      expect(errors[0].userId).toBe('user-123');
    });

    it('should log generic Error', () => {
      const logger = new ErrorLogger();
      const error = new Error('Something went wrong');

      logger.logError(error);

      const errors = logger.getAllErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(ProviderErrorType.UNKNOWN);
      expect(errors[0].message).toBe('Something went wrong');
      expect(errors[0].severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should include context in log entry', () => {
      const logger = new ErrorLogger();
      const error = new Error('Test error');
      const context = {
        userId: 'user-123',
        conversationId: 'conv-456',
        operation: 'sendMessage',
        modelId: 'claude-sonnet-4.5',
        provider: ProviderType.CLAUDE,
      };

      logger.logError(error, context);

      const errors = logger.getAllErrors();
      expect(errors[0].userId).toBe('user-123');
      expect(errors[0].conversationId).toBe('conv-456');
      expect(errors[0].operation).toBe('sendMessage');
      expect(errors[0].modelId).toBe('claude-sonnet-4.5');
      expect(errors[0].provider).toBe(ProviderType.CLAUDE);
    });

    it('should generate unique IDs for each error', () => {
      const logger = new ErrorLogger();
      const error = new Error('Test');

      logger.logError(error);
      logger.logError(error);

      const errors = logger.getAllErrors();
      expect(errors[0].id).not.toBe(errors[1].id);
    });

    it('should record timestamp for each error', () => {
      const logger = new ErrorLogger();
      const error = new Error('Test');
      const before = new Date();

      logger.logError(error);

      const after = new Date();
      const errors = logger.getAllErrors();
      expect(errors[0].timestamp).toBeInstanceOf(Date);
      expect(errors[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(errors[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Statistics', () => {
    it('should calculate total error count', () => {
      const logger = new ErrorLogger();

      logger.logError(new Error('Error 1'));
      logger.logError(new Error('Error 2'));
      logger.logError(new Error('Error 3'));

      const stats = logger.getStats();
      expect(stats.total).toBe(3);
    });

    it('should count errors by severity', () => {
      const logger = new ErrorLogger();

      logger.logError(new ProviderError(ProviderErrorType.VALIDATION, 'Validation', {
        retryable: false,
        severity: ErrorSeverity.LOW,
      }));
      logger.logError(new ProviderError(ProviderErrorType.NETWORK, 'Network', {
        retryable: true,
        severity: ErrorSeverity.HIGH,
      }));
      logger.logError(new ProviderError(ProviderErrorType.AUTHENTICATION, 'Auth', {
        retryable: false,
        severity: ErrorSeverity.CRITICAL,
      }));

      const stats = logger.getStats();
      expect(stats.bySeverity[ErrorSeverity.LOW]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.HIGH]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.CRITICAL]).toBe(1);
    });

    it('should count errors by type', () => {
      const logger = new ErrorLogger();

      logger.logError(new ProviderError(ProviderErrorType.RATE_LIMIT, 'Rate limit', { retryable: true }));
      logger.logError(new ProviderError(ProviderErrorType.RATE_LIMIT, 'Rate limit again', { retryable: true }));
      logger.logError(new ProviderError(ProviderErrorType.NETWORK, 'Network', { retryable: true }));

      const stats = logger.getStats();
      expect(stats.byType[ProviderErrorType.RATE_LIMIT]).toBe(2);
      expect(stats.byType[ProviderErrorType.NETWORK]).toBe(1);
    });

    it('should count errors by provider', () => {
      const logger = new ErrorLogger();

      logger.logError(new Error('Error 1'), { provider: ProviderType.CLAUDE });
      logger.logError(new Error('Error 2'), { provider: ProviderType.CLAUDE });
      logger.logError(new Error('Error 3'), { provider: ProviderType.OPENAI });

      const stats = logger.getStats();
      expect(stats.byProvider![ProviderType.CLAUDE]).toBe(2);
      expect(stats.byProvider![ProviderType.OPENAI]).toBe(1);
    });

    it('should count retryable vs non-retryable', () => {
      const logger = new ErrorLogger();

      logger.logError(new ProviderError(ProviderErrorType.RATE_LIMIT, 'Retry', { retryable: true }));
      logger.logError(new ProviderError(ProviderErrorType.RATE_LIMIT, 'Retry 2', { retryable: true }));
      logger.logError(new ProviderError(ProviderErrorType.AUTHENTICATION, 'No retry', { retryable: false }));

      const stats = logger.getStats();
      expect(stats.retryableCount).toBe(2);
      expect(stats.nonRetryableCount).toBe(1);
    });

    it('should track most recent error', () => {
      const logger = new ErrorLogger();

      logger.logError(new Error('First'));
      const middleTime = new Date();
      logger.logError(new Error('Second'));

      const stats = logger.getStats();
      expect(stats.mostRecentError).toBeDefined();
      expect(stats.mostRecentError!.getTime()).toBeGreaterThanOrEqual(middleTime.getTime());
    });

    it('should identify most common error type', () => {
      const logger = new ErrorLogger();

      logger.logError(new ProviderError(ProviderErrorType.RATE_LIMIT, 'Rate 1', { retryable: true }));
      logger.logError(new ProviderError(ProviderErrorType.RATE_LIMIT, 'Rate 2', { retryable: true }));
      logger.logError(new ProviderError(ProviderErrorType.RATE_LIMIT, 'Rate 3', { retryable: true }));
      logger.logError(new ProviderError(ProviderErrorType.NETWORK, 'Network', { retryable: true }));

      const stats = logger.getStats();
      expect(stats.mostCommonType).toBe(ProviderErrorType.RATE_LIMIT);
    });
  });

  describe('Querying', () => {
    it('should get recent errors with limit', () => {
      const logger = new ErrorLogger();

      for (let i = 0; i < 10; i++) {
        logger.logError(new Error(`Error ${i}`));
      }

      const recent = logger.getRecentErrors(3);
      expect(recent).toHaveLength(3);
      expect(recent[0].message).toBe('Error 9'); // Most recent first
      expect(recent[2].message).toBe('Error 7');
    });

    it('should filter errors by severity', () => {
      const logger = new ErrorLogger();

      logger.logError(new ProviderError(ProviderErrorType.VALIDATION, 'Low', {
        retryable: false,
        severity: ErrorSeverity.LOW,
      }));
      logger.logError(new ProviderError(ProviderErrorType.NETWORK, 'High', {
        retryable: true,
        severity: ErrorSeverity.HIGH,
      }));

      const highSeverity = logger.getErrorsBySeverity(ErrorSeverity.HIGH);
      expect(highSeverity).toHaveLength(1);
      expect(highSeverity[0].message).toBe('High');
    });

    it('should filter errors by type', () => {
      const logger = new ErrorLogger();

      logger.logError(new ProviderError(ProviderErrorType.RATE_LIMIT, 'Rate 1', { retryable: true }));
      logger.logError(new ProviderError(ProviderErrorType.RATE_LIMIT, 'Rate 2', { retryable: true }));
      logger.logError(new ProviderError(ProviderErrorType.NETWORK, 'Network', { retryable: true }));

      const rateLimitErrors = logger.getErrorsByType(ProviderErrorType.RATE_LIMIT);
      expect(rateLimitErrors).toHaveLength(2);
    });

    it('should filter errors by provider', () => {
      const logger = new ErrorLogger();

      logger.logError(new Error('Claude error'), { provider: ProviderType.CLAUDE });
      logger.logError(new Error('OpenAI error'), { provider: ProviderType.OPENAI });

      const claudeErrors = logger.getErrorsByProvider(ProviderType.CLAUDE);
      expect(claudeErrors).toHaveLength(1);
      expect(claudeErrors[0].message).toBe('Claude error');
    });
  });

  describe('Max Entries', () => {
    it('should respect maxEntries limit', () => {
      const logger = new ErrorLogger(5);

      for (let i = 0; i < 10; i++) {
        logger.logError(new Error(`Error ${i}`));
      }

      const errors = logger.getAllErrors();
      expect(errors).toHaveLength(5);
      expect(errors[0].message).toBe('Error 9'); // Most recent kept
    });

    it('should allow changing maxEntries', () => {
      const logger = new ErrorLogger(10);

      logger.setMaxEntries(3);

      for (let i = 0; i < 5; i++) {
        logger.logError(new Error(`Error ${i}`));
      }

      const errors = logger.getAllErrors();
      expect(errors).toHaveLength(3);
    });

    it('should return current maxEntries', () => {
      const logger = new ErrorLogger(100);

      expect(logger.getMaxEntries()).toBe(100);
    });
  });

  describe('Management', () => {
    it('should clear all errors', () => {
      const logger = new ErrorLogger();

      logger.logError(new Error('Error 1'));
      logger.logError(new Error('Error 2'));

      logger.clear();

      expect(logger.getCount()).toBe(0);
      expect(logger.getAllErrors()).toHaveLength(0);
    });

    it('should return error count', () => {
      const logger = new ErrorLogger();

      logger.logError(new Error('Error 1'));
      logger.logError(new Error('Error 2'));
      logger.logError(new Error('Error 3'));

      expect(logger.getCount()).toBe(3);
    });
  });

  describe('Export', () => {
    it('should export to JSON', () => {
      const logger = new ErrorLogger();

      logger.logError(new ProviderError(ProviderErrorType.RATE_LIMIT, 'Test', {
        retryable: true,
        statusCode: 429,
      }));

      const json = logger.exportToJson();
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe(ProviderErrorType.RATE_LIMIT);
      expect(parsed[0].message).toBe('Test');
    });

    it('should limit exported entries', () => {
      const logger = new ErrorLogger();

      for (let i = 0; i < 10; i++) {
        logger.logError(new Error(`Error ${i}`));
      }

      const json = logger.exportToJson(3);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(3);
    });
  });
});
