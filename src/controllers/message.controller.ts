/**
 * Message Controller
 * VBT-188: REST endpoint for message operations
 * Handles message creation, listing, and triggers AI processing
 */

import { Request, Response } from 'express';
import prisma from '../config/database';
import { getMessageService } from '../services/message.service';
import { getAIMessageProcessor } from '../services/ai-message-processor.service';
import {
  CreateMessageDTO,
  MessageResponseDTO,
  PaginatedMessageResponse,
  ListMessagesQuery,
} from '../types/message.types';
import {
  normalizePaginationParams,
  createPaginatedResponse,
} from '../utils/pagination.utils';

/**
 * Create a new message and initiate AI processing
 * POST /api/messages
 * VBT-188: Main controller for message creation
 */
export async function createMessageHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { conversationId, content, modelOverride } = req.body as CreateMessageDTO;
    const userId = req.user!.userId; // Guaranteed by authentication middleware

    // Verify conversation exists and user has access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found',
      });
      return;
    }

    // Check ownership
    if (conversation.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this conversation',
      });
      return;
    }

    // Create user message in database
    const messageService = getMessageService();
    const userMessage = await messageService.createUserMessage({
      conversationId,
      userId,
      content,
    });

    console.log(`✅ User message created: ${userMessage.id}`);

    // Format response DTO
    const messageDTO: MessageResponseDTO = messageService.formatMessageDTO(userMessage);

    // Return immediate 202 Accepted response
    // AI processing will happen asynchronously and stream via WebSocket
    res.status(202).json({
      message: 'Message received and processing started',
      data: messageDTO,
      metadata: {
        userMessageId: userMessage.id,
        conversationId,
        modelOverride: modelOverride || null,
        status: 'processing',
      },
    });

    // VBT-189: Trigger async AI processing
    // This runs in the background and streams results via WebSocket
    const processor = getAIMessageProcessor();
    processor.processMessageAsync({
      conversationId,
      userMessageId: userMessage.id,
      userId,
      modelOverride,
    });

  } catch (error) {
    console.error('Error creating message:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to create message';

    res.status(500).json({
      error: 'Internal Server Error',
      message,
    });
  }
}

/**
 * List messages for a conversation with pagination
 * GET /api/messages?conversationId=xxx
 * VBT-188: Message history endpoint
 */
export async function listMessagesHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { conversationId, page, pageSize } = req.query as unknown as ListMessagesQuery;
    const userId = req.user!.userId;

    // Verify conversation exists and user has access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found',
      });
      return;
    }

    // Check ownership
    if (conversation.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this conversation',
      });
      return;
    }

    // Normalize pagination parameters
    const paginationParams = normalizePaginationParams({
      page,
      pageSize,
    });

    // Get messages with pagination
    const messageService = getMessageService();
    const [messages, totalCount] = await Promise.all([
      messageService.getConversationMessages(conversationId, paginationParams),
      messageService.countConversationMessages(conversationId),
    ]);

    // Format messages as DTOs
    const messageDTOs: MessageResponseDTO[] = messages.map((msg) =>
      messageService.formatMessageDTO(msg)
    );

    // Create paginated response
    const response: PaginatedMessageResponse = createPaginatedResponse(
      messageDTOs,
      totalCount,
      paginationParams
    );

    res.status(200).json(response);
  } catch (error) {
    console.error('Error listing messages:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to list messages';

    res.status(500).json({
      error: 'Internal Server Error',
      message,
    });
  }
}

/**
 * Get a single message by ID
 * GET /api/messages/:id
 * VBT-188: Single message retrieval
 */
export async function getMessageHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    if (!id) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Message ID is required',
      });
      return;
    }

    const messageService = getMessageService();
    const message = await messageService.getMessage(id);

    if (!message) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Message not found',
      });
      return;
    }

    // Verify user has access to the conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
    });

    if (!conversation) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found',
      });
      return;
    }

    if (conversation.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this message',
      });
      return;
    }

    // Format and return message
    const messageDTO: MessageResponseDTO = messageService.formatMessageDTO(message);

    res.status(200).json({
      data: messageDTO,
    });
  } catch (error) {
    console.error('Error getting message:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to get message';

    res.status(500).json({
      error: 'Internal Server Error',
      message,
    });
  }
}
