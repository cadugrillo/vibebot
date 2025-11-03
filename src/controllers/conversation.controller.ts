import { Request, Response } from 'express';
import prisma from '../config/database';
import {
  ConversationResponseDTO,
  PaginatedConversationResponse,
  ListConversationsQuery,
} from '../types/conversation.types';
import {
  normalizePaginationParams,
  createPaginatedResponse,
} from '../utils/pagination.utils';
import { normalizeSortParams } from '../utils/sorting.utils';

/**
 * Create a new conversation
 * POST /api/conversations
 */
export async function createConversationHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { title, model, systemPrompt } = req.body;
    const userId = req.user!.userId; // Guaranteed by authenticateToken middleware

    // Create conversation in database
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: title || 'New Conversation',
        model: model || null,
        systemPrompt: systemPrompt || null,
      },
    });

    // Format response
    const response: ConversationResponseDTO = {
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title,
      model: conversation.model,
      systemPrompt: conversation.systemPrompt,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };

    res.status(201).json({
      message: 'Conversation created successfully',
      data: response,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to create conversation';

    res.status(500).json({
      error: 'Internal Server Error',
      message,
    });
  }
}

/**
 * List all conversations for the authenticated user
 * GET /api/conversations
 * Supports pagination and sorting via query parameters
 */
export async function listConversationsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId; // Guaranteed by authenticateToken middleware
    const query = req.query as unknown as ListConversationsQuery;

    // Normalize pagination parameters
    const paginationParams = normalizePaginationParams({
      page: query.page,
      pageSize: query.pageSize,
    });

    // Normalize sorting parameters
    const sortParams = normalizeSortParams({
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    // Query database with pagination and sorting
    const [conversations, totalCount] = await Promise.all([
      prisma.conversation.findMany({
        where: { userId },
        skip: paginationParams.skip,
        take: paginationParams.take,
        orderBy: sortParams.orderBy,
      }),
      prisma.conversation.count({
        where: { userId },
      }),
    ]);

    // Format conversations
    const formattedConversations: ConversationResponseDTO[] = conversations.map(
      (conversation) => ({
        id: conversation.id,
        userId: conversation.userId,
        title: conversation.title,
        model: conversation.model,
        systemPrompt: conversation.systemPrompt,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })
    );

    // Create paginated response
    const response: PaginatedConversationResponse = createPaginatedResponse(
      formattedConversations,
      totalCount,
      paginationParams
    );

    res.status(200).json(response);
  } catch (error) {
    console.error('Error listing conversations:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to list conversations';

    res.status(500).json({
      error: 'Internal Server Error',
      message,
    });
  }
}

/**
 * Get a single conversation by ID
 * GET /api/conversations/:id
 */
export async function getConversationHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Find conversation (authorization is checked by middleware)
    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    // If conversation doesn't exist, return 404
    if (!conversation) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found',
      });
      return;
    }

    // Check ownership (should be handled by middleware, but double-check)
    if (conversation.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this conversation',
      });
      return;
    }

    // Format response
    const response: ConversationResponseDTO = {
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title,
      model: conversation.model,
      systemPrompt: conversation.systemPrompt,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };

    res.status(200).json({
      data: response,
    });
  } catch (error) {
    console.error('Error getting conversation:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to get conversation';

    res.status(500).json({
      error: 'Internal Server Error',
      message,
    });
  }
}

/**
 * Update a conversation by ID
 * PUT /api/conversations/:id
 */
export async function updateConversationHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { title, model, systemPrompt } = req.body;

    // Find conversation first
    const existingConversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!existingConversation) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found',
      });
      return;
    }

    // Check ownership
    if (existingConversation.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this conversation',
      });
      return;
    }

    // Build update data (only include provided fields)
    const updateData: {
      title?: string;
      model?: string | null;
      systemPrompt?: string | null;
    } = {};

    if (title !== undefined) updateData.title = title;
    if (model !== undefined) updateData.model = model || null;
    if (systemPrompt !== undefined)
      updateData.systemPrompt = systemPrompt || null;

    // Update conversation
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: updateData,
    });

    // Format response
    const response: ConversationResponseDTO = {
      id: updatedConversation.id,
      userId: updatedConversation.userId,
      title: updatedConversation.title,
      model: updatedConversation.model,
      systemPrompt: updatedConversation.systemPrompt,
      createdAt: updatedConversation.createdAt,
      updatedAt: updatedConversation.updatedAt,
    };

    res.status(200).json({
      message: 'Conversation updated successfully',
      data: response,
    });
  } catch (error) {
    console.error('Error updating conversation:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to update conversation';

    res.status(500).json({
      error: 'Internal Server Error',
      message,
    });
  }
}

/**
 * Delete a conversation by ID
 * DELETE /api/conversations/:id
 */
export async function deleteConversationHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Find conversation first
    const existingConversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!existingConversation) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found',
      });
      return;
    }

    // Check ownership
    if (existingConversation.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this conversation',
      });
      return;
    }

    // Delete conversation (cascade delete will remove associated messages)
    await prisma.conversation.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting conversation:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to delete conversation';

    res.status(500).json({
      error: 'Internal Server Error',
      message,
    });
  }
}
