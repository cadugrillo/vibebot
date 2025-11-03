/**
 * AI Message Processor Service
 * VBT-189: Integrates AI response processing with message API
 * Handles context building, AI provider selection, streaming, and persistence
 */

import { getMessageService } from './message.service';
import { buildMessageContext } from '../utils/message-context.utils';
import { AIProviderFactory } from './ai/providers/factory';
import { ProviderType } from './ai/providers/types';
import { MessageMetadata, MessageStreamChunk } from '../types/message.types';
import { wsServer } from '../server';
import prisma from '../config/database';

/**
 * Options for processing an AI message
 */
export interface ProcessMessageOptions {
  conversationId: string;
  userMessageId: string;
  userId: string;
  modelOverride?: string;
}

/**
 * Result of AI message processing
 */
export interface ProcessMessageResult {
  assistantMessageId: string;
  content: string;
  metadata: MessageMetadata;
  success: boolean;
  error?: string;
}

/**
 * AI Message Processor Service
 * VBT-189: Core service for processing AI responses
 */
export class AIMessageProcessorService {
  /**
   * Process a user message and generate AI response
   * VBT-189: Main processing flow
   *
   * @param options - Processing options
   * @returns Processing result
   */
  async processMessage(
    options: ProcessMessageOptions
  ): Promise<ProcessMessageResult> {
    const { conversationId, userMessageId, userId, modelOverride } = options;

    const startTime = Date.now();
    let assistantMessageId: string | null = null;
    let fullContent = '';

    try {
      // Step 1: Get conversation details
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Step 2: Build context from message history
      console.log(`🔨 Building context for conversation ${conversationId}...`);
      const context = await buildMessageContext({
        conversationId,
        maxMessages: 50, // Last 50 messages
        includeSystemPrompt: true,
      });

      console.log(
        `✅ Context built: ${context.totalMessages} messages, ~${context.estimatedTokens} tokens`
      );

      // Step 3: Select AI provider
      const factory = AIProviderFactory.getInstance();
      const modelToUse = modelOverride || conversation.model || 'auto';

      console.log(`🤖 Selecting AI provider for model: ${modelToUse}`);

      // Get Claude API key from environment
      const claudeApiKey = process.env.ANTHROPIC_API_KEY;
      if (!claudeApiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set');
      }

      // Create provider with config
      const provider = factory.createProvider(ProviderType.CLAUDE, {
        provider: ProviderType.CLAUDE,
        apiKey: claudeApiKey,
        defaultModel: modelToUse === 'auto' ? 'claude-sonnet-4-5-20250929' : modelToUse,
        maxTokens: 4096,
        timeout: 120000, // 2 minutes
        maxRetries: 3,
      });

      // Step 4: Prepare streaming callback
      let chunkCount = 0;

      const streamCallback = (event: { type: string; content?: string; isComplete?: boolean }) => {
        // Only process delta events
        if (event.type === 'delta' && event.content) {
          chunkCount++;
          fullContent += event.content;

          // Send stream chunk via WebSocket
          const streamChunk: MessageStreamChunk = {
            messageId: assistantMessageId || 'pending',
            conversationId,
            delta: event.content,
            isComplete: event.isComplete || false,
          };

          // Broadcast to all connections for this conversation
          wsServer.sendToConversation(conversationId, {
            type: 'message:stream',
            ...streamChunk,
          });

          if (chunkCount % 10 === 0) {
            console.log(
              `📨 Streamed ${chunkCount} chunks, ${fullContent.length} chars total`
            );
          }
        }
      };

      // Step 5: Call AI provider with streaming
      console.log(`🚀 Starting AI generation with streaming...`);
      const aiResponse = await provider.streamMessage(
        {
          conversationId,
          userId,
          messages: context.messages,
          systemPrompt: context.systemPrompt,
          model: modelToUse === 'auto' ? undefined : modelToUse,
          messageId: userMessageId,
        },
        streamCallback
      );

      const processingTime = Date.now() - startTime;

      // Step 6: Build metadata
      const metadata: MessageMetadata = {
        model: {
          provider: 'CLAUDE',
          modelId: aiResponse.model || modelToUse,
        },
        tokens: aiResponse.tokenUsage
          ? {
              promptTokens: aiResponse.tokenUsage.inputTokens,
              completionTokens: aiResponse.tokenUsage.outputTokens,
              totalTokens:
                aiResponse.tokenUsage.inputTokens + aiResponse.tokenUsage.outputTokens,
            }
          : undefined,
        cost: aiResponse.cost
          ? {
              inputCost: aiResponse.cost.inputCost,
              outputCost: aiResponse.cost.outputCost,
              totalCost: aiResponse.cost.totalCost,
              currency: 'USD',
            }
          : undefined,
        finishReason: aiResponse.stopReason || 'stop',
        streamingDuration: processingTime,
        processingTime,
      };

      // Step 7: Save assistant message to database
      console.log(`💾 Saving assistant message to database...`);
      const messageService = getMessageService();
      const assistantMessage = await messageService.createAssistantMessage({
        conversationId,
        content: fullContent,
        metadata,
      });

      assistantMessageId = assistantMessage.id;
      console.log(`✅ Assistant message saved: ${assistantMessageId}`);

      // Step 8: Send completion event via WebSocket
      wsServer.sendToConversation(conversationId, {
        type: 'message:complete',
        messageId: assistantMessageId,
        conversationId,
        content: fullContent,
        metadata,
        createdAt: assistantMessage.createdAt,
      });

      console.log(
        `🎉 Message processing complete: ${fullContent.length} chars in ${processingTime}ms`
      );

      return {
        assistantMessageId,
        content: fullContent,
        metadata,
        success: true,
      };
    } catch (error) {
      console.error('❌ Error processing AI message:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Send error event via WebSocket
      wsServer.sendToConversation(conversationId, {
        type: 'message:error',
        conversationId,
        userMessageId,
        error: {
          code: 'AI_PROCESSING_ERROR',
          message: errorMessage,
          details: error,
        },
      });

      // Still save assistant message with error metadata if we got partial content
      if (fullContent.length > 0 && !assistantMessageId) {
        const metadata: MessageMetadata = {
          error: {
            code: 'PARTIAL_RESPONSE',
            message: errorMessage,
          },
          processingTime: Date.now() - startTime,
        };

        const messageService = getMessageService();
        const assistantMessage = await messageService.createAssistantMessage({
          conversationId,
          content: fullContent,
          metadata,
        });

        assistantMessageId = assistantMessage.id;
      }

      return {
        assistantMessageId: assistantMessageId || '',
        content: fullContent,
        metadata: {
          error: {
            code: 'AI_PROCESSING_ERROR',
            message: errorMessage,
          },
          processingTime: Date.now() - startTime,
        },
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Process message asynchronously (fire and forget)
   * VBT-189: Non-blocking processing for REST endpoint
   *
   * @param options - Processing options
   */
  async processMessageAsync(options: ProcessMessageOptions): Promise<void> {
    // Process in background without blocking
    this.processMessage(options).catch((error) => {
      console.error('Background message processing failed:', error);
    });
  }
}

/**
 * Singleton instance
 */
let processorInstance: AIMessageProcessorService | null = null;

/**
 * Get singleton instance of AIMessageProcessorService
 */
export function getAIMessageProcessor(): AIMessageProcessorService {
  if (!processorInstance) {
    processorInstance = new AIMessageProcessorService();
  }
  return processorInstance;
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetAIMessageProcessor(): void {
  processorInstance = null;
}
