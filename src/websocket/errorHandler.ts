/**
 * WebSocket Error Handler
 * Centralized error handling, logging, and error categorization
 */

import { ExtendedWebSocket } from './server';
import { StatusHandlers } from './handlers/statusHandlers';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error categories
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  CONNECTION = 'connection',
  MESSAGE = 'message',
  RATE_LIMIT = 'rate_limit',
  VALIDATION = 'validation',
  INTERNAL = 'internal',
  NETWORK = 'network',
}

/**
 * Error details interface
 */
export interface WebSocketError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  message: string;
  originalError?: Error;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Error Handler class
 */
export class WebSocketErrorHandler {
  /**
   * Log error with appropriate severity
   */
  private static logError(error: WebSocketError): void {
    const logData = {
      category: error.category,
      severity: error.severity,
      code: error.code,
      message: error.message,
      userId: error.userId || 'unknown',
      timestamp: error.timestamp.toISOString(),
      metadata: error.metadata,
      stack: error.originalError?.stack,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error('[WebSocket Error - HIGH]', JSON.stringify(logData, null, 2));
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('[WebSocket Error - MEDIUM]', JSON.stringify(logData, null, 2));
        break;
      case ErrorSeverity.LOW:
        console.log('[WebSocket Error - LOW]', JSON.stringify(logData, null, 2));
        break;
    }
  }

  /**
   * Send error to client if connection is open
   */
  private static sendErrorToClient(ws: ExtendedWebSocket, error: WebSocketError): void {
    // Don't send internal server errors to client
    if (error.category === ErrorCategory.INTERNAL) {
      StatusHandlers.sendError(
        ws,
        'An internal error occurred. Please try again.',
        'INTERNAL_ERROR'
      );
      return;
    }

    StatusHandlers.sendError(ws, error.message, error.code);
  }

  /**
   * Handle authentication errors
   */
  public static handleAuthError(
    ws: ExtendedWebSocket,
    message: string,
    originalError?: Error
  ): void {
    const error: WebSocketError = {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      code: 'AUTH_ERROR',
      message,
      originalError,
      userId: ws.userId,
      timestamp: new Date(),
    };

    this.logError(error);
    this.sendErrorToClient(ws, error);
  }

  /**
   * Handle connection errors
   */
  public static handleConnectionError(
    ws: ExtendedWebSocket,
    message: string,
    originalError?: Error,
    metadata?: Record<string, unknown>
  ): void {
    const error: WebSocketError = {
      category: ErrorCategory.CONNECTION,
      severity: ErrorSeverity.HIGH,
      code: 'CONNECTION_ERROR',
      message,
      originalError,
      userId: ws.userId,
      timestamp: new Date(),
      metadata,
    };

    this.logError(error);
    this.sendErrorToClient(ws, error);
  }

  /**
   * Handle message processing errors
   */
  public static handleMessageError(
    ws: ExtendedWebSocket,
    message: string,
    originalError?: Error,
    metadata?: Record<string, unknown>
  ): void {
    const error: WebSocketError = {
      category: ErrorCategory.MESSAGE,
      severity: ErrorSeverity.MEDIUM,
      code: 'MESSAGE_ERROR',
      message,
      originalError,
      userId: ws.userId,
      timestamp: new Date(),
      metadata,
    };

    this.logError(error);
    this.sendErrorToClient(ws, error);
  }

  /**
   * Handle rate limit errors
   */
  public static handleRateLimitError(
    ws: ExtendedWebSocket,
    message: string,
    resetTime?: number
  ): void {
    const error: WebSocketError = {
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.LOW,
      code: 'RATE_LIMIT_EXCEEDED',
      message,
      userId: ws.userId,
      timestamp: new Date(),
      metadata: { resetTime },
    };

    this.logError(error);
    this.sendErrorToClient(ws, error);
  }

  /**
   * Handle validation errors
   */
  public static handleValidationError(
    ws: ExtendedWebSocket,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    const error: WebSocketError = {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      code: 'VALIDATION_ERROR',
      message,
      userId: ws.userId,
      timestamp: new Date(),
      metadata,
    };

    this.logError(error);
    this.sendErrorToClient(ws, error);
  }

  /**
   * Handle internal server errors
   */
  public static handleInternalError(
    ws: ExtendedWebSocket,
    message: string,
    originalError?: Error,
    metadata?: Record<string, unknown>
  ): void {
    const error: WebSocketError = {
      category: ErrorCategory.INTERNAL,
      severity: ErrorSeverity.CRITICAL,
      code: 'INTERNAL_ERROR',
      message,
      originalError,
      userId: ws.userId,
      timestamp: new Date(),
      metadata,
    };

    this.logError(error);
    this.sendErrorToClient(ws, error);
  }

  /**
   * Handle network errors
   */
  public static handleNetworkError(
    ws: ExtendedWebSocket,
    message: string,
    originalError?: Error
  ): void {
    const error: WebSocketError = {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      code: 'NETWORK_ERROR',
      message,
      originalError,
      userId: ws.userId,
      timestamp: new Date(),
    };

    this.logError(error);
    this.sendErrorToClient(ws, error);
  }

  /**
   * Handle generic errors with auto-categorization
   */
  public static handleError(
    ws: ExtendedWebSocket,
    error: Error,
    context?: string
  ): void {
    // Try to categorize error based on message
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('auth') || errorMessage.includes('token')) {
      this.handleAuthError(ws, error.message, error);
    } else if (errorMessage.includes('connect') || errorMessage.includes('socket')) {
      this.handleConnectionError(ws, error.message, error);
    } else if (errorMessage.includes('message') || errorMessage.includes('parse')) {
      this.handleMessageError(ws, error.message, error, { context });
    } else if (errorMessage.includes('rate') || errorMessage.includes('limit')) {
      this.handleRateLimitError(ws, error.message);
    } else if (errorMessage.includes('invalid') || errorMessage.includes('validation')) {
      this.handleValidationError(ws, error.message);
    } else {
      this.handleInternalError(ws, error.message, error, { context });
    }
  }

  /**
   * Determine if error is recoverable
   */
  public static isRecoverable(error: WebSocketError): boolean {
    // Critical and internal errors are typically not recoverable
    if (error.severity === ErrorSeverity.CRITICAL) {
      return false;
    }

    // Authentication errors require re-authentication
    if (error.category === ErrorCategory.AUTHENTICATION) {
      return false;
    }

    // Most other errors are recoverable
    return true;
  }

  /**
   * Get recommended reconnection delay based on error
   */
  public static getReconnectDelay(error: WebSocketError, attemptNumber: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds

    // For rate limit errors, use the reset time if available
    if (error.category === ErrorCategory.RATE_LIMIT && error.metadata?.resetTime) {
      return (error.metadata.resetTime as number) * 1000;
    }

    // For auth errors, reconnect immediately (client needs to re-auth)
    if (error.category === ErrorCategory.AUTHENTICATION) {
      return 0;
    }

    // Exponential backoff for other errors
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);

    // Add jitter (random 0-1000ms) to prevent thundering herd
    const jitter = Math.random() * 1000;

    return delay + jitter;
  }
}
