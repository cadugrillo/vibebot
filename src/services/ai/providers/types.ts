/**
 * Unified AI Provider Types
 * VBT-164: Core type definitions for AI provider abstraction layer
 *
 * These types provide a common interface across different AI providers
 * (Claude, OpenAI, etc.) enabling seamless provider switching and multi-provider support.
 */

import { MessageRole } from '../../../generated/prisma';

/**
 * Supported AI provider types
 */
export enum ProviderType {
  CLAUDE = 'CLAUDE',
  OPENAI = 'OPENAI',
}

/**
 * AI message format (unified across providers)
 * Supports user, assistant, and system roles
 */
export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** Optional message name (for function calling context) */
  name?: string;
  /** Optional metadata specific to the provider */
  metadata?: Record<string, any>;
}

/**
 * Token usage information from AI response
 * Unified format across providers
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Optional cached tokens (for providers that support prompt caching) */
  cachedTokens?: number;
}

/**
 * Cost information for a request
 * All costs in USD
 */
export interface CostInfo {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: 'USD';
  /** Optional cached cost (for providers that support prompt caching) */
  cachedCost?: number;
}

/**
 * Rate limit information
 * Unified across providers (fields may be undefined if provider doesn't expose them)
 */
export interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfter?: number;        // Seconds until retry allowed
  limit?: number;             // Rate limit ceiling
  remaining?: number;         // Remaining requests/tokens
  reset?: Date;               // When the rate limit resets
  requestsPerMinute?: number; // RPM limit
  tokensPerMinute?: number;   // TPM limit
  tokensPerDay?: number;      // TPD limit (some providers use daily limits)
}

/**
 * Streaming event emitted during response generation
 * Unified format across all providers
 */
export interface StreamEvent {
  type: 'start' | 'delta' | 'complete' | 'error';
  content?: string;           // Text delta or complete content
  isComplete?: boolean;       // Whether this is the final event
  messageId?: string;         // Message identifier
  error?: string;             // Error message (if type is 'error')
  metadata?: Record<string, any>; // Provider-specific metadata
}

/**
 * Stream callback function type
 */
export type StreamCallback = (event: StreamEvent) => void;

/**
 * Complete AI response
 * Unified across all providers
 */
export interface AIResponse {
  content: string;
  messageId: string;
  tokenUsage: TokenUsage;
  cost: CostInfo;
  model: string;
  stopReason: string;         // 'end_turn', 'max_tokens', 'stop_sequence', etc.
  finishReason?: string;      // Alternative field name (some providers use this)
  rateLimitInfo?: RateLimitInfo;
  provider: ProviderType;     // Which provider generated this response
  /** Additional provider-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Parameters for sending a message (non-streaming)
 */
export interface SendMessageParams {
  conversationId: string;
  userId: string;
  messages: AIMessage[];      // Full conversation history
  messageId?: string;         // Optional message ID
  model?: string;             // Optional model override
  systemPrompt?: string;      // Optional system prompt
  maxTokens?: number;         // Max tokens in response
  temperature?: number;       // Sampling temperature (0-2, typically)
  topP?: number;              // Nucleus sampling
  stopSequences?: string[];   // Stop sequences
  /** Provider-specific options */
  providerOptions?: Record<string, any>;
}

/**
 * Parameters for streaming a message
 */
export interface StreamMessageParams extends SendMessageParams {
  // Inherits all SendMessageParams fields
  // Can add streaming-specific params here if needed in the future
}

/**
 * Provider configuration interface
 * Each provider has its own configuration structure
 */
export interface ProviderConfig {
  /** Provider type */
  provider: ProviderType;
  /** API key for the provider */
  apiKey: string;
  /** Base URL (optional, for custom endpoints or proxies) */
  baseUrl?: string;
  /** Default model to use */
  defaultModel: string;
  /** Maximum tokens for responses */
  maxTokens: number;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Optional organization ID (for providers that support it) */
  organizationId?: string;
  /** Provider-specific options */
  options?: Record<string, any>;
}

/**
 * Model capabilities
 * Indicates what features a model supports
 */
export interface ModelCapabilities {
  /** Supports streaming responses */
  streaming: boolean;
  /** Supports vision/image inputs */
  vision: boolean;
  /** Supports function/tool calling */
  functionCalling: boolean;
  /** Supports prompt caching */
  promptCaching: boolean;
  /** Supports JSON mode */
  jsonMode: boolean;
  /** Maximum context window size */
  contextWindow: number;
  /** Maximum output tokens */
  maxOutputTokens: number;
}

/**
 * Model tier classification
 */
export enum ModelTier {
  ECONOMY = 'ECONOMY',       // Cost-effective, fast
  STANDARD = 'STANDARD',     // Balanced performance/cost
  PREMIUM = 'PREMIUM',       // Highest intelligence/capability
}

/**
 * Model pricing structure
 */
export interface ModelPricing {
  /** Cost per 1M input tokens (USD) */
  input: number;
  /** Cost per 1M output tokens (USD) */
  output: number;
  /** Cost per 1M cached input tokens (USD), if supported */
  cachedInput?: number;
}

/**
 * Unified model configuration
 * Works across all providers
 */
export interface ModelConfig {
  /** Unique model identifier (provider-specific) */
  id: string;
  /** Human-readable model name */
  name: string;
  /** Provider that offers this model */
  provider: ProviderType;
  /** Model tier classification */
  tier: ModelTier;
  /** Description of model capabilities */
  description: string;
  /** Model capabilities */
  capabilities: ModelCapabilities;
  /** Pricing information */
  pricing: ModelPricing;
  /** Release date (YYYY-MM-DD) */
  releaseDate: string;
  /** Whether the model is deprecated */
  deprecated: boolean;
  /** Whether this is a recommended model for general use */
  recommended: boolean;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Provider metadata
 * Information about an AI provider
 */
export interface ProviderMetadata {
  /** Provider type */
  type: ProviderType;
  /** Provider name */
  name: string;
  /** Provider description */
  description: string;
  /** Available models */
  models: ModelConfig[];
  /** Supported capabilities (what the provider supports across all models) */
  capabilities: {
    streaming: boolean;
    vision: boolean;
    functionCalling: boolean;
    promptCaching: boolean;
    jsonMode: boolean;
  };
  /** Provider-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Message metadata stored in database
 * Extended to support multiple providers
 */
export interface MessageMetadata {
  tokenUsage?: TokenUsage;
  cost?: CostInfo;
  model?: string;
  provider?: ProviderType;
  stopReason?: string;
  finishReason?: string;
  requestId?: string;
  rateLimitInfo?: RateLimitInfo;
  /** Provider-specific metadata */
  providerMetadata?: Record<string, any>;
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
 * Convert Prisma MessageRole to unified AI message role
 */
export function toAIMessageRole(role: MessageRole): 'user' | 'assistant' | 'system' {
  switch (role) {
    case 'USER':
      return 'user';
    case 'ASSISTANT':
      return 'assistant';
    case 'SYSTEM':
      return 'system';
    default:
      return 'user'; // Fallback
  }
}

/**
 * Build AI message array from conversation history
 */
export function buildAIMessages(
  history: ConversationHistoryEntry[]
): AIMessage[] {
  return history.map((entry) => ({
    role: toAIMessageRole(entry.role),
    content: entry.content,
  }));
}

/**
 * Calculate cost from token usage and pricing
 */
export function calculateCostFromUsage(
  tokenUsage: TokenUsage,
  pricing: ModelPricing
): CostInfo {
  const inputCost = (tokenUsage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (tokenUsage.outputTokens / 1_000_000) * pricing.output;

  let cachedCost = 0;
  if (tokenUsage.cachedTokens && pricing.cachedInput) {
    cachedCost = (tokenUsage.cachedTokens / 1_000_000) * pricing.cachedInput;
  }

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost + cachedCost,
    currency: 'USD',
    cachedCost: cachedCost > 0 ? cachedCost : undefined,
  };
}
