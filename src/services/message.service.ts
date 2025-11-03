/**
 * Message Service
 * Handles message CRUD operations with token usage tracking integration
 * VBT-158: Integrates usage tracking with message creation
 * VBT-186: Enhanced with pagination, metadata updates, and transaction support
 */

import { PrismaClient, Message, MessageRole } from '../generated/prisma';
import { TokenUsage, CostInfo } from './ai/providers/types';
import { storeTokenUsage } from './ai/usage-tracking';
import {
  MessageMetadata,
  MessageResponseDTO,
  CreateUserMessageParams,
  CreateAssistantMessageParams as NewCreateAssistantMessageParams,
  UpdateMessageMetadataParams,
} from '../types/message.types';
import { NormalizedPaginationParams } from '../utils/pagination.utils';

const prisma = new PrismaClient();

/**
 * Legacy parameters for creating an assistant message (for backward compatibility)
 * @deprecated Use CreateAssistantMessageParams from message.types.ts instead
 */
export interface LegacyCreateAssistantMessageParams {
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
   * VBT-186: Enhanced to support new MessageMetadata type
   *
   * @param params - Assistant message parameters including token usage
   * @returns Created message with token metadata
   */
  async createAssistantMessage(
    params: LegacyCreateAssistantMessageParams | NewCreateAssistantMessageParams
  ): Promise<Message> {
    // Check if using new format or legacy format
    if ('metadata' in params) {
      // New format with MessageMetadata
      const { conversationId, content, metadata } = params;

      const message = await prisma.message.create({
        data: {
          conversationId,
          role: MessageRole.ASSISTANT,
          content,
          metadata: metadata as any, // Prisma stores as Json
        },
      });

      console.log(`✅ Assistant message created: ${message.id}`);
      return message;
    } else {
      // Legacy format - convert to new format
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
   * Get all messages for a conversation with pagination support
   * VBT-186: Enhanced with pagination
   *
   * @param conversationId - Conversation ID
   * @param paginationParams - Pagination parameters (optional)
   * @returns Array of messages ordered by creation time
   */
  async getConversationMessages(
    conversationId: string,
    paginationParams?: NormalizedPaginationParams
  ): Promise<Message[]> {
    if (paginationParams) {
      return await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip: paginationParams.skip,
        take: paginationParams.take,
      });
    }

    // Default: return all messages (for backward compatibility)
    return await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Count messages in a conversation
   * VBT-186: For pagination support
   *
   * @param conversationId - Conversation ID
   * @returns Total count of messages
   */
  async countConversationMessages(conversationId: string): Promise<number> {
    return await prisma.message.count({
      where: { conversationId },
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

  /**
   * Update message metadata
   * VBT-186: New method for updating message metadata
   *
   * @param params - Metadata update parameters
   * @returns Updated message
   */
  async updateMessageMetadata(
    params: UpdateMessageMetadataParams
  ): Promise<Message> {
    const { messageId, metadata } = params;

    // Fetch current metadata
    const currentMessage = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!currentMessage) {
      throw new Error(`Message ${messageId} not found`);
    }

    // Merge with existing metadata
    const currentMetadata = (currentMessage.metadata as MessageMetadata) || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...metadata,
    };

    return await prisma.message.update({
      where: { id: messageId },
      data: { metadata: updatedMetadata as any },
    });
  }

  /**
   * Create user and assistant message pair atomically
   * VBT-186: Transaction support for atomic operations
   *
   * @param userParams - User message parameters
   * @param assistantParams - Assistant message parameters
   * @returns Tuple of [userMessage, assistantMessage]
   */
  async createMessagePair(
    userParams: CreateUserMessageParams,
    assistantParams: NewCreateAssistantMessageParams
  ): Promise<[Message, Message]> {
    return await prisma.$transaction(async (tx) => {
      // Create user message
      const userMessage = await tx.message.create({
        data: {
          conversationId: userParams.conversationId,
          userId: userParams.userId,
          role: MessageRole.USER,
          content: userParams.content,
        },
      });

      // Create assistant message
      const assistantMessage = await tx.message.create({
        data: {
          conversationId: assistantParams.conversationId,
          role: MessageRole.ASSISTANT,
          content: assistantParams.content,
          metadata: assistantParams.metadata as any,
        },
      });

      return [userMessage, assistantMessage];
    });
  }

  /**
   * Format a message to DTO format
   * VBT-186: Utility for converting database messages to DTOs
   *
   * @param message - Database message
   * @returns Message DTO
   */
  formatMessageDTO(message: Message): MessageResponseDTO {
    return {
      id: message.id,
      conversationId: message.conversationId,
      userId: message.userId,
      role: message.role,
      content: message.content,
      metadata: (message.metadata as MessageMetadata) || null,
      createdAt: message.createdAt,
    };
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
