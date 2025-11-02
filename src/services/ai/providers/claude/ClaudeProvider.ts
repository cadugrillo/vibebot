/**
 * Claude Provider
 * VBT-168: Claude implementation of IAIProvider interface
 *
 * Main provider class for Claude/Anthropic API integration.
 * Now with integrated provider utilities for resilience and management.
 */

import Anthropic from '@anthropic-ai/sdk';
import { IAIProvider } from '../IAIProvider';
import {
  ProviderType,
  ProviderConfig,
  ProviderMetadata,
  ModelConfig,
  AIMessage,
  AIResponse,
  SendMessageParams,
  StreamMessageParams,
  StreamCallback,
  ProviderStatus,
  ProviderRateLimits,
  ModelAvailability,
} from '../types';
import { ProviderError, ProviderErrorType } from '../errors';
import {
  getAllClaudeModels,
  getClaudeModelConfig,
  getRecommendedClaudeModel,
  isValidClaudeModel,
} from './models';
import { ClaudeStreamHandler } from './ClaudeStreamHandler';
import { getClaudeErrorMapper } from './ClaudeErrorMapper';

// Provider utilities
import { RateLimitManager, AnthropicRateLimitHeaderParser } from '../utils/rate-limit';
import { CircuitBreakerManager } from '../utils/circuit-breaker';
import { ErrorLogger } from '../utils/error-logging';
import { SystemPromptManager } from '../utils/system-prompts';

/**
 * Claude Provider options
 * Allows customization of utilities or use of shared instances
 */
export interface ClaudeProviderOptions {
  /**
   * Provider configuration (required)
   */
  config: ProviderConfig;

  /**
   * Utility instances (optional - will create defaults if not provided)
   */
  utilities?: {
    rateLimitManager?: RateLimitManager;
    circuitBreaker?: CircuitBreakerManager;
    errorLogger?: ErrorLogger;
    systemPromptManager?: SystemPromptManager;
  };
}

/**
 * Claude Provider
 * Implements IAIProvider for Claude/Anthropic API
 * Integrated with provider utilities for resilience and management
 */
export class ClaudeProvider implements IAIProvider {
  private client: Anthropic;
  private config: ProviderConfig;
  private initialized: boolean = false;
  private errorMapper = getClaudeErrorMapper();

  // Provider utilities
  private rateLimitManager: RateLimitManager;
  private circuitBreaker: CircuitBreakerManager;
  private errorLogger: ErrorLogger;
  private systemPromptManager: SystemPromptManager;

  /**
   * Create a new Claude provider
   * Supports both simple (ProviderConfig only) and advanced (with utilities) construction
   *
   * @param options - Either a ProviderConfig or ClaudeProviderOptions
   */
  constructor(options: ProviderConfig | ClaudeProviderOptions) {
    // Determine if we got simple config or advanced options
    if (this.isProviderConfig(options)) {
      // Backward compatible: simple ProviderConfig
      this.config = options;
      this.validateConfig(this.config);

      // Create default utility instances
      this.rateLimitManager = new RateLimitManager(
        undefined,
        new AnthropicRateLimitHeaderParser()
      );
      this.circuitBreaker = new CircuitBreakerManager();
      this.errorLogger = new ErrorLogger();
      this.systemPromptManager = new SystemPromptManager();

      console.log('ClaudeProvider utilities: Using defaults');
    } else {
      // Advanced: ClaudeProviderOptions with custom utilities
      this.config = options.config;
      this.validateConfig(this.config);

      // Use provided utilities or create defaults
      this.rateLimitManager = options.utilities?.rateLimitManager ||
        new RateLimitManager(undefined, new AnthropicRateLimitHeaderParser());
      this.circuitBreaker = options.utilities?.circuitBreaker ||
        new CircuitBreakerManager();
      this.errorLogger = options.utilities?.errorLogger ||
        new ErrorLogger();
      this.systemPromptManager = options.utilities?.systemPromptManager ||
        new SystemPromptManager();

      console.log('ClaudeProvider utilities: Using custom/provided instances');
    }

    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeout,
      baseURL: this.config.baseUrl,
    });

    this.initialized = true;
    console.log('ClaudeProvider initialized successfully');
    console.log(`Default model: ${this.config.defaultModel}`);
  }

  /**
   * Type guard to check if options is a simple ProviderConfig
   */
  private isProviderConfig(
    options: ProviderConfig | ClaudeProviderOptions
  ): options is ProviderConfig {
    return 'provider' in options && 'apiKey' in options && !('config' in options);
  }

  /**
   * Get provider type
   */
  public getProviderType(): ProviderType {
    return ProviderType.CLAUDE;
  }

  /**
   * Get provider metadata
   */
  public getMetadata(): ProviderMetadata {
    return {
      type: ProviderType.CLAUDE,
      name: 'Claude (Anthropic)',
      description: 'Anthropic Claude AI models with advanced reasoning capabilities',
      models: getAllClaudeModels(),
      capabilities: {
        streaming: true,
        vision: true,
        functionCalling: true,
        promptCaching: true,
        jsonMode: false,
      },
      metadata: {
        apiVersion: 'v1',
        sdkVersion: '@anthropic-ai/sdk',
      },
    };
  }

  /**
   * Check if provider is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Test connection to Claude API
   */
  public async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Claude API connection...');

      // Make a minimal API call
      const response = await this.client.messages.create({
        model: this.config.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      console.log('✅ Claude API connection successful!');
      console.log(`   Response ID: ${response.id}`);
      console.log(`   Model: ${response.model}`);
      console.log(`   Token usage: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output`);

      return true;
    } catch (error) {
      console.error('❌ Claude API connection failed:', error);
      throw this.errorMapper.mapError(error, {
        operation: 'testConnection',
      });
    }
  }

  /**
   * Send a message (non-streaming)
   * Wrapped with circuit breaker, rate limiting, and error logging
   */
  public async sendMessage(params: SendMessageParams): Promise<AIResponse> {
    const context = {
      operation: 'sendMessage',
      model: params.model,
      userId: params.userId,
      conversationId: params.conversationId,
    };

    try {
      // Validate and select model
      const model = this.selectModel(params.model);

      // Process system prompt with SystemPromptManager
      // Validate and sanitize if provided
      let systemPrompt: string | undefined;
      if (params.systemPrompt) {
        const validation = this.systemPromptManager.validate(params.systemPrompt);
        if (!validation.isValid) {
          throw new ProviderError(
            ProviderErrorType.VALIDATION,
            `Invalid system prompt: ${validation.errors.join(', ')}`,
            {
              retryable: false,
              statusCode: 400,
              context: { validationErrors: validation.errors },
            }
          );
        }
        systemPrompt = this.systemPromptManager.sanitize(params.systemPrompt);
      }

      // Build Claude messages
      const messages = this.buildClaudeMessages(params.messages, systemPrompt);

      // Prepare API request
      const requestParams: Anthropic.MessageCreateParams = {
        model,
        max_tokens: params.maxTokens || this.config.maxTokens,
        messages: messages.messages,
        stream: false,
      };

      // Add system prompt if provided
      if (messages.system) {
        requestParams.system = messages.system;
      }

      // Add optional parameters
      if (params.temperature !== undefined) {
        requestParams.temperature = params.temperature;
      }

      if (params.topP !== undefined) {
        requestParams.top_p = params.topP;
      }

      if (params.stopSequences && params.stopSequences.length > 0) {
        requestParams.stop_sequences = params.stopSequences;
      }

      console.log(`Sending message with model: ${model}`);

      // Execute with circuit breaker and rate limit protection
      const response = await this.circuitBreaker.execute(
        `claude-send-${model}`,
        async () => {
          return await this.rateLimitManager.executeWithRetry(
            async () => {
              return await this.client.messages.create(requestParams);
            },
            `Send message with model ${model}`
          );
        },
        {
          failureThreshold: 5,
          timeout: 60000,
        }
      );

      // Convert to unified response format
      return this.convertToAIResponse(response, params.messageId || `msg-${Date.now()}`);
    } catch (error) {
      console.error('Failed to send message:', error);

      // Map error
      const mappedError = error instanceof ProviderError
        ? error
        : this.errorMapper.mapError(error, context);

      // Log error
      this.errorLogger.logError(mappedError, context);

      throw mappedError;
    }
  }

  /**
   * Stream a message
   * Wrapped with circuit breaker, rate limiting, and error logging
   */
  public async streamMessage(
    params: StreamMessageParams,
    callback: StreamCallback
  ): Promise<AIResponse> {
    const context = {
      operation: 'streamMessage',
      model: params.model,
      userId: params.userId,
      conversationId: params.conversationId,
    };

    try {
      // Validate and select model
      const model = this.selectModel(params.model);

      // Process system prompt with SystemPromptManager
      // Validate and sanitize if provided
      let systemPrompt: string | undefined;
      if (params.systemPrompt) {
        const validation = this.systemPromptManager.validate(params.systemPrompt);
        if (!validation.isValid) {
          throw new ProviderError(
            ProviderErrorType.VALIDATION,
            `Invalid system prompt: ${validation.errors.join(', ')}`,
            {
              retryable: false,
              statusCode: 400,
              context: { validationErrors: validation.errors },
            }
          );
        }
        systemPrompt = this.systemPromptManager.sanitize(params.systemPrompt);
      }

      // Build Claude messages
      const messages = this.buildClaudeMessages(params.messages, systemPrompt);

      // Prepare API request
      const requestParams: Anthropic.MessageCreateParams = {
        model,
        max_tokens: params.maxTokens || this.config.maxTokens,
        messages: messages.messages,
        stream: true,
      };

      // Add system prompt if provided
      if (messages.system) {
        requestParams.system = messages.system;
      }

      // Add optional parameters
      if (params.temperature !== undefined) {
        requestParams.temperature = params.temperature;
      }

      if (params.topP !== undefined) {
        requestParams.top_p = params.topP;
      }

      if (params.stopSequences && params.stopSequences.length > 0) {
        requestParams.stop_sequences = params.stopSequences;
      }

      console.log(`Streaming message with model: ${model}`);

      // Execute with circuit breaker and rate limit protection
      const response = await this.circuitBreaker.execute(
        `claude-stream-${model}`,
        async () => {
          return await this.rateLimitManager.executeWithRetry(
            async () => {
              // Create streaming request
              const stream = await this.client.messages.create(requestParams);

              // Process stream with handler
              const handler = new ClaudeStreamHandler(
                params.messageId || `msg-${Date.now()}`,
                callback
              );

              return await handler.processStream(stream);
            },
            `Stream message with model ${model}`
          );
        },
        {
          failureThreshold: 5,
          timeout: 600000, // 10 minutes for streaming
        }
      );

      console.log('✅ Stream completed successfully');
      console.log(`   Token usage: ${response.tokenUsage.inputTokens} input, ${response.tokenUsage.outputTokens} output`);
      console.log(`   Cost: $${response.cost.totalCost.toFixed(4)}`);

      return response;
    } catch (error) {
      console.error('Failed to stream message:', error);

      // Map error
      const mappedError = error instanceof ProviderError
        ? error
        : this.errorMapper.mapError(error, context);

      // Log error
      this.errorLogger.logError(mappedError, context);

      throw mappedError;
    }
  }

  /**
   * Get available models
   */
  public getAvailableModels(): ModelConfig[] {
    return getAllClaudeModels();
  }

  /**
   * Get model configuration
   */
  public getModelConfig(modelId: string): ModelConfig | undefined {
    return getClaudeModelConfig(modelId);
  }

  /**
   * Validate if model is supported
   */
  public isModelValid(modelId: string): boolean {
    return isValidClaudeModel(modelId);
  }

  /**
   * Get recommended model
   */
  public getRecommendedModel(): ModelConfig {
    return getRecommendedClaudeModel();
  }

  /**
   * Get current configuration
   */
  public getConfig(): ProviderConfig {
    // Return copy with masked API key
    return {
      ...this.config,
      apiKey: this.maskApiKey(this.config.apiKey),
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ProviderConfig>): void {
    // Merge with existing config
    const newConfig = { ...this.config, ...config };

    // Validate new config
    this.validateConfig(newConfig);

    // Update config
    this.config = newConfig;

    // Recreate client if API key or base URL changed
    if (config.apiKey || config.baseUrl || config.maxRetries || config.timeout) {
      this.client = new Anthropic({
        apiKey: newConfig.apiKey,
        maxRetries: newConfig.maxRetries,
        timeout: newConfig.timeout,
        baseURL: newConfig.baseUrl,
      });
      console.log('Claude client recreated with new configuration');
    }

    console.log('ClaudeProvider configuration updated');
  }

  /**
   * Estimate cost for a request
   */
  public estimateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number | null {
    const modelConfig = getClaudeModelConfig(modelId);
    if (!modelConfig) return null;

    const inputCost = (inputTokens / 1_000_000) * modelConfig.pricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelConfig.pricing.output;

    return inputCost + outputCost;
  }

  /**
   * VBT-172: Get current provider status
   * Returns health and availability information from circuit breaker and error logger
   */
  public getProviderStatus(): ProviderStatus {
    const circuitKey = `provider:${ProviderType.CLAUDE}`;
    const breaker = this.circuitBreaker.getBreaker(circuitKey);
    const stats = this.errorLogger.getStats();

    // Get circuit state
    const circuitState = breaker.getState();

    // Get recent errors for analysis
    const recentErrors = this.errorLogger.getRecentErrors(100);

    // Calculate error rate from high/critical severity errors
    const errorCount = recentErrors.filter(
      (e: any) => e.severity === 'HIGH' || e.severity === 'CRITICAL'
    ).length;
    const errorRate = recentErrors.length > 0 ? errorCount / recentErrors.length : 0;

    // Get last success/failure timestamps
    const successEvents = recentErrors.filter((e: any) => e.severity === 'LOW');
    const failureEvents = recentErrors.filter(
      (e: any) => e.severity === 'HIGH' || e.severity === 'CRITICAL'
    );

    const lastSuccess = successEvents.length > 0 ? successEvents[0]?.timestamp : undefined;
    const lastFailure = failureEvents.length > 0 ? failureEvents[0]?.timestamp : undefined;

    // Calculate consecutive failures from recent errors
    let consecutiveFailures = 0;
    for (const error of recentErrors) {
      if ((error as any).severity === 'HIGH' || (error as any).severity === 'CRITICAL') {
        consecutiveFailures++;
      } else {
        break; // Stop on first success
      }
    }

    return {
      available: this.initialized && circuitState === 'CLOSED',
      circuitState: circuitState as 'CLOSED' | 'HALF_OPEN' | 'OPEN',
      initialized: this.initialized,
      authenticated: this.initialized, // Initialized implies auth succeeded
      lastSuccess,
      lastFailure,
      consecutiveFailures,
      errorRate,
      metadata: {
        providerType: ProviderType.CLAUDE,
        totalErrors: stats.total,
        errorsByType: stats.byType,
        errorsBySeverity: stats.bySeverity,
      },
    };
  }

  /**
   * VBT-172: Get current rate limit information
   * Returns rate limit configuration and current usage
   *
   * Note: Anthropic doesn't expose rate limit headers in all responses,
   * so we return documented tier limits and check recent errors for rate limit events.
   */
  public getRateLimitInfo(): ProviderRateLimits {
    // Check for recent rate limit errors
    const recentErrors = this.errorLogger.getRecentErrors(50);
    const rateLimitErrors = recentErrors.filter(
      (e: any) => e.type === 'RATE_LIMIT'
    );
    const isRateLimited = rateLimitErrors.length > 0;

    // Get retry info from most recent rate limit error
    const latestRateLimitError = rateLimitErrors[0];
    const retryAfter = latestRateLimitError?.context?.retryAfter;

    // Anthropic documented rate limits (Build tier defaults)
    // https://docs.anthropic.com/en/api/rate-limits
    return {
      requestsPerMinute: 50, // Build tier default
      tokensPerMinute: 50000, // Build tier default (input)
      tokensPerDay: 1000000, // Build tier default (input)
      currentRequests: undefined, // Not tracked
      currentTokens: undefined, // Not tracked
      windowReset: retryAfter
        ? new Date(Date.now() + retryAfter * 1000)
        : undefined,
      isRateLimited,
      retryAfter,
    };
  }

  /**
   * VBT-172: Check availability of a specific model
   * Returns whether model is currently accessible
   */
  public checkModelAvailability(modelId: string): ModelAvailability {
    const modelConfig = getClaudeModelConfig(modelId);
    const now = new Date();

    if (!modelConfig) {
      return {
        modelId,
        available: false,
        unavailableReason: 'Model not found in registry',
        deprecated: false,
        lastChecked: now,
      };
    }

    return {
      modelId,
      available: !modelConfig.deprecated,
      unavailableReason: modelConfig.deprecated ? 'Model is deprecated' : undefined,
      deprecated: modelConfig.deprecated,
      lastChecked: now,
    };
  }

  /**
   * Clean up resources
   */
  public async destroy(): Promise<void> {
    console.log('Destroying ClaudeProvider');
    this.initialized = false;
    // Anthropic client doesn't require explicit cleanup
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: ProviderConfig): void {
    if (config.provider !== ProviderType.CLAUDE) {
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        'Invalid provider type for ClaudeProvider',
        { retryable: false }
      );
    }

    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        'API key is required',
        { retryable: false }
      );
    }

    if (!config.apiKey.startsWith('sk-ant-')) {
      console.warn('Warning: API key does not appear to be in correct format (expected sk-ant-...)');
    }

    if (!config.defaultModel || !isValidClaudeModel(config.defaultModel)) {
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        `Invalid default model: ${config.defaultModel}`,
        { retryable: false }
      );
    }

    if (config.maxTokens <= 0) {
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        'maxTokens must be greater than 0',
        { retryable: false }
      );
    }

    if (config.timeout <= 0) {
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        'timeout must be greater than 0',
        { retryable: false }
      );
    }

    if (config.maxRetries < 0) {
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        'maxRetries must be 0 or greater',
        { retryable: false }
      );
    }
  }

  /**
   * Select and validate model
   */
  private selectModel(modelId?: string): string {
    const selectedModel = modelId || this.config.defaultModel;

    if (!isValidClaudeModel(selectedModel)) {
      throw new ProviderError(
        ProviderErrorType.MODEL_NOT_FOUND,
        `Model not found or deprecated: ${selectedModel}`,
        { retryable: false }
      );
    }

    return selectedModel;
  }

  /**
   * Build Claude messages from unified messages
   */
  private buildClaudeMessages(
    messages: AIMessage[],
    systemPrompt?: string
  ): { messages: Anthropic.MessageParam[]; system?: string } {
    // Separate system messages from user/assistant messages
    const systemMessages: string[] = [];
    const conversationMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessages.push(msg.content);
      } else {
        conversationMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    // Combine system messages
    const allSystemMessages = systemPrompt
      ? [systemPrompt, ...systemMessages]
      : systemMessages;

    const system = allSystemMessages.length > 0
      ? allSystemMessages.join('\n\n')
      : undefined;

    return {
      messages: conversationMessages,
      system,
    };
  }

  /**
   * Convert Claude response to unified AIResponse
   */
  private convertToAIResponse(
    response: Anthropic.Message,
    messageId: string
  ): AIResponse {
    // Extract text content
    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');

    // Get model config
    const modelConfig = getClaudeModelConfig(response.model);

    // Calculate token usage
    const tokenUsage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    // Calculate cost
    const inputCost = modelConfig
      ? (tokenUsage.inputTokens / 1_000_000) * modelConfig.pricing.input
      : 0;
    const outputCost = modelConfig
      ? (tokenUsage.outputTokens / 1_000_000) * modelConfig.pricing.output
      : 0;

    const cost = {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      currency: 'USD' as const,
    };

    return {
      content,
      messageId,
      tokenUsage,
      cost,
      model: response.model,
      stopReason: response.stop_reason || 'unknown',
      finishReason: response.stop_reason || 'unknown',
      provider: ProviderType.CLAUDE,
      metadata: {
        responseId: response.id,
        modelFamily: modelConfig?.metadata?.family,
        modelTier: modelConfig?.tier,
      },
    };
  }

  /**
   * Get rate limit manager instance
   * Allows external access for monitoring and configuration
   */
  public getRateLimitManager(): RateLimitManager {
    return this.rateLimitManager;
  }

  /**
   * Get circuit breaker manager instance
   * Allows external access for monitoring and configuration
   */
  public getCircuitBreaker(): CircuitBreakerManager {
    return this.circuitBreaker;
  }

  /**
   * Get error logger instance
   * Allows external access for monitoring and statistics
   */
  public getErrorLogger(): ErrorLogger {
    return this.errorLogger;
  }

  /**
   * Get system prompt manager instance
   * Allows external access for preset management
   */
  public getSystemPromptManager(): SystemPromptManager {
    return this.systemPromptManager;
  }

  /**
   * Mask API key for display
   */
  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return '***';
    }
    return `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`;
  }
}
