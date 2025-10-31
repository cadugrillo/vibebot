/**
 * Error Logging Utilities
 * Provider-agnostic error logging with statistics and filtering
 *
 * @example
 * ```typescript
 * import { ErrorLogger } from './utils/error-logging';
 *
 * const errorLogger = new ErrorLogger(1000); // Keep last 1000 errors
 *
 * try {
 *   await provider.sendMessage(params);
 * } catch (error) {
 *   errorLogger.logError(error, { operation: 'sendMessage', userId });
 * }
 *
 * // Get statistics
 * const stats = errorLogger.getStats();
 * console.log(`Total errors: ${stats.total}`);
 * ```
 */

// Main class
export { ErrorLogger } from './ErrorLogger';

// Types
export {
  ErrorLogEntry,
  ErrorStats,
} from './ErrorLogEntry';
