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
  ClaudeModel,
  ModelConfig,
  getModelConfig,
  isValidModel,
  validateAndGetModel,
  getAvailableModels,
  getRecommendedModel,
} from './models';

/**
 * ClaudeService class
 * Manages Claude API interactions with proper error handling
 */
export class ClaudeService {
  private client: Anthropic;
  private config: ClaudeConfig;
  private initialized: boolean = false;

  constructor() {
    // Load configuration from environment
    this.config = getClaudeConfig();

    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeout,
    });

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
