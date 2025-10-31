/**
 * Error Log Entry Types
 * Provider-agnostic error logging data structures
 */

import { ProviderErrorType, ErrorSeverity } from '../../errors';
import { ProviderType } from '../../types';

/**
 * Error log entry
 * Represents a single logged error with full context
 */
export interface ErrorLogEntry {
  /**
   * Unique identifier for this error entry
   */
  id: string;

  /**
   * When the error occurred
   */
  timestamp: Date;

  /**
   * Error severity level
   */
  severity: ErrorSeverity;

  /**
   * Error type (provider-agnostic)
   */
  type: ProviderErrorType;

  /**
   * Error message
   */
  message: string;

  /**
   * HTTP status code (if applicable)
   */
  statusCode?: number;

  /**
   * Whether the error is retryable
   */
  retryable: boolean;

  /**
   * Additional error context
   */
  context?: Record<string, any>;

  /**
   * Error stack trace
   */
  stack?: string;

  /**
   * Which AI provider caused the error
   */
  provider?: ProviderType;

  /**
   * User ID associated with the error
   */
  userId?: string;

  /**
   * Conversation ID associated with the error
   */
  conversationId?: string;

  /**
   * Model ID associated with the error
   */
  modelId?: string;

  /**
   * Operation that failed
   */
  operation?: string;
}

/**
 * Error statistics
 * Aggregated statistics about logged errors
 */
export interface ErrorStats {
  /**
   * Total number of errors logged
   */
  total: number;

  /**
   * Errors grouped by severity
   */
  bySeverity: Record<ErrorSeverity, number>;

  /**
   * Errors grouped by type
   */
  byType: Partial<Record<ProviderErrorType, number>>;

  /**
   * Errors grouped by provider
   */
  byProvider: Partial<Record<ProviderType, number>>;

  /**
   * Number of retryable errors
   */
  retryableCount: number;

  /**
   * Number of non-retryable errors
   */
  nonRetryableCount: number;

  /**
   * Most recent error timestamp
   */
  mostRecentError?: Date;

  /**
   * Most common error type
   */
  mostCommonType?: ProviderErrorType;

  /**
   * Most common provider with errors
   */
  mostCommonProvider?: ProviderType;
}
