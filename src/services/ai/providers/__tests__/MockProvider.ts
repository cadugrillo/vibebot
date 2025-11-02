/**
 * Mock AI Provider
 * VBT-173: Mock implementation for testing without real API calls
 *
 * Implements IAIProvider interface with configurable behavior for testing.
 */

import { IAIProvider } from '../IAIProvider';
import {
  ProviderType,
  ProviderConfig,
  ProviderMetadata,
  ModelConfig,
  AIResponse,
  SendMessageParams,
  StreamMessageParams,
  StreamCallback,
  ProviderStatus,
  ProviderRateLimits,
  ModelAvailability,
  TokenUsage,
  CostInfo,
  ModelTier,
} from '../types';
import { ProviderError, ProviderErrorType } from '../errors';

/**
 * Mock provider configuration
 */
export interface MockProviderConfig {
  /** Whether to simulate errors */
  simulateError?: boolean;

  /** Error type to simulate */
  errorType?: ProviderErrorType;

  /** Delay in ms before responding */
  responseDelay?: number;

  /** Mock response content */
  mockResponse?: string;

  /** Whether provider is initialized */
  initialized?: boolean;
}

/**
 * Mock AI Provider
 * Useful for testing without making real API calls
 */
export class MockProvider implements IAIProvider {
  private config: ProviderConfig;
  private mockConfig: MockProviderConfig;
  private initialized: boolean = false;
  private callCount: number = 0;

  // Mock models
  private static readonly MOCK_MODELS: ModelConfig[] = [
    {
      id: 'mock-model-fast',
      name: 'Mock Fast Model',
      provider: ProviderType.CLAUDE,
      tier: ModelTier.ECONOMY,
      description: 'Fast mock model for testing',
      capabilities: {
        streaming: true,
        vision: false,
        functionCalling: false,
        promptCaching: false,
        jsonMode: false,
        contextWindow: 8000,
        maxOutputTokens: 2000,
      },
      pricing: {
        input: 0.25,
        output: 1.25,
      },
      releaseDate: '2025-01-01',
      deprecated: false,
      recommended: true,
    },
    {
      id: 'mock-model-smart',
      name: 'Mock Smart Model',
      provider: ProviderType.CLAUDE,
      tier: ModelTier.PREMIUM,
      description: 'Smart mock model for testing',
      capabilities: {
        streaming: true,
        vision: true,
        functionCalling: true,
        promptCaching: true,
        jsonMode: true,
        contextWindow: 200000,
        maxOutputTokens: 8000,
      },
      pricing: {
        input: 3.0,
        output: 15.0,
      },
      releaseDate: '2025-01-01',
      deprecated: false,
      recommended: false,
    },
  ];

  constructor(config: ProviderConfig, mockConfig: MockProviderConfig = {}) {
    this.config = config;
    this.mockConfig = mockConfig;
    this.initialized = mockConfig.initialized ?? true;
  }

  public getProviderType(): ProviderType {
    return this.config.provider;
  }

  public getMetadata(): ProviderMetadata {
    return {
      type: this.config.provider,
      name: 'Mock Provider',
      description: 'Mock provider for testing',
      models: MockProvider.MOCK_MODELS,
      capabilities: {
        streaming: true,
        vision: true,
        functionCalling: true,
        promptCaching: true,
        jsonMode: true,
      },
    };
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async testConnection(): Promise<boolean> {
    if (this.mockConfig.simulateError) {
      throw new ProviderError(
        this.mockConfig.errorType || ProviderErrorType.NETWORK,
        'Mock connection test failed',
        { retryable: true }
      );
    }
    return true;
  }

  public async sendMessage(params: SendMessageParams): Promise<AIResponse> {
    this.callCount++;

    if (!this.initialized) {
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        'Provider not initialized',
        { retryable: false }
      );
    }

    if (this.mockConfig.simulateError) {
      throw new ProviderError(
        this.mockConfig.errorType || ProviderErrorType.INTERNAL,
        'Mock error',
        { retryable: true }
      );
    }

    // Simulate delay
    if (this.mockConfig.responseDelay) {
      await new Promise((resolve) => setTimeout(resolve, this.mockConfig.responseDelay));
    }

    const content = this.mockConfig.mockResponse || `Mock response to: ${params.messages[params.messages.length - 1]?.content}`;
    const inputTokens = this.estimateTokens(params.messages.map((m) => m.content).join(' '));
    const outputTokens = this.estimateTokens(content);

    const tokenUsage: TokenUsage = {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };

    const cost: CostInfo = {
      inputCost: (inputTokens / 1_000_000) * 0.25,
      outputCost: (outputTokens / 1_000_000) * 1.25,
      totalCost: 0,
      currency: 'USD',
    };
    cost.totalCost = cost.inputCost + cost.outputCost;

    return {
      content,
      messageId: `mock-msg-${this.callCount}`,
      tokenUsage,
      cost,
      model: params.model || this.config.defaultModel,
      stopReason: 'end_turn',
      provider: this.config.provider,
    };
  }

  public async streamMessage(
    params: StreamMessageParams,
    callback: StreamCallback
  ): Promise<AIResponse> {
    this.callCount++;

    if (!this.initialized) {
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        'Provider not initialized',
        { retryable: false }
      );
    }

    if (this.mockConfig.simulateError) {
      callback({
        type: 'error',
        error: 'Mock streaming error',
      });
      throw new ProviderError(
        this.mockConfig.errorType || ProviderErrorType.INTERNAL,
        'Mock streaming error',
        { retryable: true }
      );
    }

    // Emit start event
    callback({
      type: 'start',
      messageId: `mock-msg-${this.callCount}`,
    });

    // Simulate streaming with delays
    const content = this.mockConfig.mockResponse || `Mock streamed response to: ${params.messages[params.messages.length - 1]?.content}`;
    const words = content.split(' ');
    const delayPerWord = this.mockConfig.responseDelay ? this.mockConfig.responseDelay / words.length : 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word) {
        callback({
          type: 'delta',
          content: word + (i < words.length - 1 ? ' ' : ''),
          isComplete: false,
        });

        // Small delay between words
        if (delayPerWord > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayPerWord));
        }
      }
    }

    // Emit complete event
    callback({
      type: 'complete',
      content,
      isComplete: true,
      messageId: `mock-msg-${this.callCount}`,
    });

    // Return final response
    return this.sendMessage(params);
  }

  public getAvailableModels(): ModelConfig[] {
    return MockProvider.MOCK_MODELS;
  }

  public getModelConfig(modelId: string): ModelConfig | undefined {
    return MockProvider.MOCK_MODELS.find((m) => m.id === modelId);
  }

  public isModelValid(modelId: string): boolean {
    return MockProvider.MOCK_MODELS.some((m) => m.id === modelId);
  }

  public getRecommendedModel(): ModelConfig {
    const recommended = MockProvider.MOCK_MODELS.find((m) => m.recommended);
    return recommended || MockProvider.MOCK_MODELS[0]!;
  }

  public getConfig(): ProviderConfig {
    return {
      ...this.config,
      apiKey: '***masked***',
    };
  }

  public updateConfig(config: Partial<ProviderConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  public estimateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number | null {
    const model = this.getModelConfig(modelId);
    if (!model) return null;

    const inputCost = (inputTokens / 1_000_000) * model.pricing.input;
    const outputCost = (outputTokens / 1_000_000) * model.pricing.output;

    return inputCost + outputCost;
  }

  public getProviderStatus(): ProviderStatus {
    return {
      available: this.initialized,
      circuitState: 'CLOSED',
      initialized: this.initialized,
      authenticated: this.initialized,
      consecutiveFailures: 0,
      errorRate: 0,
      metadata: {
        callCount: this.callCount,
      },
    };
  }

  public getRateLimitInfo(): ProviderRateLimits {
    return {
      requestsPerMinute: 1000,
      tokensPerMinute: 100000,
      tokensPerDay: 10000000,
      isRateLimited: false,
    };
  }

  public checkModelAvailability(modelId: string): ModelAvailability {
    const model = this.getModelConfig(modelId);
    return {
      modelId,
      available: model !== undefined,
      deprecated: model?.deprecated || false,
      unavailableReason: model ? undefined : 'Model not found',
      lastChecked: new Date(),
    };
  }

  public async destroy(): Promise<void> {
    this.initialized = false;
  }

  /**
   * Test utility: Get call count
   */
  public getCallCount(): number {
    return this.callCount;
  }

  /**
   * Test utility: Reset call count
   */
  public resetCallCount(): void {
    this.callCount = 0;
  }

  /**
   * Test utility: Update mock configuration
   */
  public updateMockConfig(config: Partial<MockProviderConfig>): void {
    this.mockConfig = {
      ...this.mockConfig,
      ...config,
    };
  }

  /**
   * Simple token estimation (very rough)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
