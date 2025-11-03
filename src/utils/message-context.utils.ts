/**
 * Message History Context Builder
 * VBT-187: Utility for building AI context from conversation history
 */

import { Message, MessageRole } from '../generated/prisma';
import {
  AIContextMessage,
  MessageContext,
  MessageContextOptions,
} from '../types/message.types';
import { getMessageService } from '../services/message.service';
import prisma from '../config/database';

/**
 * Approximate token count for a message
 * Uses rough estimation: 1 token ≈ 4 characters
 *
 * @param message - Message to estimate tokens for
 * @returns Estimated token count
 */
function estimateTokenCount(message: Message): number {
  const contentLength = message.content.length;
  // Rough estimation: 1 token ≈ 4 characters
  // Add a few tokens for role and formatting
  return Math.ceil(contentLength / 4) + 10;
}

/**
 * Convert database MessageRole to AI provider role format
 *
 * @param role - Prisma MessageRole
 * @returns AI provider role ('user' | 'assistant' | 'system')
 */
function convertToAIRole(role: MessageRole): 'user' | 'assistant' | 'system' {
  switch (role) {
    case MessageRole.USER:
      return 'user';
    case MessageRole.ASSISTANT:
      return 'assistant';
    case MessageRole.SYSTEM:
      return 'system';
    default:
      throw new Error(`Unknown message role: ${role}`);
  }
}

/**
 * Convert database message to AI context message format
 *
 * @param message - Database message
 * @returns AI context message
 */
function messageToAIContext(message: Message): AIContextMessage {
  return {
    role: convertToAIRole(message.role),
    content: message.content,
  };
}

/**
 * Build AI context from conversation history
 * VBT-187: Main function for creating context from messages
 *
 * @param options - Context building options
 * @returns Built context ready for AI provider
 */
export async function buildMessageContext(
  options: MessageContextOptions
): Promise<MessageContext> {
  const {
    conversationId,
    maxMessages,
    maxTokens,
    includeSystemPrompt = true,
  } = options;

  // Fetch conversation for system prompt
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  // Fetch all messages for the conversation
  const messageService = getMessageService();
  const allMessages = await messageService.getConversationMessages(
    conversationId
  );

  // If no messages, return empty context
  if (allMessages.length === 0) {
    return {
      messages: [],
      systemPrompt: includeSystemPrompt ? conversation.systemPrompt || undefined : undefined,
      totalMessages: 0,
      estimatedTokens: 0,
    };
  }

  // Apply message limit constraints
  let selectedMessages = allMessages;
  let estimatedTokens = 0;

  // Apply maxMessages constraint (take last N messages)
  if (maxMessages && maxMessages > 0) {
    const startIndex = Math.max(0, allMessages.length - maxMessages);
    selectedMessages = allMessages.slice(startIndex);
  }

  // Apply maxTokens constraint
  if (maxTokens && maxTokens > 0) {
    const messagesWithTokens: Array<{ message: Message; tokens: number }> = [];
    let totalTokens = 0;

    // Process messages in reverse order (most recent first)
    for (let i = selectedMessages.length - 1; i >= 0; i--) {
      const message = selectedMessages[i];
      if (!message) continue; // Skip if undefined

      const tokens = estimateTokenCount(message);

      // Check if adding this message would exceed limit
      if (totalTokens + tokens > maxTokens) {
        break;
      }

      messagesWithTokens.unshift({ message, tokens });
      totalTokens += tokens;
    }

    selectedMessages = messagesWithTokens.map((m) => m.message);
    estimatedTokens = totalTokens;
  } else {
    // Calculate estimated tokens for all selected messages
    estimatedTokens = selectedMessages.reduce(
      (sum, msg) => sum + estimateTokenCount(msg),
      0
    );
  }

  // Add system prompt token estimate
  if (includeSystemPrompt && conversation?.systemPrompt) {
    estimatedTokens += Math.ceil(conversation.systemPrompt.length / 4);
  }

  // Convert to AI context format
  const aiMessages: AIContextMessage[] = selectedMessages.map(messageToAIContext);

  return {
    messages: aiMessages,
    systemPrompt: includeSystemPrompt ? conversation?.systemPrompt || undefined : undefined,
    totalMessages: selectedMessages.length,
    estimatedTokens,
  };
}

/**
 * Build context with default settings
 * VBT-187: Convenience function for common use case
 *
 * @param conversationId - Conversation ID
 * @returns Built context
 */
export async function buildDefaultContext(
  conversationId: string
): Promise<MessageContext> {
  return buildMessageContext({
    conversationId,
    maxMessages: 50, // Default: last 50 messages
    includeSystemPrompt: true,
  });
}

/**
 * Build context for specific token budget
 * VBT-187: Utility for staying within token limits
 *
 * @param conversationId - Conversation ID
 * @param tokenBudget - Maximum tokens to include
 * @returns Built context within token budget
 */
export async function buildContextWithTokenBudget(
  conversationId: string,
  tokenBudget: number
): Promise<MessageContext> {
  return buildMessageContext({
    conversationId,
    maxTokens: tokenBudget,
    includeSystemPrompt: true,
  });
}

/**
 * Build context for the last N messages
 * VBT-187: Utility for recent conversation window
 *
 * @param conversationId - Conversation ID
 * @param messageCount - Number of recent messages to include
 * @returns Built context with N most recent messages
 */
export async function buildRecentContext(
  conversationId: string,
  messageCount: number
): Promise<MessageContext> {
  return buildMessageContext({
    conversationId,
    maxMessages: messageCount,
    includeSystemPrompt: true,
  });
}

/**
 * Validate that conversation has messages
 * VBT-187: Helper for checking if conversation is empty
 *
 * @param conversationId - Conversation ID
 * @returns True if conversation has messages
 */
export async function hasMessages(conversationId: string): Promise<boolean> {
  const messageService = getMessageService();
  const count = await messageService.countConversationMessages(conversationId);
  return count > 0;
}

/**
 * Get estimated token count for entire conversation
 * VBT-187: Utility for understanding conversation size
 *
 * @param conversationId - Conversation ID
 * @returns Estimated total tokens
 */
export async function getConversationTokenEstimate(
  conversationId: string
): Promise<number> {
  const messageService = getMessageService();
  const messages = await messageService.getConversationMessages(conversationId);

  return messages.reduce((sum, msg) => sum + estimateTokenCount(msg), 0);
}
