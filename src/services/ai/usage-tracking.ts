/**
 * Usage Tracking Service
 * VBT-158: Add Token Counting and Usage Tracking
 *
 * Manages token usage tracking and cost aggregation for AI API calls
 */

import { PrismaClient, Message } from '../../generated/prisma';
import { TokenUsage, CostInfo, MessageMetadata } from './providers/types';

const prisma = new PrismaClient();

/**
 * Usage summary for a specific scope (message, conversation, or user)
 */
export interface UsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  messageCount: number;
  currency: 'USD';
}

/**
 * Detailed usage record with timestamp and model info
 */
export interface UsageRecord {
  messageId: string;
  conversationId: string;
  userId: string | null;
  model: string;
  tokenUsage: TokenUsage;
  cost: CostInfo;
  createdAt: Date;
}

/**
 * Store token usage in message metadata
 * This function should be called when creating a message with AI response
 *
 * @param messageId - ID of the message to update
 * @param tokenUsage - Token usage information from API
 * @param cost - Cost information calculated from usage
 * @param model - Model identifier used for the request
 * @param stopReason - Reason the generation stopped
 * @returns Updated message with metadata
 */
export async function storeTokenUsage(
  messageId: string,
  tokenUsage: TokenUsage,
  cost: CostInfo,
  model: string,
  stopReason?: string
): Promise<Message> {
  const metadata: MessageMetadata = {
    tokenUsage,
    cost,
    model,
    stopReason,
  };

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: {
      metadata: metadata as any, // Prisma Json type
    },
  });

  console.log(`✅ Token usage stored for message ${messageId}`);
  console.log(`   Tokens: ${tokenUsage.inputTokens} input, ${tokenUsage.outputTokens} output`);
  console.log(`   Cost: $${cost.totalCost.toFixed(4)}`);

  return updatedMessage;
}

/**
 * Get token usage for a specific message
 *
 * @param messageId - Message ID to retrieve usage for
 * @returns Token usage and cost, or null if not found
 */
export async function getMessageUsage(
  messageId: string
): Promise<{ tokenUsage: TokenUsage; cost: CostInfo; model?: string } | null> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { metadata: true },
  });

  if (!message || !message.metadata) {
    return null;
  }

  const metadata = message.metadata as MessageMetadata;

  if (!metadata.tokenUsage || !metadata.cost) {
    return null;
  }

  return {
    tokenUsage: metadata.tokenUsage,
    cost: metadata.cost,
    model: metadata.model,
  };
}

/**
 * Get aggregated usage for a conversation
 *
 * @param conversationId - Conversation ID to aggregate usage for
 * @returns Usage summary for all messages in the conversation
 */
export async function getConversationUsage(
  conversationId: string
): Promise<UsageSummary> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    select: { metadata: true },
    orderBy: { createdAt: 'asc' },
  });

  return aggregateUsage(messages);
}

/**
 * Get aggregated usage for a user across all conversations
 *
 * @param userId - User ID to aggregate usage for
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns Usage summary for all user's messages
 */
export async function getUserUsage(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<UsageSummary> {
  const whereClause: any = { userId };

  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt.gte = startDate;
    if (endDate) whereClause.createdAt.lte = endDate;
  }

  const messages = await prisma.message.findMany({
    where: whereClause,
    select: { metadata: true },
    orderBy: { createdAt: 'asc' },
  });

  return aggregateUsage(messages);
}

/**
 * Get detailed usage records for a conversation
 *
 * @param conversationId - Conversation ID to get records for
 * @returns Array of detailed usage records
 */
export async function getConversationUsageDetails(
  conversationId: string
): Promise<UsageRecord[]> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    select: {
      id: true,
      conversationId: true,
      userId: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return messages
    .map((msg): UsageRecord | null => {
      const metadata = msg.metadata as MessageMetadata | null;

      if (!metadata?.tokenUsage || !metadata?.cost) {
        return null;
      }

      return {
        messageId: msg.id,
        conversationId: msg.conversationId,
        userId: msg.userId,
        model: metadata.model || 'unknown',
        tokenUsage: metadata.tokenUsage,
        cost: metadata.cost,
        createdAt: msg.createdAt,
      };
    })
    .filter((record): record is UsageRecord => record !== null);
}

/**
 * Get detailed usage records for a user
 *
 * @param userId - User ID to get records for
 * @param limit - Maximum number of records to return
 * @returns Array of detailed usage records
 */
export async function getUserUsageDetails(
  userId: string,
  limit: number = 100
): Promise<UsageRecord[]> {
  const messages = await prisma.message.findMany({
    where: { userId },
    select: {
      id: true,
      conversationId: true,
      userId: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return messages
    .map((msg): UsageRecord | null => {
      const metadata = msg.metadata as MessageMetadata | null;

      if (!metadata?.tokenUsage || !metadata?.cost) {
        return null;
      }

      return {
        messageId: msg.id,
        conversationId: msg.conversationId,
        userId: msg.userId,
        model: metadata.model || 'unknown',
        tokenUsage: metadata.tokenUsage,
        cost: metadata.cost,
        createdAt: msg.createdAt,
      };
    })
    .filter((record): record is UsageRecord => record !== null);
}

/**
 * Aggregate usage from multiple messages
 * Helper function to calculate totals from message metadata
 *
 * @param messages - Array of messages with metadata
 * @returns Aggregated usage summary
 */
function aggregateUsage(
  messages: Array<{ metadata: any }>
): UsageSummary {
  const summary: UsageSummary = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    messageCount: 0,
    currency: 'USD',
  };

  for (const message of messages) {
    const metadata = message.metadata as MessageMetadata | null;

    if (metadata?.tokenUsage && metadata?.cost) {
      summary.totalInputTokens += metadata.tokenUsage.inputTokens;
      summary.totalOutputTokens += metadata.tokenUsage.outputTokens;
      summary.totalTokens += metadata.tokenUsage.totalTokens;
      summary.totalCost += metadata.cost.totalCost;
      summary.messageCount++;
    }
  }

  return summary;
}

/**
 * Verify token usage for a message
 * Checks if token counts are present and valid
 *
 * @param messageId - Message ID to verify
 * @returns Verification result with details
 */
export async function verifyMessageUsage(messageId: string): Promise<{
  isValid: boolean;
  hasMetadata: boolean;
  hasTokenUsage: boolean;
  hasCost: boolean;
  details?: string;
}> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { metadata: true, role: true },
  });

  if (!message) {
    return {
      isValid: false,
      hasMetadata: false,
      hasTokenUsage: false,
      hasCost: false,
      details: 'Message not found',
    };
  }

  // Only ASSISTANT messages should have token usage
  if (message.role !== 'ASSISTANT') {
    return {
      isValid: true,
      hasMetadata: true,
      hasTokenUsage: false,
      hasCost: false,
      details: 'Not an assistant message (no usage tracking needed)',
    };
  }

  if (!message.metadata) {
    return {
      isValid: false,
      hasMetadata: false,
      hasTokenUsage: false,
      hasCost: false,
      details: 'No metadata found',
    };
  }

  const metadata = message.metadata as MessageMetadata;

  const hasTokenUsage = !!(
    metadata.tokenUsage &&
    typeof metadata.tokenUsage.inputTokens === 'number' &&
    typeof metadata.tokenUsage.outputTokens === 'number' &&
    metadata.tokenUsage.inputTokens >= 0 &&
    metadata.tokenUsage.outputTokens >= 0
  );

  const hasCost = !!(
    metadata.cost &&
    typeof metadata.cost.totalCost === 'number' &&
    metadata.cost.totalCost >= 0
  );

  const isValid = hasTokenUsage && hasCost;

  return {
    isValid,
    hasMetadata: true,
    hasTokenUsage,
    hasCost,
    details: isValid
      ? 'Token usage is valid'
      : 'Missing or invalid token usage or cost data',
  };
}

/**
 * Get usage statistics for a conversation
 * Includes verification of data completeness
 *
 * @param conversationId - Conversation ID to analyze
 * @returns Statistics including missing data count
 */
export async function getConversationUsageStats(conversationId: string): Promise<{
  usage: UsageSummary;
  totalAssistantMessages: number;
  messagesWithUsage: number;
  messagesWithoutUsage: number;
  dataCompleteness: number; // Percentage (0-100)
}> {
  const allMessages = await prisma.message.findMany({
    where: { conversationId },
    select: { metadata: true, role: true },
  });

  const assistantMessages = allMessages.filter((m: { role: string }) => m.role === 'ASSISTANT');
  const messagesWithUsage = assistantMessages.filter((m: { metadata: any }) => {
    const metadata = m.metadata as MessageMetadata | null;
    return metadata?.tokenUsage && metadata?.cost;
  });

  const usage = aggregateUsage(messagesWithUsage);

  return {
    usage,
    totalAssistantMessages: assistantMessages.length,
    messagesWithUsage: messagesWithUsage.length,
    messagesWithoutUsage: assistantMessages.length - messagesWithUsage.length,
    dataCompleteness:
      assistantMessages.length > 0
        ? (messagesWithUsage.length / assistantMessages.length) * 100
        : 100,
  };
}

/**
 * Clean up Prisma connection on shutdown
 */
export async function disconnectUsageTracking(): Promise<void> {
  await prisma.$disconnect();
}
