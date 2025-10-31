/**
 * Error Logger
 * Provider-agnostic error logging with statistics and filtering
 *
 * Features:
 * - Structured error logging
 * - Error history with configurable max entries
 * - Statistics by severity, type, and provider
 * - Filtering and search capabilities
 * - JSON export for analysis
 */

import { ProviderError, ErrorSeverity, ProviderErrorType } from '../../errors';
import { ProviderType } from '../../types';
import { ErrorLogEntry, ErrorStats } from './ErrorLogEntry';

/**
 * Error Logger
 * Manages error logging with structured data and statistics
 */
export class ErrorLogger {
  private errors: ErrorLogEntry[] = [];
  private maxEntries: number;

  /**
   * Create a new ErrorLogger
   *
   * @param maxEntries - Maximum number of errors to keep in history (default: 1000)
   */
  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
    console.log(`ErrorLogger initialized (max entries: ${maxEntries})`);
  }

  /**
   * Log an error
   * Works with both ProviderError and generic Error
   *
   * @param error - Error to log
   * @param context - Additional context to include
   */
  public logError(
    error: ProviderError | Error,
    context?: Record<string, any>
  ): void {
    if (error instanceof ProviderError) {
      this.logProviderError(error, context);
    } else {
      this.logGenericError(error, context);
    }
  }

  /**
   * Log a ProviderError
   */
  private logProviderError(
    error: ProviderError,
    additionalContext?: Record<string, any>
  ): void {
    const entry: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      severity: error.severity,
      type: error.type,
      message: error.message,
      statusCode: error.statusCode,
      retryable: error.retryable,
      context: { ...error.context, ...additionalContext },
      stack: error.stack,
      provider: error.context?.provider as ProviderType | undefined,
      userId: additionalContext?.userId,
      conversationId: additionalContext?.conversationId,
      modelId: additionalContext?.model || additionalContext?.modelId,
      operation: additionalContext?.operation,
    };

    this.addEntry(entry);
    this.printLog(entry, error);
  }

  /**
   * Log a generic error
   */
  private logGenericError(
    error: Error,
    context?: Record<string, any>
  ): void {
    const entry: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      severity: ErrorSeverity.HIGH,
      type: ProviderErrorType.UNKNOWN,
      message: error.message,
      retryable: false,
      context,
      stack: error.stack,
      provider: context?.provider as ProviderType | undefined,
      userId: context?.userId,
      conversationId: context?.conversationId,
      modelId: context?.model || context?.modelId,
      operation: context?.operation,
    };

    this.addEntry(entry);
    this.printLog(entry, error);
  }

  /**
   * Generate unique error ID
   */
  private generateId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add entry to log and maintain size limit
   */
  private addEntry(entry: ErrorLogEntry): void {
    this.errors.push(entry);

    // Keep only the most recent entries
    if (this.errors.length > this.maxEntries) {
      const removeCount = this.errors.length - this.maxEntries;
      this.errors = this.errors.slice(removeCount);
      console.log(`Removed ${removeCount} old error entries (maintaining max ${this.maxEntries})`);
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

    if (entry.provider) {
      console.error(`Provider: ${entry.provider}`);
    }

    if (entry.operation) {
      console.error(`Operation: ${entry.operation}`);
    }

    if (entry.statusCode) {
      console.error(`Status Code: ${entry.statusCode}`);
    }

    console.error(`Retryable: ${entry.retryable ? 'Yes' : 'No'}`);

    if (entry.userId) {
      console.error(`User ID: ${entry.userId}`);
    }

    if (entry.conversationId) {
      console.error(`Conversation ID: ${entry.conversationId}`);
    }

    if (entry.modelId) {
      console.error(`Model: ${entry.modelId}`);
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      console.error('Context:', JSON.stringify(entry.context, null, 2));
    }

    if (error instanceof ProviderError) {
      console.error(`User Message: ${error.getUserMessage()}`);
    }

    // Show stack trace for critical errors
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
   * @param limit - Maximum number of errors to return (optional)
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
   * @param limit - Maximum number of errors to return (optional)
   * @returns Array of error entries
   */
  public getErrorsByType(
    type: ProviderErrorType,
    limit?: number
  ): ErrorLogEntry[] {
    const filtered = this.errors.filter((entry) => entry.type === type);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Get errors by provider
   *
   * @param provider - Provider to filter by
   * @param limit - Maximum number of errors to return (optional)
   * @returns Array of error entries
   */
  public getErrorsByProvider(
    provider: ProviderType,
    limit?: number
  ): ErrorLogEntry[] {
    const filtered = this.errors.filter((entry) => entry.provider === provider);
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
      byType: {},
      byProvider: {},
      retryableCount: 0,
      nonRetryableCount: 0,
    };

    // Count errors
    for (const entry of this.errors) {
      // By severity
      stats.bySeverity[entry.severity]++;

      // By type
      stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;

      // By provider
      if (entry.provider) {
        stats.byProvider[entry.provider] = (stats.byProvider[entry.provider] || 0) + 1;
      }

      // Retryable
      if (entry.retryable) {
        stats.retryableCount++;
      } else {
        stats.nonRetryableCount++;
      }
    }

    // Most recent error
    if (this.errors.length > 0) {
      stats.mostRecentError = this.errors[this.errors.length - 1]!.timestamp;
    }

    // Most common type
    if (Object.keys(stats.byType).length > 0) {
      stats.mostCommonType = Object.entries(stats.byType).reduce((a, b) =>
        b[1] > a[1] ? b : a
      )[0] as ProviderErrorType;
    }

    // Most common provider
    if (Object.keys(stats.byProvider).length > 0) {
      stats.mostCommonProvider = Object.entries(stats.byProvider).reduce((a, b) =>
        b[1] > a[1] ? b : a
      )[0] as ProviderType;
    }

    return stats;
  }

  /**
   * Clear all logged errors
   */
  public clear(): void {
    this.errors = [];
    console.log('Error log cleared');
  }

  /**
   * Get total error count
   */
  public getCount(): number {
    return this.errors.length;
  }

  /**
   * Get all errors
   * Returns a copy to prevent external modification
   */
  public getAllErrors(): ErrorLogEntry[] {
    return [...this.errors];
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

  /**
   * Print error statistics summary
   */
  public printStats(): void {
    const stats = this.getStats();

    console.log('\n' + '='.repeat(70));
    console.log('Error Logger Statistics');
    console.log('='.repeat(70));
    console.log(`Total Errors: ${stats.total}`);

    if (stats.mostRecentError) {
      console.log(`Most Recent: ${stats.mostRecentError.toISOString()}`);
    }

    console.log('\nBy Severity:');
    console.log(`  CRITICAL: ${stats.bySeverity[ErrorSeverity.CRITICAL]}`);
    console.log(`  HIGH:     ${stats.bySeverity[ErrorSeverity.HIGH]}`);
    console.log(`  MEDIUM:   ${stats.bySeverity[ErrorSeverity.MEDIUM]}`);
    console.log(`  LOW:      ${stats.bySeverity[ErrorSeverity.LOW]}`);

    console.log('\nRetryable:');
    console.log(`  Yes: ${stats.retryableCount}`);
    console.log(`  No:  ${stats.nonRetryableCount}`);

    if (Object.keys(stats.byType).length > 0) {
      console.log('\nTop Error Types:');
      const sortedTypes = Object.entries(stats.byType)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
      for (const [type, count] of sortedTypes) {
        console.log(`  ${type}: ${count}`);
      }
    }

    if (Object.keys(stats.byProvider).length > 0) {
      console.log('\nBy Provider:');
      for (const [provider, count] of Object.entries(stats.byProvider)) {
        console.log(`  ${provider}: ${count}`);
      }
    }

    console.log('='.repeat(70) + '\n');
  }

  /**
   * Get max entries setting
   */
  public getMaxEntries(): number {
    return this.maxEntries;
  }

  /**
   * Update max entries
   * If current count exceeds new max, oldest entries are removed
   */
  public setMaxEntries(maxEntries: number): void {
    this.maxEntries = maxEntries;

    if (this.errors.length > maxEntries) {
      const removeCount = this.errors.length - maxEntries;
      this.errors = this.errors.slice(removeCount);
      console.log(`Trimmed ${removeCount} old error entries (new max: ${maxEntries})`);
    }
  }
}
