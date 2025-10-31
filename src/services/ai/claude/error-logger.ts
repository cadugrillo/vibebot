/**
 * Error Logging System
 * VBT-160: Comprehensive error logging and monitoring
 *
 * Provides structured logging for errors with severity levels,
 * context, and monitoring capabilities.
 *
 * @deprecated This file is deprecated and maintained for backward compatibility only.
 * Use the new provider-agnostic ErrorLogger from '@/services/ai/providers/utils/error-logging/ErrorLogger' instead.
 * See MIGRATION.md for migration guide.
 */

import { ClaudeServiceError, ErrorSeverity, ClaudeErrorType } from './types';

/**
 * Log entry for error tracking
 */
export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  severity: ErrorSeverity;
  type: ClaudeErrorType;
  message: string;
  statusCode?: number;
  retryable: boolean;
  context?: Record<string, any>;
  stack?: string;
  userId?: string;
  conversationId?: string;
  modelId?: string;
}

/**
 * Error statistics
 */
export interface ErrorStats {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byType: Record<ClaudeErrorType, number>;
  retryableCount: number;
  nonRetryableCount: number;
}

/**
 * Error Logger class
 * Manages error logging with structured data and statistics
 *
 * @deprecated Use ErrorLogger from '@/services/ai/providers/utils/error-logging/ErrorLogger' instead
 */
export class ErrorLogger {
  private errors: ErrorLogEntry[] = [];
  private maxEntries: number = 1000; // Keep last 1000 errors

  constructor() {
    console.warn(
      '⚠️ ErrorLogger (claude) is deprecated. Use the new provider-agnostic ErrorLogger from @/services/ai/providers/utils/error-logging/ErrorLogger instead. See MIGRATION.md for details.'
    );
  }

  /**
   * Log an error
   *
   * @param error - Error to log
   * @param context - Additional context
   */
  public logError(
    error: ClaudeServiceError | Error,
    context?: Record<string, any>
  ): void {
    if (error instanceof ClaudeServiceError) {
      this.logClaudeError(error, context);
    } else {
      this.logGenericError(error, context);
    }
  }

  /**
   * Log a Claude service error
   */
  private logClaudeError(
    error: ClaudeServiceError,
    additionalContext?: Record<string, any>
  ): void {
    const entry: ErrorLogEntry = {
      id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: error.timestamp || new Date(),
      severity: error.severity,
      type: error.type,
      message: error.message,
      statusCode: error.statusCode,
      retryable: error.retryable,
      context: { ...error.context, ...additionalContext },
      stack: error.stack,
    };

    this.addEntry(entry);
    this.printLog(entry, error);
  }

  /**
   * Log a generic error
   */
  private logGenericError(error: Error, context?: Record<string, any>): void {
    const entry: ErrorLogEntry = {
      id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      severity: ErrorSeverity.HIGH,
      type: ClaudeErrorType.UNKNOWN,
      message: error.message,
      retryable: false,
      context,
      stack: error.stack,
    };

    this.addEntry(entry);
    this.printLog(entry, error);
  }

  /**
   * Add entry to log and maintain size limit
   */
  private addEntry(entry: ErrorLogEntry): void {
    this.errors.push(entry);

    // Keep only the most recent entries
    if (this.errors.length > this.maxEntries) {
      this.errors = this.errors.slice(-this.maxEntries);
    }
  }

  /**
   * Print formatted log to console
   */
  private printLog(entry: ErrorLogEntry, error: Error): void {
    const severityIcon = this.getSeverityIcon(entry.severity);
    const timestamp = entry.timestamp.toISOString();

    console.error('\n' + '='.repeat(70));
    console.error(`${severityIcon} ERROR [${entry.severity}] - ${timestamp}`);
    console.error('='.repeat(70));
    console.error(`Type: ${entry.type}`);
    console.error(`Message: ${entry.message}`);

    if (entry.statusCode) {
      console.error(`Status Code: ${entry.statusCode}`);
    }

    console.error(`Retryable: ${entry.retryable ? 'Yes' : 'No'}`);

    if (entry.context && Object.keys(entry.context).length > 0) {
      console.error('Context:', JSON.stringify(entry.context, null, 2));
    }

    if (error instanceof ClaudeServiceError) {
      console.error(`User Message: ${error.getUserMessage()}`);
    }

    if (entry.stack && entry.severity === ErrorSeverity.CRITICAL) {
      console.error('\nStack Trace:');
      console.error(entry.stack);
    }

    console.error('='.repeat(70) + '\n');
  }

  /**
   * Get icon for severity level
   */
  private getSeverityIcon(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return '⚠️ ';
      case ErrorSeverity.MEDIUM:
        return '⚠️ ';
      case ErrorSeverity.HIGH:
        return '❌';
      case ErrorSeverity.CRITICAL:
        return '🚨';
      default:
        return '❌';
    }
  }

  /**
   * Get recent errors
   *
   * @param limit - Maximum number of errors to return
   * @returns Array of recent error entries
   */
  public getRecentErrors(limit: number = 10): ErrorLogEntry[] {
    return this.errors.slice(-limit);
  }

  /**
   * Get errors by severity
   *
   * @param severity - Severity level to filter by
   * @param limit - Maximum number of errors to return
   * @returns Array of error entries
   */
  public getErrorsBySeverity(
    severity: ErrorSeverity,
    limit?: number
  ): ErrorLogEntry[] {
    const filtered = this.errors.filter((entry) => entry.severity === severity);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Get errors by type
   *
   * @param type - Error type to filter by
   * @param limit - Maximum number of errors to return
   * @returns Array of error entries
   */
  public getErrorsByType(type: ClaudeErrorType, limit?: number): ErrorLogEntry[] {
    const filtered = this.errors.filter((entry) => entry.type === type);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Get error statistics
   *
   * @returns Statistics about logged errors
   */
  public getStats(): ErrorStats {
    const stats: ErrorStats = {
      total: this.errors.length,
      bySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0,
      },
      byType: {
        [ClaudeErrorType.AUTHENTICATION]: 0,
        [ClaudeErrorType.INVALID_REQUEST]: 0,
        [ClaudeErrorType.RATE_LIMIT]: 0,
        [ClaudeErrorType.BILLING]: 0,
        [ClaudeErrorType.OVERLOADED]: 0,
        [ClaudeErrorType.TIMEOUT]: 0,
        [ClaudeErrorType.NETWORK]: 0,
        [ClaudeErrorType.INTERNAL]: 0,
        [ClaudeErrorType.STREAM_INTERRUPTED]: 0,
        [ClaudeErrorType.VALIDATION]: 0,
        [ClaudeErrorType.QUOTA_EXCEEDED]: 0,
        [ClaudeErrorType.UNKNOWN]: 0,
      },
      retryableCount: 0,
      nonRetryableCount: 0,
    };

    for (const entry of this.errors) {
      stats.bySeverity[entry.severity]++;
      stats.byType[entry.type]++;
      if (entry.retryable) {
        stats.retryableCount++;
      } else {
        stats.nonRetryableCount++;
      }
    }

    return stats;
  }

  /**
   * Clear all logged errors
   */
  public clear(): void {
    this.errors = [];
  }

  /**
   * Get total error count
   */
  public getCount(): number {
    return this.errors.length;
  }

  /**
   * Export errors to JSON
   *
   * @param limit - Optional limit on number of errors
   * @returns JSON string of error entries
   */
  public exportToJson(limit?: number): string {
    const entries = limit ? this.errors.slice(-limit) : this.errors;
    return JSON.stringify(entries, null, 2);
  }
}

/**
 * Singleton error logger instance
 */
let errorLoggerInstance: ErrorLogger | null = null;

/**
 * Get singleton error logger instance
 */
export function getErrorLogger(): ErrorLogger {
  if (!errorLoggerInstance) {
    errorLoggerInstance = new ErrorLogger();
  }
  return errorLoggerInstance;
}

/**
 * Reset error logger (useful for testing)
 */
export function resetErrorLogger(): void {
  errorLoggerInstance = null;
}

/**
 * Quick helper to log errors
 */
export function logError(
  error: ClaudeServiceError | Error,
  context?: Record<string, any>
): void {
  const logger = getErrorLogger();
  logger.logError(error, context);
}
