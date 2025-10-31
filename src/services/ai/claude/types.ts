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
 * Error types for Claude service
 */
export enum ClaudeErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  INVALID_REQUEST = 'INVALID_REQUEST',
  RATE_LIMIT = 'RATE_LIMIT',
  BILLING = 'BILLING',
  OVERLOADED = 'OVERLOADED',
  TIMEOUT = 'TIMEOUT',
  NETWORK = 'NETWORK',
  INTERNAL = 'INTERNAL',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Claude service error
 */
export class ClaudeServiceError extends Error {
  constructor(
    public type: ClaudeErrorType,
    message: string,
    public statusCode?: number,
    public retryable: boolean = false,
    public rateLimitInfo?: RateLimitInfo // VBT-159: Optional rate limit info
  ) {
    super(message);
    this.name = 'ClaudeServiceError';
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
