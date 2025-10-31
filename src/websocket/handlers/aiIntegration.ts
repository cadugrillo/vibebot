/**
 * WebSocket AI Integration
 * Integrates ClaudeProvider with WebSocket message handlers for real-time AI responses
 *
 * VBT-42: AI Provider Abstraction Layer Integration
 */

import { ClaudeProvider } from '../../services/ai/providers/claude';
import { AIProviderFactory } from '../../services/ai/providers/factory';
import { ProviderConfigManager } from '../../services/ai/providers/config';
import { ProviderType, AIMessage, StreamCallback } from '../../services/ai/providers/types';
import { ProviderError, ProviderErrorType } from '../../services/ai/providers/errors';
import { VibeWebSocketServer } from '../server';
import { MessageEventType, MessageStreamEvent } from './messageHandlers';

/**
 * Configuration for AI integration
 */
export interface AIIntegrationConfig {
  /**
   * Default provider to use (default: CLAUDE)
   */
  defaultProvider?: ProviderType;

  /**
   * Default model to use (provider-specific)
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
 */
export class AIIntegrationHandler {
  private wsServer: VibeWebSocketServer;
  private provider: ClaudeProvider | null = null;
  private config: AIIntegrationConfig;
  private conversationHistories: Map<string, AIMessage[]> = new Map();

  constructor(wsServer: VibeWebSocketServer, config?: AIIntegrationConfig) {
    this.wsServer = wsServer;
    this.config = {
      defaultProvider: ProviderType.CLAUDE,
      systemPrompt: undefined, // Use provider's default
      maxTokens: 2048,
      temperature: 0.7,
      ...config,
    };

    console.log('AIIntegrationHandler initialized');
    console.log(`  Default provider: ${this.config.defaultProvider}`);
    console.log(`  Default model: ${this.config.defaultModel || 'auto'}`);
  }

  /**
   * Initialize AI provider
   * Must be called before handling AI requests
   */
  public async initialize(): Promise<void> {
    try {
      console.log('Initializing AI provider...');

      // Get config from environment
      const configManager = ProviderConfigManager.getInstance();
      const providerConfig = configManager.getConfig(
        this.config.defaultProvider || ProviderType.CLAUDE
      );

      // Create provider using factory
      const factory = AIProviderFactory.getInstance();

      // Register ClaudeProvider if not already registered
      const registeredProviders = factory.getRegisteredProviders();
      if (!registeredProviders.includes(ProviderType.CLAUDE)) {
        factory.registerProvider(
          ProviderType.CLAUDE,
          (config) => new ClaudeProvider(config)
        );
      }

      this.provider = factory.createProvider(
        this.config.defaultProvider || ProviderType.CLAUDE,
        providerConfig
      ) as ClaudeProvider;

      // Provider is already initialized in constructor
      console.log('✅ AI provider initialized successfully');
      console.log(`  Provider: ${this.provider.getMetadata().name}`);
    } catch (error) {
      console.error('❌ Failed to initialize AI provider:', error);
      throw error;
    }
  }

  /**
   * Check if provider is ready
   */
  public isReady(): boolean {
    return this.provider !== null;
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
   * Streams response chunks back to all participants via WebSocket
   */
  public async generateAIResponse(context: AIMessageContext): Promise<void> {
    if (!this.provider) {
      throw new Error('AI provider not initialized. Call initialize() first.');
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

      // Stream AI response
      await this.provider.streamMessage(
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
   */
  public getStats() {
    if (!this.provider) {
      return {
        ready: false,
        conversationCount: this.conversationHistories.size,
      };
    }

    const errorLogger = this.provider.getErrorLogger();
    const circuitBreaker = this.provider.getCircuitBreaker();

    return {
      ready: true,
      conversationCount: this.conversationHistories.size,
      errorStats: errorLogger.getStats(),
      circuitBreakerStats: circuitBreaker.getAllStats(),
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
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down AI integration...');

    // Clear all histories
    this.conversationHistories.clear();

    // Provider cleanup (if needed)
    this.provider = null;

    console.log('AI integration shutdown complete');
  }
}
