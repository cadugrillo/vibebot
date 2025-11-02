/**
 * Message Service
 * Handles message CRUD operations with token usage tracking integration
 * VBT-158: Integrates usage tracking with message creation
 */

import { PrismaClient, Message, MessageRole } from '../generated/prisma';
import { TokenUsage, CostInfo } from './ai/providers/types';
import { storeTokenUsage } from './ai/usage-tracking';

const prisma = new PrismaClient();

/**
 * Parameters for creating a user message
 */
export interface CreateUserMessageParams {
  conversationId: string;
  userId: string;
  content: string;
}

/**
 * Parameters for creating an assistant message
 */
export interface CreateAssistantMessageParams {
  conversationId: string;
  content: string;
  tokenUsage: TokenUsage;
  cost: CostInfo;
  model: string;
  stopReason?: string;
}

/**
 * Parameters for creating a system message
 */
export interface CreateSystemMessageParams {
  conversationId: string;
  content: string;
}

/**
 * Message Service class
 */
export class MessageService {
  /**
   * Create a user message
   * User messages don't have token usage (they're input, not AI-generated)
   *
   * @param params - User message parameters
   * @returns Created message
   */
  async createUserMessage(params: CreateUserMessageParams): Promise<Message> {
    const { conversationId, userId, content } = params;

    const message = await prisma.message.create({
      data: {
        conversationId,
        userId,
        role: MessageRole.USER,
        content,
      },
    });

    console.log(`✅ User message created: ${message.id}`);

    return message;
  }

  /**
   * Create an assistant message with token usage tracking
   * VBT-158: This is where token usage gets stored in the database
   *
   * @param params - Assistant message parameters including token usage
   * @returns Created message with token metadata
   */
  async createAssistantMessage(
    params: CreateAssistantMessageParams
  ): Promise<Message> {
    const { conversationId, content, tokenUsage, cost, model, stopReason } = params;

    // First create the message without metadata
    const message = await prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.ASSISTANT,
        content,
        // Note: userId is null for assistant messages
      },
    });

    console.log(`✅ Assistant message created: ${message.id}`);

    // Then update it with token usage metadata using our tracking service
    // VBT-158: Integration point for token tracking
    const updatedMessage = await storeTokenUsage(
      message.id,
      tokenUsage,
      cost,
      model,
      stopReason
    );

    return updatedMessage;
  }

  /**
   * Create a system message
   * System messages are for conversation setup/context and don't have token usage
   *
   * @param params - System message parameters
   * @returns Created message
   */
  async createSystemMessage(params: CreateSystemMessageParams): Promise<Message> {
    const { conversationId, content } = params;

    const message = await prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.SYSTEM,
        content,
      },
    });

    console.log(`✅ System message created: ${message.id}`);

    return message;
  }

  /**
   * Get a message by ID
   *
   * @param messageId - Message ID to retrieve
   * @returns Message or null if not found
   */
  async getMessage(messageId: string): Promise<Message | null> {
    return await prisma.message.findUnique({
      where: { id: messageId },
    });
  }

  /**
   * Get all messages for a conversation
   *
   * @param conversationId - Conversation ID
   * @param limit - Maximum number of messages to return
   * @returns Array of messages ordered by creation time
   */
  async getConversationMessages(
    conversationId: string,
    limit: number = 100
  ): Promise<Message[]> {
    return await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Get messages for a user across all conversations
   *
   * @param userId - User ID
   * @param limit - Maximum number of messages to return
   * @returns Array of messages ordered by creation time (newest first)
   */
  async getUserMessages(userId: string, limit: number = 100): Promise<Message[]> {
    return await prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Delete a message
   *
   * @param messageId - Message ID to delete
   * @returns Deleted message
   */
  async deleteMessage(messageId: string): Promise<Message> {
    return await prisma.message.delete({
      where: { id: messageId },
    });
  }

  /**
   * Update message content
   * Useful for editing messages or fixing errors
   *
   * @param messageId - Message ID to update
   * @param content - New content
   * @returns Updated message
   */
  async updateMessageContent(messageId: string, content: string): Promise<Message> {
    return await prisma.message.update({
      where: { id: messageId },
      data: { content },
    });
  }
}

/**
 * Singleton instance
 */
let messageServiceInstance: MessageService | null = null;

/**
 * Get singleton instance of MessageService
 */
export function getMessageService(): MessageService {
  if (!messageServiceInstance) {
    messageServiceInstance = new MessageService();
  }
  return messageServiceInstance;
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetMessageService(): void {
  messageServiceInstance = null;
}

/**
 * Clean up Prisma connection on shutdown
 */
export async function disconnectMessageService(): Promise<void> {
  await prisma.$disconnect();
}
