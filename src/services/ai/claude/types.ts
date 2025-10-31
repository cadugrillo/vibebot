/**
 * TypeScript Types for Claude Service
 * Defines interfaces for requests, responses, and events
 */

import { MessageRole } from '../../../generated/prisma';

/**
 * Message format for Claude API
 */
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Token usage information from Claude API response
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Cost information for a request
 */
export interface CostInfo {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: 'USD';
}

/**
 * Complete message metadata stored in database
 */
export interface MessageMetadata {
  tokenUsage?: TokenUsage;
  cost?: CostInfo;
  model?: string;
  stopReason?: string;
  requestId?: string;
  finishReason?: string;
}

/**
 * Parameters for streaming a Claude response
 */
export interface StreamParams {
  conversationId: string;
  userId: string;
  userMessage: string;
  messageId?: string;
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Stream event emitted during response generation
 */
export interface StreamEvent {
  type: 'start' | 'delta' | 'complete' | 'error';
  content?: string;
  isComplete?: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Rate limit information (VBT-159)
 */
export interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfter?: number;
  limit?: number;
  remaining?: number;
  reset?: Date;
  requestsPerMinute?: number;
  tokensPerMinute?: number;
}

/**
 * Complete response from Claude API
 */
export interface ClaudeResponse {
  content: string;
  messageId: string;
  tokenUsage: TokenUsage;
  cost: CostInfo;
  model: string;
  stopReason: string;
  finishReason?: string;
  rateLimitInfo?: RateLimitInfo; // VBT-159: Rate limit information
}

/**
 * Stream callback function type
 */
export type StreamCallback = (event: StreamEvent) => void;

/**
 * Error severity levels (VBT-160)
 */
export enum ErrorSeverity {
  LOW = 'LOW',         // Minor issues, automatically recoverable
  MEDIUM = 'MEDIUM',   // Requires retry or user attention
  HIGH = 'HIGH',       // Serious error, may need user action
  CRITICAL = 'CRITICAL' // System failure, requires immediate attention
}

/**
 * Error types for Claude service
 */
export enum ClaudeErrorType {
  AUTHENTICATION = 'AUTHENTICATION',     // Invalid API key or auth failure
  INVALID_REQUEST = 'INVALID_REQUEST',   // Malformed request or invalid parameters
  RATE_LIMIT = 'RATE_LIMIT',            // Rate limit exceeded
  BILLING = 'BILLING',                   // Payment or quota issues
  OVERLOADED = 'OVERLOADED',            // Service temporarily overloaded
  TIMEOUT = 'TIMEOUT',                   // Request timeout
  NETWORK = 'NETWORK',                   // Network connectivity issues
  INTERNAL = 'INTERNAL',                 // Internal server error (5xx)
  STREAM_INTERRUPTED = 'STREAM_INTERRUPTED', // VBT-160: Stream was interrupted
  VALIDATION = 'VALIDATION',             // VBT-160: Input validation failure
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',     // VBT-160: Usage quota exceeded
  UNKNOWN = 'UNKNOWN',                   // Unknown error type
}

/**
 * Claude service error (VBT-160: Enhanced with severity and metadata)
 */
export class ClaudeServiceError extends Error {
  public readonly timestamp: Date;
  public readonly severity: ErrorSeverity;

  constructor(
    public type: ClaudeErrorType,
    message: string,
    public statusCode?: number,
    public retryable: boolean = false,
    public rateLimitInfo?: RateLimitInfo, // VBT-159: Optional rate limit info
    severity?: ErrorSeverity, // VBT-160: Error severity
    public context?: Record<string, any> // VBT-160: Additional context for logging
  ) {
    super(message);
    this.name = 'ClaudeServiceError';
    this.timestamp = new Date();
    // Auto-assign severity based on error type if not provided
    this.severity = severity || this.getDefaultSeverity(type);
  }

  /**
   * Get default severity for error type
   */
  private getDefaultSeverity(type: ClaudeErrorType): ErrorSeverity {
    switch (type) {
      case ClaudeErrorType.AUTHENTICATION:
      case ClaudeErrorType.BILLING:
      case ClaudeErrorType.QUOTA_EXCEEDED:
        return ErrorSeverity.CRITICAL;

      case ClaudeErrorType.INVALID_REQUEST:
      case ClaudeErrorType.VALIDATION:
        return ErrorSeverity.HIGH;

      case ClaudeErrorType.RATE_LIMIT:
      case ClaudeErrorType.OVERLOADED:
      case ClaudeErrorType.TIMEOUT:
        return ErrorSeverity.MEDIUM;

      case ClaudeErrorType.NETWORK:
      case ClaudeErrorType.STREAM_INTERRUPTED:
        return ErrorSeverity.LOW;

      case ClaudeErrorType.INTERNAL:
      case ClaudeErrorType.UNKNOWN:
      default:
        return ErrorSeverity.HIGH;
    }
  }

  /**
   * Get user-friendly error message
   */
  public getUserMessage(): string {
    switch (this.type) {
      case ClaudeErrorType.AUTHENTICATION:
        return 'Authentication failed. Please check your API key configuration.';

      case ClaudeErrorType.RATE_LIMIT:
        return this.rateLimitInfo
          ? `Rate limit exceeded. ${this.rateLimitInfo.retryAfter ? `Please try again in ${this.rateLimitInfo.retryAfter} seconds.` : 'Please try again later.'}`
          : 'Rate limit exceeded. Please try again later.';

      case ClaudeErrorType.BILLING:
        return 'Billing issue detected. Please check your account status.';

      case ClaudeErrorType.QUOTA_EXCEEDED:
        return 'Usage quota exceeded. Please upgrade your plan or wait for the quota to reset.';

      case ClaudeErrorType.NETWORK:
        return 'Network connection issue. Please check your internet connection and try again.';

      case ClaudeErrorType.TIMEOUT:
        return 'Request timed out. The server took too long to respond. Please try again.';

      case ClaudeErrorType.OVERLOADED:
        return 'Service is temporarily overloaded. Please try again in a few moments.';

      case ClaudeErrorType.STREAM_INTERRUPTED:
        return 'Stream was interrupted. Attempting to reconnect...';

      case ClaudeErrorType.VALIDATION:
        return 'Invalid input. Please check your request and try again.';

      case ClaudeErrorType.INVALID_REQUEST:
        return 'Invalid request. Please check your input parameters.';

      case ClaudeErrorType.INTERNAL:
        return 'An internal server error occurred. Please try again later.';

      case ClaudeErrorType.UNKNOWN:
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Convert error to loggable object
   */
  public toLogObject(): Record<string, any> {
    return {
      name: this.name,
      type: this.type,
      severity: this.severity,
      message: this.message,
      statusCode: this.statusCode,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      rateLimitInfo: this.rateLimitInfo,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Conversation history entry for building message context
 */
export interface ConversationHistoryEntry {
  role: MessageRole;
  content: string;
  createdAt: Date;
}

/**
 * Convert Prisma MessageRole to Claude message role
 */
export function toClaudeRole(role: MessageRole): 'user' | 'assistant' {
  if (role === 'USER') return 'user';
  if (role === 'ASSISTANT') return 'assistant';
  // SYSTEM messages are handled separately via systemPrompt parameter
  return 'user'; // Fallback
}

/**
 * Build Claude message array from conversation history
 */
export function buildClaudeMessages(
  history: ConversationHistoryEntry[]
): ClaudeMessage[] {
  return history
    .filter((entry) => entry.role !== 'SYSTEM') // Filter out system messages
    .map((entry) => ({
      role: toClaudeRole(entry.role),
      content: entry.content,
    }));
}
