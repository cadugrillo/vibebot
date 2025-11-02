/**
 * Cost Reporting Service
 * VBT-161: Implement Cost Tracking System
 *
 * Provides enhanced cost reporting, statistics, and utilities
 * Builds on top of usage-tracking.ts (VBT-158)
 */

import { PrismaClient } from '../../generated/prisma';
import { getClaudeModelConfig, CLAUDE_MODELS } from './providers';
import { MessageMetadata } from './providers/types';
import { UsageSummary } from './usage-tracking';

const prisma = new PrismaClient();

/**
 * Enhanced conversation cost summary with model breakdown
 */
export interface ConversationCostReport {
  conversationId: string;
  conversationTitle: string;
  summary: UsageSummary;
  modelsUsed: string[];
  costByModel: Map<string, {
    cost: number;
    inputTokens: number;
    outputTokens: number;
    messageCount: number;
  }>;
  averageCostPerMessage: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Enhanced user cost summary with conversation breakdown
 */
export interface UserCostReport {
  userId: string;
  summary: UsageSummary;
  conversationCount: number;
  modelsUsed: string[];
  costByModel: Map<string, {
    cost: number;
    inputTokens: number;
    outputTokens: number;
    messageCount: number;
  }>;
  topConversations: Array<{
    conversationId: string;
    title: string;
    cost: number;
    messageCount: number;
  }>;
  averageCostPerMessage: number;
  averageCostPerConversation: number;
}

/**
 * Cost statistics for analysis
 */
export interface CostStatistics {
  period: 'day' | 'week' | 'month' | 'year' | 'all';
  totalCost: number;
  totalMessages: number;
  totalConversations: number;
  averageCostPerMessage: number;
  averageCostPerConversation: number;
  mostExpensiveModel: { model: string; modelName: string; cost: number } | null;
  cheapestModel: { model: string; modelName: string; cost: number } | null;
  costTrend: 'increasing' | 'decreasing' | 'stable' | 'unknown';
}

/**
 * Get conversation cost report with model breakdown
 *
 * @param conversationId - Conversation ID
 * @returns Detailed cost report for the conversation
 */
export async function getConversationCostReport(
  conversationId: string
): Promise<ConversationCostReport> {
  // Get conversation details
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        where: { role: 'ASSISTANT' },
        select: { metadata: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  // Aggregate usage by model
  const costByModel = new Map<string, {
    cost: number;
    inputTokens: number;
    outputTokens: number;
    messageCount: number;
  }>();

  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let messageCount = 0;

  for (const message of conversation.messages) {
    const metadata = message.metadata as MessageMetadata | null;

    if (metadata?.tokenUsage && metadata?.cost && metadata?.model) {
      const model = metadata.model;
      const existing = costByModel.get(model) || {
        cost: 0,
        inputTokens: 0,
        outputTokens: 0,
        messageCount: 0,
      };

      costByModel.set(model, {
        cost: existing.cost + metadata.cost.totalCost,
        inputTokens: existing.inputTokens + metadata.tokenUsage.inputTokens,
        outputTokens: existing.outputTokens + metadata.tokenUsage.outputTokens,
        messageCount: existing.messageCount + 1,
      });

      totalCost += metadata.cost.totalCost;
      totalInputTokens += metadata.tokenUsage.inputTokens;
      totalOutputTokens += metadata.tokenUsage.outputTokens;
      messageCount++;
    }
  }

  const summary: UsageSummary = {
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalCost,
    messageCount,
    currency: 'USD',
  };

  return {
    conversationId: conversation.id,
    conversationTitle: conversation.title,
    summary,
    modelsUsed: Array.from(costByModel.keys()),
    costByModel,
    averageCostPerMessage: messageCount > 0 ? totalCost / messageCount : 0,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

/**
 * Get user cost report with conversation breakdown
 *
 * @param userId - User ID
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @param topN - Number of top conversations to include (default: 10)
 * @returns Detailed cost report for the user
 */
export async function getUserCostReport(
  userId: string,
  startDate?: Date,
  endDate?: Date,
  topN: number = 10
): Promise<UserCostReport> {
  // Build date filter
  const dateFilter = startDate || endDate
    ? {
        createdAt: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
        },
      }
    : {};

  // Get all conversations for user
  const conversations = await prisma.conversation.findMany({
    where: {
      userId,
      ...dateFilter,
    },
    select: {
      id: true,
      title: true,
      messages: {
        where: { role: 'ASSISTANT' },
        select: { metadata: true },
      },
    },
  });

  // Aggregate usage by model and conversation
  const costByModel = new Map<string, {
    cost: number;
    inputTokens: number;
    outputTokens: number;
    messageCount: number;
  }>();

  const conversationCosts: Array<{
    conversationId: string;
    title: string;
    cost: number;
    messageCount: number;
  }> = [];

  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalMessageCount = 0;

  for (const conversation of conversations) {
    let conversationCost = 0;
    let conversationMessageCount = 0;

    for (const message of conversation.messages) {
      const metadata = message.metadata as MessageMetadata | null;

      if (metadata?.tokenUsage && metadata?.cost && metadata?.model) {
        const model = metadata.model;
        const existing = costByModel.get(model) || {
          cost: 0,
          inputTokens: 0,
          outputTokens: 0,
          messageCount: 0,
        };

        costByModel.set(model, {
          cost: existing.cost + metadata.cost.totalCost,
          inputTokens: existing.inputTokens + metadata.tokenUsage.inputTokens,
          outputTokens: existing.outputTokens + metadata.tokenUsage.outputTokens,
          messageCount: existing.messageCount + 1,
        });

        conversationCost += metadata.cost.totalCost;
        totalCost += metadata.cost.totalCost;
        totalInputTokens += metadata.tokenUsage.inputTokens;
        totalOutputTokens += metadata.tokenUsage.outputTokens;
        totalMessageCount++;
        conversationMessageCount++;
      }
    }

    if (conversationMessageCount > 0) {
      conversationCosts.push({
        conversationId: conversation.id,
        title: conversation.title,
        cost: conversationCost,
        messageCount: conversationMessageCount,
      });
    }
  }

  // Sort conversations by cost and take top N
  conversationCosts.sort((a, b) => b.cost - a.cost);
  const topConversations = conversationCosts.slice(0, topN);

  const summary: UsageSummary = {
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalCost,
    messageCount: totalMessageCount,
    currency: 'USD',
  };

  return {
    userId,
    summary,
    conversationCount: conversations.length,
    modelsUsed: Array.from(costByModel.keys()),
    costByModel,
    topConversations,
    averageCostPerMessage: totalMessageCount > 0 ? totalCost / totalMessageCount : 0,
    averageCostPerConversation: conversations.length > 0 ? totalCost / conversations.length : 0,
  };
}

/**
 * Get cost statistics for a user
 *
 * @param userId - User ID
 * @param period - Time period for statistics
 * @returns Cost statistics
 */
export async function getUserCostStatistics(
  userId: string,
  period: 'day' | 'week' | 'month' | 'year' | 'all' = 'all'
): Promise<CostStatistics> {
  // Calculate date range based on period
  const now = new Date();
  let startDate: Date | undefined;

  switch (period) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      startDate = undefined;
      break;
  }

  const report = await getUserCostReport(userId, startDate, now);

  // Find most expensive and cheapest models
  let mostExpensiveModel: { model: string; modelName: string; cost: number } | null = null;
  let cheapestModel: { model: string; modelName: string; cost: number } | null = null;

  if (report.costByModel.size > 0) {
    const modelCosts = Array.from(report.costByModel.entries()).map(([model, data]) => ({
      model,
      modelName: getClaudeModelConfig(model)?.name || model,
      cost: data.cost,
    }));

    modelCosts.sort((a, b) => b.cost - a.cost);
    mostExpensiveModel = modelCosts[0] || null;
    cheapestModel = modelCosts[modelCosts.length - 1] || null;
  }

  // Determine cost trend (simplified - could be enhanced with historical data)
  let costTrend: 'increasing' | 'decreasing' | 'stable' | 'unknown' = 'unknown';

  return {
    period,
    totalCost: report.summary.totalCost,
    totalMessages: report.summary.messageCount,
    totalConversations: report.conversationCount,
    averageCostPerMessage: report.averageCostPerMessage,
    averageCostPerConversation: report.averageCostPerConversation,
    mostExpensiveModel,
    cheapestModel,
    costTrend,
  };
}

/**
 * Format cost for display
 *
 * @param cost - Cost in USD
 * @param decimals - Number of decimal places (default: 4)
 * @returns Formatted cost string
 */
export function formatCost(cost: number, decimals: number = 4): string {
  return `$${cost.toFixed(decimals)}`;
}

/**
 * Format token count for display
 *
 * @param tokens - Token count
 * @returns Formatted token string with thousands separator
 */
export function formatTokens(tokens: number): string {
  return tokens.toLocaleString();
}

/**
 * Format cost per 1K tokens
 *
 * @param cost - Total cost
 * @param tokens - Total tokens
 * @returns Cost per 1K tokens formatted string
 */
export function formatCostPerThousandTokens(cost: number, tokens: number): string {
  if (tokens === 0) return '$0.0000/1K';
  const costPer1K = (cost / tokens) * 1000;
  return `$${costPer1K.toFixed(4)}/1K`;
}

/**
 * Estimate cost for a request before making it
 *
 * @param modelId - Claude model ID
 * @param estimatedInputTokens - Estimated input tokens
 * @param estimatedOutputTokens - Estimated output tokens
 * @returns Estimated cost or null if model not found
 */
export function estimateCost(
  modelId: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): number | null {
  const config = getClaudeModelConfig(modelId);
  if (!config) return null;

  const inputCost = (estimatedInputTokens / 1_000_000) * config.pricing.input;
  const outputCost = (estimatedOutputTokens / 1_000_000) * config.pricing.output;

  return inputCost + outputCost;
}

/**
 * Compare costs between models for a given token usage
 *
 * @param inputTokens - Input tokens
 * @param outputTokens - Output tokens
 * @returns Array of model costs sorted by total cost (ascending)
 */
export function compareModelCosts(
  inputTokens: number,
  outputTokens: number
): Array<{ modelId: string; modelName: string; cost: number; savings: number }> {
  const comparisons: Array<{ modelId: string; modelName: string; cost: number }> = [];

  for (const [modelId, config] of Object.entries(CLAUDE_MODELS)) {
    const inputCost = (inputTokens / 1_000_000) * config.pricing.input;
    const outputCost = (outputTokens / 1_000_000) * config.pricing.output;
    const totalCost = inputCost + outputCost;

    comparisons.push({
      modelId,
      modelName: config.name,
      cost: totalCost,
    });
  }

  comparisons.sort((a, b) => a.cost - b.cost);

  // Calculate savings compared to most expensive
  const mostExpensiveItem = comparisons[comparisons.length - 1];
  const mostExpensive = mostExpensiveItem ? mostExpensiveItem.cost : 0;

  return comparisons.map(item => ({
    ...item,
    savings: mostExpensive - item.cost,
  }));
}

/**
 * Print conversation cost report
 *
 * @param report - Conversation cost report
 */
export function printConversationCostReport(report: ConversationCostReport): void {
  console.log('\n' + '='.repeat(70));
  console.log('📊 Conversation Cost Report');
  console.log('='.repeat(70));
  console.log(`Conversation: ${report.conversationTitle}`);
  console.log(`ID: ${report.conversationId}`);
  console.log(`\n💰 Total Cost: ${formatCost(report.summary.totalCost)}`);
  console.log(`📝 Messages: ${report.summary.messageCount}`);
  console.log(`🔢 Total Tokens: ${formatTokens(report.summary.totalTokens)}`);
  console.log(`   Input: ${formatTokens(report.summary.totalInputTokens)}`);
  console.log(`   Output: ${formatTokens(report.summary.totalOutputTokens)}`);
  console.log(`📊 Avg Cost/Message: ${formatCost(report.averageCostPerMessage)}`);
  console.log(`📈 Cost/1K Tokens: ${formatCostPerThousandTokens(report.summary.totalCost, report.summary.totalTokens)}`);

  if (report.modelsUsed.length > 0) {
    console.log(`\n🤖 Models Used (${report.modelsUsed.length}):`);

    const sortedModels = Array.from(report.costByModel.entries())
      .sort((a, b) => b[1].cost - a[1].cost);

    for (const [model, data] of sortedModels) {
      const modelConfig = getClaudeModelConfig(model);
      const modelName = modelConfig?.name || model;
      const percentage = (data.cost / report.summary.totalCost) * 100;

      console.log(`\n  ${modelName}:`);
      console.log(`    Cost: ${formatCost(data.cost)} (${percentage.toFixed(1)}%)`);
      console.log(`    Messages: ${data.messageCount}`);
      console.log(`    Tokens: ${formatTokens(data.inputTokens + data.outputTokens)}`);
      console.log(`    Avg/Msg: ${formatCost(data.cost / data.messageCount)}`);
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

/**
 * Print user cost report
 *
 * @param report - User cost report
 * @param showTopN - Number of top conversations to show (default: 5)
 */
export function printUserCostReport(report: UserCostReport, showTopN: number = 5): void {
  console.log('\n' + '='.repeat(70));
  console.log('📊 User Cost Report');
  console.log('='.repeat(70));
  console.log(`User ID: ${report.userId}`);
  console.log(`\n💰 Total Cost: ${formatCost(report.summary.totalCost)}`);
  console.log(`💬 Conversations: ${report.conversationCount}`);
  console.log(`📝 Messages: ${report.summary.messageCount}`);
  console.log(`🔢 Total Tokens: ${formatTokens(report.summary.totalTokens)}`);
  console.log(`   Input: ${formatTokens(report.summary.totalInputTokens)}`);
  console.log(`   Output: ${formatTokens(report.summary.totalOutputTokens)}`);
  console.log(`\n📊 Averages:`);
  console.log(`   Cost/Conversation: ${formatCost(report.averageCostPerConversation)}`);
  console.log(`   Cost/Message: ${formatCost(report.averageCostPerMessage)}`);
  console.log(`   Cost/1K Tokens: ${formatCostPerThousandTokens(report.summary.totalCost, report.summary.totalTokens)}`);

  if (report.modelsUsed.length > 0) {
    console.log(`\n🤖 Cost Breakdown by Model:`);

    const sortedModels = Array.from(report.costByModel.entries())
      .sort((a, b) => b[1].cost - a[1].cost);

    for (const [model, data] of sortedModels) {
      const modelConfig = getClaudeModelConfig(model);
      const modelName = modelConfig?.name || model;
      const percentage = (data.cost / report.summary.totalCost) * 100;

      console.log(`\n  ${modelName}:`);
      console.log(`    Cost: ${formatCost(data.cost)} (${percentage.toFixed(1)}%)`);
      console.log(`    Messages: ${data.messageCount}`);
      console.log(`    Tokens: ${formatTokens(data.inputTokens + data.outputTokens)}`);
    }
  }

  if (report.topConversations.length > 0) {
    console.log(`\n🏆 Top ${Math.min(showTopN, report.topConversations.length)} Most Expensive Conversations:`);

    for (let i = 0; i < Math.min(showTopN, report.topConversations.length); i++) {
      const conv = report.topConversations[i];
      if (conv) {
        console.log(`\n  ${i + 1}. ${conv.title}`);
        console.log(`     Cost: ${formatCost(conv.cost)}`);
        console.log(`     Messages: ${conv.messageCount}`);
        console.log(`     Avg/Msg: ${formatCost(conv.cost / conv.messageCount)}`);
      }
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

/**
 * Print cost statistics
 *
 * @param stats - Cost statistics
 */
export function printCostStatistics(stats: CostStatistics): void {
  console.log('\n' + '='.repeat(70));
  console.log(`📈 Cost Statistics - ${stats.period.toUpperCase()}`);
  console.log('='.repeat(70));
  console.log(`💰 Total Cost: ${formatCost(stats.totalCost)}`);
  console.log(`📝 Total Messages: ${stats.totalMessages}`);
  console.log(`💬 Total Conversations: ${stats.totalConversations}`);
  console.log(`\n📊 Averages:`);
  console.log(`   Cost/Message: ${formatCost(stats.averageCostPerMessage)}`);
  console.log(`   Cost/Conversation: ${formatCost(stats.averageCostPerConversation)}`);

  if (stats.mostExpensiveModel) {
    console.log(`\n💎 Most Expensive Model:`);
    console.log(`   ${stats.mostExpensiveModel.modelName}`);
    console.log(`   Total Cost: ${formatCost(stats.mostExpensiveModel.cost)}`);
  }

  if (stats.cheapestModel) {
    console.log(`\n💸 Most Cost-Effective Model:`);
    console.log(`   ${stats.cheapestModel.modelName}`);
    console.log(`   Total Cost: ${formatCost(stats.cheapestModel.cost)}`);
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

/**
 * Print model cost comparison
 *
 * @param inputTokens - Input tokens
 * @param outputTokens - Output tokens
 */
export function printModelCostComparison(inputTokens: number, outputTokens: number): void {
  const comparisons = compareModelCosts(inputTokens, outputTokens);

  console.log('\n' + '='.repeat(70));
  console.log('🔍 Model Cost Comparison');
  console.log('='.repeat(70));
  console.log(`Input Tokens: ${formatTokens(inputTokens)}`);
  console.log(`Output Tokens: ${formatTokens(outputTokens)}`);
  console.log(`\nEstimated Costs (sorted by cost):\n`);

  for (let i = 0; i < comparisons.length; i++) {
    const item = comparisons[i];
    if (!item) continue;

    const mostExpensiveItem = comparisons[comparisons.length - 1];
    const mostExpensiveCost = mostExpensiveItem ? mostExpensiveItem.cost : 1;

    const savingsPercent = item.savings > 0
      ? ((item.savings / mostExpensiveCost) * 100).toFixed(1)
      : '0';

    console.log(`${i + 1}. ${item.modelName}`);
    console.log(`   Cost: ${formatCost(item.cost)}`);
    console.log(`   Savings: ${formatCost(item.savings)} (${savingsPercent}% less than most expensive)`);
    console.log();
  }

  console.log('='.repeat(70) + '\n');
}

/**
 * Clean up Prisma connection
 */
export async function disconnectCostReporting(): Promise<void> {
  await prisma.$disconnect();
}
