/**
 * AI Provider Interface
 * VBT-164: Core interface for AI provider abstraction layer
 *
 * This interface defines the contract that all AI providers must implement.
 * It enables seamless switching between different AI providers (Claude, OpenAI, etc.)
 * and allows the application to work with multiple providers simultaneously.
 */

import {
  AIMessage,
  AIResponse,
  SendMessageParams,
  StreamMessageParams,
  StreamCallback,
  ProviderConfig,
  ProviderType,
  ProviderMetadata,
  ModelConfig,
} from './types';

/**
 * IAIProvider interface
 *
 * All AI providers must implement this interface to integrate with the system.
 * This ensures consistent behavior across different provider implementations.
 *
 * ## Contract & Expected Behaviors:
 *
 * ### Initialization
 * - Provider must be initialized with valid configuration
 * - API keys must be validated (format check, not necessarily full auth)
 * - Invalid configuration should throw errors synchronously during construction
 *
 * ### Message Sending
 * - `sendMessage()` must handle conversation history properly
 * - System prompts should be processed correctly (provider-specific handling)
 * - Errors must be wrapped in provider-agnostic error types
 * - Token usage and costs must be accurately calculated and returned
 *
 * ### Streaming
 * - `streamMessage()` must emit events in real-time as content arrives
 * - Stream events must follow the unified StreamEvent format
 * - Streaming errors must be caught and emitted as error events
 * - Stream must properly clean up resources on completion or error
 *
 * ### Error Handling
 * - All errors must be wrapped in standardized error types
 * - Rate limiting errors must include retry information
 * - Retryable errors must be marked appropriately
 * - Provider-specific error details can be included in metadata
 *
 * ### Resource Management
 * - Providers should implement proper cleanup in destroy()
 * - No memory leaks from unclosed streams or connections
 * - Graceful degradation on network issues
 */
export interface IAIProvider {
  /**
   * Get provider type
   * @returns The type of this provider (CLAUDE, OPENAI, etc.)
   */
  getProviderType(): ProviderType;

  /**
   * Get provider metadata
   * Includes information about the provider, available models, and capabilities
   * @returns Provider metadata
   */
  getMetadata(): ProviderMetadata;

  /**
   * Check if the provider is initialized and ready
   * @returns True if provider is ready to accept requests
   */
  isInitialized(): boolean;

  /**
   * Test connection to the AI provider
   * Makes a minimal API call to verify credentials and connectivity
   *
   * Contract:
   * - Must make actual API call to provider
   * - Should use minimal tokens (small test message)
   * - Must validate API key authenticity
   * - Should complete within reasonable timeout (30s)
   *
   * @returns True if connection successful
   * @throws ProviderError if connection fails
   */
  testConnection(): Promise<boolean>;

  /**
   * Send a message to the AI provider (non-streaming)
   *
   * Contract:
   * - Must respect all parameters (model, temperature, maxTokens, etc.)
   * - Must handle conversation history correctly
   * - Must calculate token usage and costs accurately
   * - Must return complete response or throw error
   * - Should implement automatic retry for retryable errors
   *
   * @param params - Message parameters
   * @returns Complete AI response with content, usage, and cost
   * @throws ProviderError on API errors
   */
  sendMessage(params: SendMessageParams): Promise<AIResponse>;

  /**
   * Stream a message from the AI provider
   *
   * Contract:
   * - Must emit 'start' event when streaming begins
   * - Must emit 'delta' events as content arrives (real-time)
   * - Must emit 'complete' event when stream finishes
   * - Must emit 'error' event on any error
   * - Callback must be called synchronously (no async callbacks)
   * - Must return final response with complete content and metadata
   * - Stream must be cleaned up properly on completion or error
   *
   * @param params - Streaming parameters
   * @param callback - Callback function for stream events
   * @returns Complete AI response after stream completes
   * @throws ProviderError on API errors
   */
  streamMessage(
    params: StreamMessageParams,
    callback: StreamCallback
  ): Promise<AIResponse>;

  /**
   * Get available models for this provider
   * @returns Array of model configurations
   */
  getAvailableModels(): ModelConfig[];

  /**
   * Get configuration for a specific model
   * @param modelId - Model identifier
   * @returns Model configuration or undefined if not found
   */
  getModelConfig(modelId: string): ModelConfig | undefined;

  /**
   * Validate if a model is supported by this provider
   * @param modelId - Model identifier to validate
   * @returns True if model is valid and available
   */
  isModelValid(modelId: string): boolean;

  /**
   * Get the recommended/default model for this provider
   * @returns Recommended model configuration
   */
  getRecommendedModel(): ModelConfig;

  /**
   * Get current provider configuration
   * @returns Current configuration (sensitive fields like API key may be masked)
   */
  getConfig(): ProviderConfig;

  /**
   * Update provider configuration
   *
   * Contract:
   * - Must validate new configuration before applying
   * - Should reinitialize client if API key changes
   * - Should preserve existing config for unspecified fields
   * - Must throw error if new config is invalid
   *
   * @param config - Partial configuration to update
   * @throws Error if configuration is invalid
   */
  updateConfig(config: Partial<ProviderConfig>): void;

  /**
   * Calculate cost for a hypothetical request
   * Useful for cost estimation before making actual API call
   *
   * @param modelId - Model to use for calculation
   * @param inputTokens - Estimated input tokens
   * @param outputTokens - Estimated output tokens
   * @returns Estimated cost in USD, or null if model not found
   */
  estimateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number | null;

  /**
   * Clean up resources
   * Called when provider is no longer needed
   *
   * Contract:
   * - Must cancel any in-progress streams
   * - Must clean up any open connections
   * - Should log cleanup activities
   * - Must not throw errors
   */
  destroy(): Promise<void>;
}

/**
 * Provider initialization options
 * Used when creating a new provider instance
 */
export interface ProviderInitOptions {
  /** Provider configuration */
  config: ProviderConfig;
  /** Optional logger for debugging */
  logger?: Console;
  /** Optional custom HTTP client */
  httpClient?: any;
}
