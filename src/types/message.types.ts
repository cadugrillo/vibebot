/**
 * Message Types and DTOs
 * VBT-184: TypeScript interfaces for message operations
 */

import { MessageRole } from '../generated/prisma';

// ============================================================================
// Message Role
// ============================================================================

/**
 * Re-export MessageRole from Prisma for convenience (internal use)
 */
export { MessageRole };

/**
 * Message role for API responses (lowercase to match frontend expectations)
 */
export type MessageRoleAPI = 'user' | 'assistant' | 'system';

// ============================================================================
// Message Metadata
// ============================================================================

/**
 * Token usage information for a message
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Cost information for a message
 */
export interface MessageCost {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string; // e.g., 'USD'
}

/**
 * Model information used for generating a message
 */
export interface ModelInfo {
  provider: string; // 'CLAUDE' | 'OPENAI'
  modelId: string; // e.g., 'claude-sonnet-4-20250514'
  modelName?: string; // Human-readable name
}

/**
 * Complete metadata stored with AI-generated messages
 */
export interface MessageMetadata {
  model?: ModelInfo;
  tokens?: TokenUsage;
  cost?: MessageCost;
  finishReason?: string; // 'stop' | 'length' | 'content_filter' | 'error'
  streamingDuration?: number; // milliseconds
  processingTime?: number; // milliseconds
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Message DTOs
// ============================================================================

/**
 * Request DTO for creating a new message
 * POST /api/messages
 */
export interface CreateMessageDTO {
  conversationId: string;
  content: string;
  modelOverride?: string; // Optional model override for this message
}

/**
 * Response DTO for a single message
 */
export interface MessageResponseDTO {
  id: string;
  conversationId: string;
  userId: string | null;
  role: MessageRoleAPI; // Use lowercase API type for client compatibility
  content: string;
  metadata: MessageMetadata | null;
  createdAt: Date;
}

/**
 * Message with full details (used internally)
 */
export interface MessageWithMetadata extends MessageResponseDTO {
  // Additional fields can be added here if needed
}

// ============================================================================
// Message List Query
// ============================================================================

/**
 * Query parameters for listing messages
 * GET /api/messages?conversationId=xxx&page=1&pageSize=50
 */
export interface ListMessagesQuery {
  conversationId: string;
  page?: number;
  pageSize?: number;
  beforeMessageId?: string; // Cursor-based pagination (optional)
  afterMessageId?: string; // Cursor-based pagination (optional)
}

// ============================================================================
// Paginated Message Response
// ============================================================================

/**
 * Pagination metadata for message lists
 */
export interface MessagePaginationMeta {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Paginated response for message lists
 */
export interface PaginatedMessageResponse {
  data: MessageResponseDTO[];
  pagination: MessagePaginationMeta;
}

// ============================================================================
// Message History for AI Context
// ============================================================================

/**
 * Message format for AI provider context
 * Simplified format for passing to Claude/OpenAI APIs
 */
export interface AIContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Options for building message context
 */
export interface MessageContextOptions {
  conversationId: string;
  maxMessages?: number; // Limit to last N messages
  maxTokens?: number; // Limit by approximate token count
  includeSystemPrompt?: boolean; // Include conversation's system prompt
}

/**
 * Built context ready for AI provider
 */
export interface MessageContext {
  messages: AIContextMessage[];
  systemPrompt?: string;
  totalMessages: number;
  estimatedTokens?: number;
}

// ============================================================================
// WebSocket Message Events
// ============================================================================

/**
 * Message streaming chunk sent via WebSocket
 */
export interface MessageStreamChunk {
  messageId: string;
  conversationId: string;
  delta: string; // Incremental content
  isComplete: boolean;
  metadata?: Partial<MessageMetadata>;
}

/**
 * Message completion event
 */
export interface MessageCompleteEvent {
  messageId: string;
  conversationId: string;
  content: string;
  metadata: MessageMetadata;
  createdAt: Date;
}

/**
 * Message error event
 */
export interface MessageErrorEvent {
  conversationId: string;
  userMessageId?: string;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ============================================================================
// Message Processing Status
// ============================================================================

/**
 * Status of message processing
 */
export type MessageProcessingStatus =
  | 'pending'
  | 'processing'
  | 'streaming'
  | 'completed'
  | 'failed';

/**
 * Message processing state (for async operations)
 */
export interface MessageProcessingState {
  userMessageId: string;
  conversationId: string;
  status: MessageProcessingStatus;
  assistantMessageId?: string;
  startedAt: Date;
  completedAt?: Date;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Parameters for creating a user message in the database
 */
export interface CreateUserMessageParams {
  conversationId: string;
  userId: string;
  content: string;
}

/**
 * Parameters for creating an assistant message in the database
 */
export interface CreateAssistantMessageParams {
  conversationId: string;
  content: string;
  metadata: MessageMetadata;
}

/**
 * Parameters for updating message metadata
 */
export interface UpdateMessageMetadataParams {
  messageId: string;
  metadata: Partial<MessageMetadata>;
}
