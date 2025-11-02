/**
 * WebSocket AI Integration
 * Integrates AI providers with WebSocket message handlers for real-time AI responses
 *
 * VBT-42: AI Provider Abstraction Layer Integration
 * VBT-171: Provider Selection Logic Integration
 */

import { ClaudeProvider } from '../../services/ai/providers/claude';
import { IAIProvider } from '../../services/ai/providers/IAIProvider';
import { AIProviderFactory } from '../../services/ai/providers/factory';
import { ProviderConfigManager } from '../../services/ai/providers/config';
import {
  ProviderType,
  AIMessage,
  StreamCallback,
  SelectionContext,
  SelectionStrategyType,
} from '../../services/ai/providers/types';
import { ProviderError, ProviderErrorType } from '../../services/ai/providers/errors';
import { ProviderSelector } from '../../services/ai/providers/selector';
import { FallbackChainManager } from '../../services/ai/providers/fallback';
import { VibeWebSocketServer } from '../server';
import { MessageEventType, MessageStreamEvent } from './messageHandlers';

/**
 * Configuration for AI integration
 */
export interface AIIntegrationConfig {
  /**
   * Default provider selection strategy (default: AUTO)
   */
  selectionStrategy?: SelectionStrategyType;

  /**
   * Default model to use (provider-specific, optional)
   */
  defaultModel?: string;

  /**
   * System prompt preset or custom prompt
   */
  systemPrompt?: string;

  /**
   * Max tokens in AI response
   */
  maxTokens?: number;

  /**
   * Temperature for response generation (0-2)
   */
  temperature?: number;

  /**
   * Enable automatic fallback to alternate providers
   */
  enableFallback?: boolean;
}

/**
 * AI message context
 */
export interface AIMessageContext {
  conversationId: string;
  userId: string;
  messageId: string;
  content: string;
  history?: AIMessage[];
}

/**
 * AI Integration Handler
 * Manages AI provider interactions for WebSocket connections
 * VBT-171: Now supports dynamic provider selection
 */
export class AIIntegrationHandler {
  private wsServer: VibeWebSocketServer;
  private config: AIIntegrationConfig;
  private conversationHistories: Map<string, AIMessage[]> = new Map();

  // VBT-171: New components for provider selection
  private providerSelector: ProviderSelector;
  private providerFactory: AIProviderFactory;
  private fallbackManager: FallbackChainManager;

  constructor(wsServer: VibeWebSocketServer, config?: AIIntegrationConfig) {
    this.wsServer = wsServer;
    this.config = {
      selectionStrategy: SelectionStrategyType.AUTO,
      systemPrompt: undefined, // Use provider's default
      maxTokens: 2048,
      temperature: 0.7,
      enableFallback: true,
      ...config,
    };

    // VBT-171: Initialize selection components
    this.providerSelector = ProviderSelector.getInstance();
    this.providerFactory = AIProviderFactory.getInstance();
    this.fallbackManager = FallbackChainManager.getInstance();

    console.log('AIIntegrationHandler initialized');
    console.log(`  Selection strategy: ${this.config.selectionStrategy}`);
    console.log(`  Default model: ${this.config.defaultModel || 'auto'}`);
    console.log(`  Fallback enabled: ${this.config.enableFallback}`);
  }

  /**
   * Initialize AI providers
   * VBT-171: Now registers all available providers
   */
  public async initialize(): Promise<void> {
    try {
      console.log('Initializing AI providers...');

      // Register ClaudeProvider
      if (!this.providerFactory.isProviderRegistered(ProviderType.CLAUDE)) {
        console.log('  Registering Claude provider...');
        this.providerFactory.registerProvider(
          ProviderType.CLAUDE,
          (config) => new ClaudeProvider(config)
        );
      }

      // Register OpenAI provider (when implemented - VBT-169)
      // if (!this.providerFactory.isProviderRegistered(ProviderType.OPENAI)) {
      //   this.providerFactory.registerProvider(
      //     ProviderType.OPENAI,
      //     (config) => new OpenAIProvider(config)
      //   );
      // }

      console.log('✅ AI providers initialized successfully');
      const providers = this.providerFactory.getRegisteredProviders();
      console.log(`  Registered providers: ${providers.join(', ')}`);
    } catch (error) {
      console.error('❌ Failed to initialize AI providers:', error);
      throw error;
    }
  }

  /**
   * Check if providers are ready
   */
  public isReady(): boolean {
    const providers = this.providerFactory.getRegisteredProviders();
    return providers.length > 0;
  }

  /**
   * VBT-171: Get provider instance for a specific type
   * Creates or retrieves cached provider instance
   */
  private getProviderInstance(providerType: ProviderType): IAIProvider {
    const configManager = ProviderConfigManager.getInstance();
    const providerConfig = configManager.getConfig(providerType);

    return this.providerFactory.createProvider(providerType, providerConfig);
  }

  /**
   * VBT-171: Select appropriate provider for request
   * Uses ProviderSelector to choose best provider
   */
  private selectProvider(context: AIMessageContext): ProviderType {
    const selectionContext: SelectionContext = {
      userId: context.userId,
      conversationId: context.conversationId,
      modelId: this.config.defaultModel,
      strategy: this.config.selectionStrategy,
    };

    return this.providerSelector.selectProvider(selectionContext);
  }

  /**
   * Get or create conversation history
   */
  private getConversationHistory(conversationId: string): AIMessage[] {
    if (!this.conversationHistories.has(conversationId)) {
      this.conversationHistories.set(conversationId, []);
    }
    return this.conversationHistories.get(conversationId)!;
  }

  /**
   * Add message to conversation history
   */
  private addToHistory(conversationId: string, message: AIMessage): void {
    const history = this.getConversationHistory(conversationId);
    history.push(message);

    // Keep last 50 messages to prevent memory issues
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
  }

  /**
   * Clear conversation history
   */
  public clearHistory(conversationId: string): void {
    this.conversationHistories.delete(conversationId);
    console.log(`Cleared history for conversation ${conversationId}`);
  }

  /**
   * Generate AI response with streaming
   * VBT-171: Now uses ProviderSelector and fallback support
   * Streams response chunks back to all participants via WebSocket
   */
  public async generateAIResponse(context: AIMessageContext): Promise<void> {
    if (!this.isReady()) {
      throw new Error('AI providers not initialized. Call initialize() first.');
    }

    const { conversationId, userId, messageId, content } = context;

    try {
      console.log(`Generating AI response for conversation ${conversationId}`);

      // Add user message to history
      this.addToHistory(conversationId, {
        role: 'user',
        content,
      });

      // Get conversation history
      const history = context.history || this.getConversationHistory(conversationId);

      // Generate unique message ID for AI response
      const aiMessageId = `ai-${messageId}`;
      let fullResponse = '';

      // Create streaming callback
      const streamCallback: StreamCallback = (event) => {
        if (event.type === 'start') {
          console.log(`Starting AI response stream for ${conversationId}`);
        } else if (event.type === 'delta' && event.content) {
          fullResponse += event.content;

          // Broadcast stream chunk to conversation
          const streamEvent: MessageStreamEvent = {
            type: MessageEventType.STREAM,
            conversationId,
            content: event.content,
            messageId: aiMessageId,
            isComplete: false,
            timestamp: new Date().toISOString(),
          };

          this.wsServer.sendToConversation(conversationId, streamEvent);
        } else if (event.type === 'complete') {
          console.log(`AI response completed for ${conversationId} (${fullResponse.length} chars)`);

          // Add AI response to history
          this.addToHistory(conversationId, {
            role: 'assistant',
            content: fullResponse,
          });

          // Send completion event
          const completeEvent: MessageStreamEvent = {
            type: MessageEventType.STREAM,
            conversationId,
            content: '', // Empty for completion
            messageId: aiMessageId,
            isComplete: true,
            timestamp: new Date().toISOString(),
          };

          this.wsServer.sendToConversation(conversationId, completeEvent);
        } else if (event.type === 'error') {
          console.error(`AI response error for ${conversationId}:`, event.error);

          // Send error to conversation
          this.wsServer.sendToConversation(conversationId, {
            type: MessageEventType.ERROR,
            messageId: aiMessageId,
            error: event.error || 'Unknown error',
            timestamp: new Date().toISOString(),
          });
        }
      };

      // VBT-171: Select appropriate provider
      const providerType = this.selectProvider(context);
      console.log(`Selected provider: ${providerType}`);

      // VBT-171: Execute with fallback support if enabled
      if (this.config.enableFallback) {
        await this.fallbackManager.executeWithFallback(
          providerType,
          async (provider) => {
            return await provider.streamMessage(
              {
                conversationId,
                userId,
                messages: history,
                messageId: aiMessageId,
                model: this.config.defaultModel,
                systemPrompt: this.config.systemPrompt,
                maxTokens: this.config.maxTokens,
                temperature: this.config.temperature,
              },
              streamCallback
            );
          },
          (type) => this.getProviderInstance(type)
        );
      } else {
        // No fallback - use selected provider directly
        const provider = this.getProviderInstance(providerType);
        await provider.streamMessage(
          {
            conversationId,
            userId,
            messages: history,
            messageId: aiMessageId,
            model: this.config.defaultModel,
            systemPrompt: this.config.systemPrompt,
            maxTokens: this.config.maxTokens,
            temperature: this.config.temperature,
          },
          streamCallback
        );
      }
    } catch (error) {
      console.error('Error generating AI response:', error);

      // Handle provider errors
      if (error instanceof ProviderError) {
        const errorMessage = this.formatProviderError(error);

        this.wsServer.sendToConversation(conversationId, {
          type: MessageEventType.ERROR,
          messageId: `ai-${messageId}`,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Generic error
        this.wsServer.sendToConversation(conversationId, {
          type: MessageEventType.ERROR,
          messageId: `ai-${messageId}`,
          error: 'Failed to generate AI response',
          timestamp: new Date().toISOString(),
        });
      }

      throw error;
    }
  }

  /**
   * Format provider error for user-friendly display
   */
  private formatProviderError(error: ProviderError): string {
    switch (error.type) {
      case ProviderErrorType.AUTHENTICATION:
        return 'AI service authentication failed. Please check API configuration.';

      case ProviderErrorType.RATE_LIMIT:
        return 'AI service rate limit exceeded. Please try again in a moment.';

      case ProviderErrorType.OVERLOADED:
        return 'AI service is temporarily overloaded. Please try again in a moment.';

      case ProviderErrorType.NETWORK:
        return 'Network error connecting to AI service. Please check your connection.';

      case ProviderErrorType.INVALID_REQUEST:
        return 'Invalid request to AI service. Please try rephrasing your message.';

      case ProviderErrorType.CONTENT_FILTER:
        return 'Your message was filtered by content safety policies. Please rephrase.';

      case ProviderErrorType.MODEL_NOT_FOUND:
        return 'The requested AI model is not available.';

      default:
        return `AI service error: ${error.message}`;
    }
  }

  /**
   * Get provider statistics
   * VBT-171: Now returns stats for all registered providers
   */
  public getStats() {
    if (!this.isReady()) {
      return {
        ready: false,
        conversationCount: this.conversationHistories.size,
      };
    }

    const registeredProviders = this.providerFactory.getRegisteredProviders();

    return {
      ready: true,
      conversationCount: this.conversationHistories.size,
      registeredProviders,
      providerCount: registeredProviders.length,
      fallbackStats: this.fallbackManager.getStats(),
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AIIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('AI integration config updated:', config);
  }

  /**
   * Shutdown and cleanup
   * VBT-171: Cleans up all providers via factory
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down AI integration...');

    // Clear all histories
    this.conversationHistories.clear();

    // Clear provider factory cache
    await this.providerFactory.clearCache();

    console.log('AI integration shutdown complete');
  }
}
