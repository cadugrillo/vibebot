import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

/**
 * Authorization middleware to verify conversation ownership
 *
 * This middleware checks that:
 * 1. The conversation exists
 * 2. The authenticated user owns the conversation
 *
 * Must be used AFTER authenticateToken middleware.
 * Expects conversation ID in req.params.id
 *
 * Returns 404 if conversation doesn't exist (to prevent info leakage)
 * Returns 403 if user doesn't own the conversation
 */
export async function authorizeConversationOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const conversationId = req.params.id;
    const userId = req.user?.userId;

    // Ensure user is authenticated (should be guaranteed by authenticateToken middleware)
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Validate conversation ID format (basic check)
    if (!conversationId || typeof conversationId !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid conversation ID',
      });
      return;
    }

    // Find conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true }, // Only fetch userId for efficiency
    });

    // If conversation doesn't exist, return 404
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

    // Authorization successful, proceed to next middleware/handler
    next();
  } catch (error) {
    console.error('Error in conversation authorization middleware:', error);

    const message =
      error instanceof Error ? error.message : 'Authorization check failed';

    res.status(500).json({
      error: 'Internal Server Error',
      message,
    });
  }
}
