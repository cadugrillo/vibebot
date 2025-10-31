/**
 * Claude Service
 * Main service class for Claude API integration
 * VBT-154: Basic setup and initialization
 * VBT-156: Multi-model support
 */

import Anthropic from '@anthropic-ai/sdk';
import { getClaudeConfig, ClaudeConfig } from './config';
import { ClaudeServiceError, ClaudeErrorType } from './types';
import {
  ModelConfig,
  getModelConfig,
  isValidModel,
  validateAndGetModel,
  getAvailableModels,
  getRecommendedModel,
} from './models';
import {
  ClaudeMessage,
  StreamParams,
  StreamCallback,
  ClaudeResponse,
} from './types';
import { processStream } from './streaming';
import { RateLimitHandler, formatRateLimitInfo, logRateLimitEvent } from './rate-limit';
import { CircuitBreakerManager } from './circuit-breaker'; // VBT-160
import { getErrorLogger } from './error-logger'; // VBT-160

/**
 * ClaudeService class
 * Manages Claude API interactions with proper error handling
 */
export class ClaudeService {
  private client: Anthropic;
  private config: ClaudeConfig;
  private initialized: boolean = false;
  private rateLimitHandler: RateLimitHandler; // VBT-159: Rate limit handling
  private circuitBreaker: CircuitBreakerManager; // VBT-160: Circuit breaker
  private errorLogger = getErrorLogger(); // VBT-160: Error logging

  constructor() {
    // Load configuration from environment
    this.config = getClaudeConfig();

    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeout,
    });

    // Initialize rate limit handler (VBT-159)
    this.rateLimitHandler = new RateLimitHandler({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 32000,
      jitterFactor: 0.1,
    });

    // Initialize circuit breaker manager (VBT-160)
    this.circuitBreaker = new CircuitBreakerManager();

    this.initialized = true;
    console.log('ClaudeService initialized successfully');
    console.log(`Default model: ${this.config.defaultModel}`);
    console.log(`Max tokens: ${this.config.maxTokens}`);
    console.log(`Timeout: ${this.config.timeout}ms`);
    console.log(`Max retries: ${this.config.maxRetries}`);
  }

  /**
   * Check if service is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current configuration
   */
  public getConfig(): ClaudeConfig {
    return { ...this.config };
  }

  /**
   * Test connection to Claude API
   * Makes a minimal API call to verify credentials and connectivity
   * @returns True if connection successful
   * @throws ClaudeServiceError if connection fails
   */
  public async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Claude API connection...');

      // Make a minimal API call to verify connection
      const response = await this.client.messages.create({
        model: this.config.defaultModel,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hi',
          },
        ],
      });

      console.log('✅ Claude API connection successful!');
      console.log(`Response ID: ${response.id}`);
      console.log(`Model used: ${response.model}`);
      console.log(`Stop reason: ${response.stop_reason}`);
      console.log(`Token usage: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output`);

      return true;
    } catch (error) {
      console.error('❌ Claude API connection failed:', error);

      // Parse error and throw appropriate ClaudeServiceError
      if (error instanceof Anthropic.AuthenticationError) {
        throw new ClaudeServiceError(
          ClaudeErrorType.AUTHENTICATION,
          'Invalid API key. Please check your ANTHROPIC_API_KEY in .env file.',
          401,
          false
        );
      }

      if (error instanceof Anthropic.RateLimitError) {
        throw new ClaudeServiceError(
          ClaudeErrorType.RATE_LIMIT,
          'Rate limit exceeded. Please try again later.',
          429,
          true
        );
      }

      if (error instanceof Anthropic.APIError) {
        throw new ClaudeServiceError(
          ClaudeErrorType.INTERNAL,
          `Claude API error: ${error.message}`,
          error.status || 500,
          false
        );
      }

      // Generic network or unknown error
      throw new ClaudeServiceError(
        ClaudeErrorType.NETWORK,
        `Failed to connect to Claude API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        true
      );
    }
  }

  /**
   * Get the Anthropic client instance
   * For advanced use cases that need direct client access
   */
  public getClient(): Anthropic {
    return this.client;
  }

  /**
   * Update configuration (useful for testing or dynamic config)
   */
  public updateConfig(partialConfig: Partial<ClaudeConfig>): void {
    this.config = {
      ...this.config,
      ...partialConfig,
    };

    // Recreate client with new config
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeout,
    });

    console.log('ClaudeService configuration updated');
  }

  /**
   * Get current default model
   * VBT-156: Model selection support
   */
  public getDefaultModel(): string {
    return this.config.defaultModel;
  }

  /**
   * Set default model for future requests
   * VBT-156: Model switching capability
   * @param modelId - Claude model identifier
   * @throws ClaudeServiceError if model is invalid
   */
  public setDefaultModel(modelId: string): void {
    // Validate model before setting
    const modelConfig = validateAndGetModel(modelId);

    this.config.defaultModel = modelId;
    console.log(`Default model changed to: ${modelConfig.name} (${modelId})`);
  }

  /**
   * Get model configuration
   * VBT-156: Model information access
   * @param modelId - Optional model ID, defaults to current default model
   * @returns Model configuration or undefined
   */
  public getModelInfo(modelId?: string): ModelConfig | undefined {
    const model = modelId || this.config.defaultModel;
    return getModelConfig(model);
  }

  /**
   * Validate if a model is supported
   * VBT-156: Model validation
   * @param modelId - Model identifier to validate
   * @returns True if model is valid and available
   */
  public isModelValid(modelId: string): boolean {
    return isValidModel(modelId);
  }

  /**
   * Get all available models
   * VBT-156: List available models
   * @returns Array of available model configurations
   */
  public getAvailableModels(): ModelConfig[] {
    return getAvailableModels();
  }

  /**
   * Get recommended model
   * VBT-156: Get default recommended model
   * @returns Recommended model configuration
   */
  public getRecommendedModel(): ModelConfig {
    return getRecommendedModel();
  }

  /**
   * Select model for a specific request
   * VBT-156: Per-request model selection
   * @param modelId - Optional model ID, falls back to default
   * @returns Validated model ID
   * @throws ClaudeServiceError if model is invalid
   */
  public selectModel(modelId?: string): string {
    const selectedModel = modelId || this.config.defaultModel;

    // Validate model
    try {
      validateAndGetModel(selectedModel);
      return selectedModel;
    } catch (error) {
      throw new ClaudeServiceError(
        ClaudeErrorType.INVALID_REQUEST,
        error instanceof Error ? error.message : 'Invalid model selection',
        400,
        false
      );
    }
  }

  /**
   * Categorize Anthropic API errors
   * VBT-160: Enhanced error categorization
   * @param error - Anthropic API error
   * @returns Appropriate Claude error type
   */
  private categorizeAPIError(error: any): ClaudeErrorType {
    const status = error.status;

    if (!status) {
      return ClaudeErrorType.UNKNOWN;
    }

    // 4xx client errors
    if (status >= 400 && status < 500) {
      switch (status) {
        case 401:
        case 403:
          return ClaudeErrorType.AUTHENTICATION;
        case 429:
          return ClaudeErrorType.RATE_LIMIT;
        case 402:
          return ClaudeErrorType.BILLING;
        case 400:
          return ClaudeErrorType.INVALID_REQUEST;
        default:
          return ClaudeErrorType.INVALID_REQUEST;
      }
    }

    // 5xx server errors
    if (status >= 500 && status < 600) {
      switch (status) {
        case 503:
          return ClaudeErrorType.OVERLOADED;
        case 504:
          return ClaudeErrorType.TIMEOUT;
        default:
          return ClaudeErrorType.INTERNAL;
      }
    }

    return ClaudeErrorType.UNKNOWN;
  }

  /**
   * Stream a response from Claude API
   * VBT-157: Streaming response handler
   * @param params - Streaming parameters
   * @param callback - Callback function for stream events
   * @returns Complete response with token usage and cost
   * @throws ClaudeServiceError on API or stream errors
   */
  public async streamResponse(
    params: StreamParams,
    callback: StreamCallback
  ): Promise<ClaudeResponse> {
    const {
      userMessage,
      messageId,
      model,
      systemPrompt,
      maxTokens,
      temperature,
    } = params;

    // Select and validate model
    const selectedModel = this.selectModel(model);
    const modelConfig = getModelConfig(selectedModel);

    if (!modelConfig) {
      throw new ClaudeServiceError(
        ClaudeErrorType.INVALID_REQUEST,
        `Model configuration not found for: ${selectedModel}`,
        400,
        false
      );
    }

    // Build messages array (for now just the user message, later we'll add conversation history)
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // Prepare API request parameters
    const requestParams: Anthropic.MessageCreateParams = {
      model: selectedModel,
      max_tokens: maxTokens || this.config.maxTokens,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: true,
    };

    // Add optional parameters
    if (systemPrompt) {
      requestParams.system = systemPrompt;
    }

    if (temperature !== undefined) {
      requestParams.temperature = temperature;
    }

    console.log(`Streaming response with model: ${selectedModel}`);
    console.log(`Max tokens: ${requestParams.max_tokens}`);
    console.log(`System prompt: ${systemPrompt ? 'Yes' : 'No'}`);

    // VBT-160: Wrap with circuit breaker for fault tolerance
    try {
      const response = await this.circuitBreaker.execute(
        `claude-stream-${selectedModel}`,
        async () => {
          // VBT-159: Wrap API call with rate limit handler for automatic retries
          return await this.rateLimitHandler.executeWithRetry(
            async () => {
              // Create streaming request
              const stream = await this.client.messages.create(requestParams);

              // Process stream with handler
              return await processStream(
                stream as any,
                messageId || `msg-${Date.now()}`,
                callback
              );
            },
            `Stream response for model ${selectedModel}`
          );
        },
        {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 60000,
          monitoringPeriod: 120000,
        }
      );

      console.log(`✅ Stream completed successfully`);
      console.log(`   Token usage: ${response.tokenUsage.inputTokens} input, ${response.tokenUsage.outputTokens} output`);
      console.log(`   Cost: $${response.cost.totalCost.toFixed(4)}`);
      console.log(`   Content length: ${response.content.length} characters`);

      // Add rate limit info (not rate limited if we got here successfully)
      response.rateLimitInfo = { isRateLimited: false };

      return response;
    } catch (error) {
      console.error('❌ Stream failed:', error);

      // VBT-160: Enhanced error handling with logging
      let claudeError: ClaudeServiceError;

      // VBT-159: Handle rate limit errors with detailed info
      if (error instanceof Anthropic.RateLimitError) {
        const rateLimitInfo = this.rateLimitHandler.parseRateLimitError(error);
        logRateLimitEvent(rateLimitInfo, `Stream response for model ${selectedModel}`);

        claudeError = new ClaudeServiceError(
          ClaudeErrorType.RATE_LIMIT,
          formatRateLimitInfo(rateLimitInfo),
          429,
          false, // Not retryable after max retries exceeded
          rateLimitInfo
        );
      }
      // Handle authentication errors
      else if (error instanceof Anthropic.AuthenticationError) {
        claudeError = new ClaudeServiceError(
          ClaudeErrorType.AUTHENTICATION,
          'Invalid API key',
          401,
          false,
          undefined,
          undefined,
          { model: selectedModel, userId: params.userId }
        );
      }
      // Handle API errors (5xx, billing, etc.)
      else if (error instanceof Anthropic.APIError) {
        const errorType = this.categorizeAPIError(error);
        const isRetryable = error.status ? error.status >= 500 : false;

        claudeError = new ClaudeServiceError(
          errorType,
          error.message || 'API error occurred',
          error.status,
          isRetryable,
          undefined,
          undefined,
          {
            model: selectedModel,
            userId: params.userId,
            conversationId: params.conversationId,
          }
        );
      }
      // Handle circuit breaker errors
      else if (error instanceof Error && error.message.includes('Circuit breaker')) {
        claudeError = new ClaudeServiceError(
          ClaudeErrorType.OVERLOADED,
          error.message,
          503,
          false,
          undefined,
          undefined,
          { model: selectedModel }
        );
      }
      // Re-throw ClaudeServiceError (including rate limit errors from handler)
      else if (error instanceof ClaudeServiceError) {
        claudeError = error;
      }
      // Generic error
      else {
        claudeError = new ClaudeServiceError(
          ClaudeErrorType.UNKNOWN,
          error instanceof Error ? error.message : 'Stream failed',
          500,
          true,
          undefined,
          undefined,
          { model: selectedModel, userId: params.userId }
        );
      }

      // VBT-160: Log the error
      this.errorLogger.logError(claudeError, {
        operation: 'streamResponse',
        model: selectedModel,
        userId: params.userId,
        conversationId: params.conversationId,
      });

      throw claudeError;
    }
  }
}

// Singleton instance
let claudeServiceInstance: ClaudeService | null = null;

/**
 * Get singleton instance of ClaudeService
 * Creates instance on first call, returns existing instance on subsequent calls
 */
export function getClaudeService(): ClaudeService {
  if (!claudeServiceInstance) {
    claudeServiceInstance = new ClaudeService();
  }
  return claudeServiceInstance;
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetClaudeService(): void {
  claudeServiceInstance = null;
}
