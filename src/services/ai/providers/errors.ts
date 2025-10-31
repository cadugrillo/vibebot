/**
 * Unified Error Handling for AI Providers
 * VBT-166: Standardize error handling across providers
 *
 * This module provides a unified error handling system that works consistently
 * across all AI providers (Claude, OpenAI, etc.). It standardizes error types,
 * severity levels, retry logic, and error context.
 */

import { ProviderType, RateLimitInfo } from './types';

/**
 * Unified error types across all AI providers
 *
 * These error types are provider-agnostic and cover common error scenarios
 * across different AI APIs.
 */
export enum ProviderErrorType {
  /** Invalid or expired API key / authentication failure */
  AUTHENTICATION = 'AUTHENTICATION',

  /** Malformed request or invalid parameters */
  INVALID_REQUEST = 'INVALID_REQUEST',

  /** Rate limit exceeded (requests per minute/day, tokens per minute, etc.) */
  RATE_LIMIT = 'RATE_LIMIT',

  /** Payment or billing issues (insufficient credits, quota exceeded) */
  BILLING = 'BILLING',

  /** Service temporarily overloaded or unavailable */
  OVERLOADED = 'OVERLOADED',

  /** Request timeout (client-side or server-side) */
  TIMEOUT = 'TIMEOUT',

  /** Network connectivity issues */
  NETWORK = 'NETWORK',

  /** Internal server error (5xx) */
  INTERNAL = 'INTERNAL',

  /** Stream was interrupted or cancelled */
  STREAM_INTERRUPTED = 'STREAM_INTERRUPTED',

  /** Input validation failure */
  VALIDATION = 'VALIDATION',

  /** Usage quota exceeded (different from rate limit) */
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  /** Model not found or not available */
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',

  /** Content filtered or blocked by safety systems */
  CONTENT_FILTER = 'CONTENT_FILTER',

  /** Context length exceeded */
  CONTEXT_LENGTH_EXCEEDED = 'CONTEXT_LENGTH_EXCEEDED',

  /** Unknown or uncategorized error */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Error severity levels
 * Indicates the impact and urgency of an error
 */
export enum ErrorSeverity {
  /** Minor issues, automatically recoverable, no user action needed */
  LOW = 'LOW',

  /** Requires retry or temporary user attention */
  MEDIUM = 'MEDIUM',

  /** Serious error, may need user action (e.g., check API key) */
  HIGH = 'HIGH',

  /** System failure, requires immediate attention (e.g., billing issue) */
  CRITICAL = 'CRITICAL',
}

/**
 * Error context for additional debugging information
 */
export interface ErrorContext {
  /** Provider that generated the error */
  provider?: ProviderType;

  /** Model being used when error occurred */
  model?: string;

  /** User ID (for tracking and logging) */
  userId?: string;

  /** Conversation ID (for tracking and logging) */
  conversationId?: string;

  /** Message ID (for tracking and logging) */
  messageId?: string;

  /** HTTP status code (if applicable) */
  statusCode?: number;

  /** Request ID from provider (for debugging with provider support) */
  requestId?: string;

  /** Operation that failed (e.g., 'sendMessage', 'streamResponse') */
  operation?: string;

  /** Additional provider-specific context */
  [key: string]: any;
}

/**
 * Retry configuration for automatic retry logic
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;

  /** Initial delay before first retry (milliseconds) */
  initialDelay: number;

  /** Maximum delay between retries (milliseconds) */
  maxDelay: number;

  /** Backoff multiplier (exponential backoff) */
  backoffMultiplier: number;

  /** Jitter factor to add randomness (0-1) */
  jitterFactor: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,      // 1 second
  maxDelay: 32000,         // 32 seconds
  backoffMultiplier: 2,    // Double each time
  jitterFactor: 0.1,       // 10% jitter
};

/**
 * Provider Error
 *
 * Unified error class for all AI provider errors.
 * Provides consistent error handling across different providers.
 */
export class ProviderError extends Error {
  /** Timestamp when error occurred */
  public readonly timestamp: Date;

  /** Error severity level */
  public readonly severity: ErrorSeverity;

  /** Error type */
  public readonly type: ProviderErrorType;

  /** Whether this error is retryable */
  public readonly retryable: boolean;

  /** HTTP status code (if applicable) */
  public readonly statusCode?: number;

  /** Rate limit information (if this is a rate limit error) */
  public readonly rateLimitInfo?: RateLimitInfo;

  /** Additional error context */
  public readonly context: ErrorContext;

  /** Original error (if this wraps another error) */
  public readonly originalError?: Error;

  constructor(
    type: ProviderErrorType,
    message: string,
    options: {
      statusCode?: number;
      retryable?: boolean;
      severity?: ErrorSeverity;
      rateLimitInfo?: RateLimitInfo;
      context?: ErrorContext;
      originalError?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'ProviderError';
    this.type = type;
    this.timestamp = new Date();

    // Set fields from options
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? this.getDefaultRetryable(type);
    this.severity = options.severity ?? this.getDefaultSeverity(type);
    this.rateLimitInfo = options.rateLimitInfo;
    this.context = options.context ?? {};
    this.originalError = options.originalError;

    // Maintain stack trace
    if (options.originalError?.stack) {
      this.stack = `${this.stack}\nCaused by: ${options.originalError.stack}`;
    }
  }

  /**
   * Get default severity for an error type
   */
  private getDefaultSeverity(type: ProviderErrorType): ErrorSeverity {
    switch (type) {
      case ProviderErrorType.AUTHENTICATION:
      case ProviderErrorType.BILLING:
      case ProviderErrorType.QUOTA_EXCEEDED:
        return ErrorSeverity.CRITICAL;

      case ProviderErrorType.INVALID_REQUEST:
      case ProviderErrorType.VALIDATION:
      case ProviderErrorType.MODEL_NOT_FOUND:
      case ProviderErrorType.CONTENT_FILTER:
      case ProviderErrorType.CONTEXT_LENGTH_EXCEEDED:
        return ErrorSeverity.HIGH;

      case ProviderErrorType.RATE_LIMIT:
      case ProviderErrorType.OVERLOADED:
      case ProviderErrorType.TIMEOUT:
        return ErrorSeverity.MEDIUM;

      case ProviderErrorType.NETWORK:
      case ProviderErrorType.STREAM_INTERRUPTED:
        return ErrorSeverity.LOW;

      case ProviderErrorType.INTERNAL:
      case ProviderErrorType.UNKNOWN:
      default:
        return ErrorSeverity.HIGH;
    }
  }

  /**
   * Get default retryable flag for an error type
   */
  private getDefaultRetryable(type: ProviderErrorType): boolean {
    switch (type) {
      // Retryable errors (transient)
      case ProviderErrorType.RATE_LIMIT:
      case ProviderErrorType.OVERLOADED:
      case ProviderErrorType.TIMEOUT:
      case ProviderErrorType.NETWORK:
      case ProviderErrorType.STREAM_INTERRUPTED:
      case ProviderErrorType.INTERNAL:
        return true;

      // Non-retryable errors (permanent)
      case ProviderErrorType.AUTHENTICATION:
      case ProviderErrorType.INVALID_REQUEST:
      case ProviderErrorType.BILLING:
      case ProviderErrorType.VALIDATION:
      case ProviderErrorType.QUOTA_EXCEEDED:
      case ProviderErrorType.MODEL_NOT_FOUND:
      case ProviderErrorType.CONTENT_FILTER:
      case ProviderErrorType.CONTEXT_LENGTH_EXCEEDED:
        return false;

      case ProviderErrorType.UNKNOWN:
      default:
        return false; // Don't retry unknown errors by default
    }
  }

  /**
   * Get user-friendly error message
   * Returns a message appropriate for displaying to end users
   */
  public getUserMessage(): string {
    switch (this.type) {
      case ProviderErrorType.AUTHENTICATION:
        return 'Authentication failed. Please check your API key configuration.';

      case ProviderErrorType.RATE_LIMIT:
        return this.rateLimitInfo?.retryAfter
          ? `Rate limit exceeded. Please try again in ${this.rateLimitInfo.retryAfter} seconds.`
          : 'Rate limit exceeded. Please try again later.';

      case ProviderErrorType.BILLING:
        return 'Billing issue detected. Please check your account status and payment method.';

      case ProviderErrorType.QUOTA_EXCEEDED:
        return 'Usage quota exceeded. Please upgrade your plan or wait for the quota to reset.';

      case ProviderErrorType.NETWORK:
        return 'Network connection issue. Please check your internet connection and try again.';

      case ProviderErrorType.TIMEOUT:
        return 'Request timed out. The server took too long to respond. Please try again.';

      case ProviderErrorType.OVERLOADED:
        return 'Service is temporarily overloaded. Please try again in a few moments.';

      case ProviderErrorType.STREAM_INTERRUPTED:
        return 'Stream was interrupted. Attempting to reconnect...';

      case ProviderErrorType.VALIDATION:
        return 'Invalid input. Please check your request and try again.';

      case ProviderErrorType.INVALID_REQUEST:
        return 'Invalid request. Please check your input parameters.';

      case ProviderErrorType.MODEL_NOT_FOUND:
        return 'The requested AI model was not found or is not available.';

      case ProviderErrorType.CONTENT_FILTER:
        return 'Content was filtered due to safety policies. Please modify your input.';

      case ProviderErrorType.CONTEXT_LENGTH_EXCEEDED:
        return 'Message is too long. Please reduce the length of your input or conversation history.';

      case ProviderErrorType.INTERNAL:
        return 'An internal server error occurred. Please try again later.';

      case ProviderErrorType.UNKNOWN:
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Convert error to loggable object
   * Useful for structured logging
   */
  public toLogObject(): Record<string, any> {
    return {
      name: this.name,
      type: this.type,
      severity: this.severity,
      message: this.message,
      userMessage: this.getUserMessage(),
      statusCode: this.statusCode,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      rateLimitInfo: this.rateLimitInfo,
      context: this.context,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: this.originalError.stack,
          }
        : undefined,
    };
  }

  /**
   * Convert error to JSON (for API responses)
   */
  public toJSON(): Record<string, any> {
    return {
      error: {
        type: this.type,
        severity: this.severity,
        message: this.getUserMessage(), // User-friendly message
        retryable: this.retryable,
        timestamp: this.timestamp.toISOString(),
        statusCode: this.statusCode,
        rateLimitInfo: this.rateLimitInfo,
        // Don't include sensitive context in JSON
        requestId: this.context.requestId,
      },
    };
  }

  /**
   * Check if this error should be retried
   * @param attemptNumber - Current attempt number (1-indexed)
   * @param config - Retry configuration
   * @returns True if should retry
   */
  public shouldRetry(attemptNumber: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
    if (!this.retryable) {
      return false;
    }

    if (attemptNumber >= config.maxRetries) {
      return false;
    }

    return true;
  }

  /**
   * Calculate delay before next retry
   * Uses exponential backoff with jitter
   *
   * @param attemptNumber - Current attempt number (1-indexed)
   * @param config - Retry configuration
   * @returns Delay in milliseconds
   */
  public getRetryDelay(attemptNumber: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
    // If rate limited, use the retry-after value
    if (this.type === ProviderErrorType.RATE_LIMIT && this.rateLimitInfo?.retryAfter) {
      return this.rateLimitInfo.retryAfter * 1000; // Convert to milliseconds
    }

    // Exponential backoff: initialDelay * (backoffMultiplier ^ attemptNumber)
    let delay = config.initialDelay * Math.pow(config.backoffMultiplier, attemptNumber - 1);

    // Cap at max delay
    delay = Math.min(delay, config.maxDelay);

    // Add jitter (random variation to prevent thundering herd)
    const jitter = delay * config.jitterFactor * (Math.random() - 0.5) * 2;
    delay += jitter;

    return Math.max(0, Math.round(delay));
  }
}

/**
 * Error mapper interface
 * Used to map provider-specific errors to unified ProviderError
 */
export interface ErrorMapper {
  /**
   * Map a provider-specific error to ProviderError
   * @param error - Original error from provider
   * @param context - Additional context
   * @returns Unified ProviderError
   */
  mapError(error: any, context?: ErrorContext): ProviderError;
}

/**
 * HTTP status code to error type mapping
 * Common mapping used by most providers
 */
export function mapHttpStatusToErrorType(statusCode: number): ProviderErrorType {
  if (statusCode >= 400 && statusCode < 500) {
    switch (statusCode) {
      case 401:
      case 403:
        return ProviderErrorType.AUTHENTICATION;
      case 429:
        return ProviderErrorType.RATE_LIMIT;
      case 402:
        return ProviderErrorType.BILLING;
      case 400:
        return ProviderErrorType.INVALID_REQUEST;
      case 404:
        return ProviderErrorType.MODEL_NOT_FOUND;
      case 413:
        return ProviderErrorType.CONTEXT_LENGTH_EXCEEDED;
      default:
        return ProviderErrorType.INVALID_REQUEST;
    }
  }

  if (statusCode >= 500 && statusCode < 600) {
    switch (statusCode) {
      case 503:
        return ProviderErrorType.OVERLOADED;
      case 504:
        return ProviderErrorType.TIMEOUT;
      default:
        return ProviderErrorType.INTERNAL;
    }
  }

  return ProviderErrorType.UNKNOWN;
}

/**
 * Create a ProviderError from an HTTP status code
 */
export function createErrorFromStatus(
  statusCode: number,
  message: string,
  context?: ErrorContext
): ProviderError {
  const type = mapHttpStatusToErrorType(statusCode);

  return new ProviderError(type, message, {
    statusCode,
    context,
  });
}

/**
 * Enrich error context with additional information
 */
export function enrichErrorContext(
  error: ProviderError,
  additionalContext: Partial<ErrorContext>
): ProviderError {
  return new ProviderError(error.type, error.message, {
    statusCode: error.statusCode,
    retryable: error.retryable,
    severity: error.severity,
    rateLimitInfo: error.rateLimitInfo,
    context: {
      ...error.context,
      ...additionalContext,
    },
    originalError: error.originalError,
  });
}

/**
 * Check if an error is a ProviderError
 */
export function isProviderError(error: any): error is ProviderError {
  return error instanceof ProviderError;
}

/**
 * Wrap any error as a ProviderError
 * Useful for catching and standardizing unexpected errors
 */
export function wrapError(
  error: any,
  context?: ErrorContext
): ProviderError {
  // If already a ProviderError, optionally enrich context
  if (isProviderError(error)) {
    return context ? enrichErrorContext(error, context) : error;
  }

  // If it's a standard Error, wrap it
  if (error instanceof Error) {
    return new ProviderError(
      ProviderErrorType.UNKNOWN,
      error.message,
      {
        context,
        originalError: error,
      }
    );
  }

  // If it's something else (string, object, etc.)
  const message = typeof error === 'string' ? error : 'An unknown error occurred';
  return new ProviderError(ProviderErrorType.UNKNOWN, message, { context });
}
