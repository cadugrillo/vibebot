/**
 * Token Tracking Integration Test
 * VBT-158: Test token counting and usage tracking end-to-end
 *
 * This script demonstrates the complete flow:
 * 1. User sends a message
 * 2. Claude API responds with streaming
 * 3. Token usage is captured and stored
 * 4. Usage can be queried and aggregated
 *
 * Run with: npx ts-node src/services/ai/test-token-tracking.ts
 */

import { getClaudeService } from './claude/ClaudeService';
import { getMessageService } from '../message.service';
import {
  getMessageUsage,
  getConversationUsage,
  getUserUsage,
  getConversationUsageStats,
  verifyMessageUsage,
} from './usage-tracking';
import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

/**
 * Test the complete token tracking flow
 */
async function testTokenTracking() {
  console.log('\n🧪 VBT-158: Token Tracking Integration Test\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Setup test data
    console.log('\n📝 Step 1: Creating test user and conversation...');

    const testUser = await prisma.user.create({
      data: {
        email: `test-token-${Date.now()}@example.com`,
        password: 'test123',
        name: 'Token Test User',
      },
    });
    console.log(`   ✅ Created test user: ${testUser.id}`);

    const testConversation = await prisma.conversation.create({
      data: {
        userId: testUser.id,
        title: 'Token Tracking Test Conversation',
        model: 'claude-sonnet-4-5-20250929',
      },
    });
    console.log(`   ✅ Created test conversation: ${testConversation.id}`);

    // Step 2: Create user message
    console.log('\n💬 Step 2: Creating user message...');
    const messageService = getMessageService();

    const userMessage = await messageService.createUserMessage({
      conversationId: testConversation.id,
      userId: testUser.id,
      content: 'What is TypeScript?',
    });
    console.log(`   ✅ User message created: ${userMessage.id}`);

    // Step 3: Get AI response with streaming
    console.log('\n🤖 Step 3: Getting AI response from Claude API...');
    const claudeService = getClaudeService();

    // Test connection first
    const isConnected = await claudeService.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Claude API');
    }

    // Stream response
    let streamedContent = '';
    const response = await claudeService.streamResponse(
      {
        conversationId: testConversation.id,
        userId: testUser.id,
        userMessage: userMessage.content,
      },
      (event) => {
        if (event.type === 'delta' && event.content) {
          streamedContent += event.content;
          process.stdout.write(event.content);
        } else if (event.type === 'complete') {
          console.log('\n   ✅ Stream completed');
        } else if (event.type === 'error') {
          console.error(`\n   ❌ Stream error: ${event.error}`);
        }
      }
    );

    console.log('\n   Token Usage:');
    console.log(`   - Input tokens: ${response.tokenUsage.inputTokens}`);
    console.log(`   - Output tokens: ${response.tokenUsage.outputTokens}`);
    console.log(`   - Total tokens: ${response.tokenUsage.totalTokens}`);
    console.log(`   Cost: $${response.cost.totalCost.toFixed(4)}`);

    // Step 4: Create assistant message with token tracking
    console.log('\n💾 Step 4: Storing assistant message with token usage...');

    const assistantMessage = await messageService.createAssistantMessage({
      conversationId: testConversation.id,
      content: response.content,
      tokenUsage: response.tokenUsage,
      cost: response.cost,
      model: response.model,
      stopReason: response.stopReason,
    });
    console.log(`   ✅ Assistant message stored: ${assistantMessage.id}`);

    // Step 5: Verify token usage was stored
    console.log('\n✅ Step 5: Verifying token usage storage...');

    const verification = await verifyMessageUsage(assistantMessage.id);
    console.log(`   - Has metadata: ${verification.hasMetadata}`);
    console.log(`   - Has token usage: ${verification.hasTokenUsage}`);
    console.log(`   - Has cost: ${verification.hasCost}`);
    console.log(`   - Is valid: ${verification.isValid}`);
    console.log(`   - Details: ${verification.details}`);

    if (!verification.isValid) {
      throw new Error('Token usage verification failed!');
    }

    // Step 6: Retrieve and display usage data
    console.log('\n📊 Step 6: Retrieving usage data...');

    const messageUsage = await getMessageUsage(assistantMessage.id);
    if (messageUsage) {
      console.log('\n   Message Usage:');
      console.log(`   - Input tokens: ${messageUsage.tokenUsage.inputTokens}`);
      console.log(`   - Output tokens: ${messageUsage.tokenUsage.outputTokens}`);
      console.log(`   - Total tokens: ${messageUsage.tokenUsage.totalTokens}`);
      console.log(`   - Cost: $${messageUsage.cost.totalCost.toFixed(4)}`);
      console.log(`   - Model: ${messageUsage.model}`);
    }

    const conversationUsage = await getConversationUsage(testConversation.id);
    console.log('\n   Conversation Usage:');
    console.log(`   - Total input tokens: ${conversationUsage.totalInputTokens}`);
    console.log(`   - Total output tokens: ${conversationUsage.totalOutputTokens}`);
    console.log(`   - Total tokens: ${conversationUsage.totalTokens}`);
    console.log(`   - Total cost: $${conversationUsage.totalCost.toFixed(4)}`);
    console.log(`   - Message count: ${conversationUsage.messageCount}`);

    const userUsage = await getUserUsage(testUser.id);
    console.log('\n   User Usage:');
    console.log(`   - Total input tokens: ${userUsage.totalInputTokens}`);
    console.log(`   - Total output tokens: ${userUsage.totalOutputTokens}`);
    console.log(`   - Total tokens: ${userUsage.totalTokens}`);
    console.log(`   - Total cost: $${userUsage.totalCost.toFixed(4)}`);
    console.log(`   - Message count: ${userUsage.messageCount}`);

    // Step 7: Test usage statistics
    console.log('\n📈 Step 7: Getting usage statistics...');

    const stats = await getConversationUsageStats(testConversation.id);
    console.log('\n   Conversation Statistics:');
    console.log(`   - Total assistant messages: ${stats.totalAssistantMessages}`);
    console.log(`   - Messages with usage data: ${stats.messagesWithUsage}`);
    console.log(`   - Messages without usage: ${stats.messagesWithoutUsage}`);
    console.log(`   - Data completeness: ${stats.dataCompleteness.toFixed(1)}%`);

    // Step 8: Cleanup
    console.log('\n🧹 Step 8: Cleaning up test data...');

    await prisma.message.deleteMany({
      where: { conversationId: testConversation.id },
    });
    await prisma.conversation.delete({
      where: { id: testConversation.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log('   ✅ Cleanup completed');

    console.log('\n' + '='.repeat(60));
    console.log('✅ VBT-158: All token tracking tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Test usage aggregation with multiple messages
 */
async function testMultipleMessages() {
  console.log('\n🧪 Testing usage aggregation with multiple messages\n');
  console.log('='.repeat(60));

  try {
    const testUser = await prisma.user.create({
      data: {
        email: `test-multi-${Date.now()}@example.com`,
        password: 'test123',
        name: 'Multi-Message Test User',
      },
    });

    const testConversation = await prisma.conversation.create({
      data: {
        userId: testUser.id,
        title: 'Multi-Message Test',
      },
    });

    console.log(`Created test user: ${testUser.id}`);
    console.log(`Created test conversation: ${testConversation.id}`);

    // Create multiple messages with simulated token usage
    const messageService = getMessageService();

    console.log('\nCreating 3 test messages with different token usage...');

    for (let i = 1; i <= 3; i++) {
      const inputTokens = 100 * i;
      const outputTokens = 200 * i;

      await messageService.createAssistantMessage({
        conversationId: testConversation.id,
        content: `Test response ${i}`,
        tokenUsage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
        cost: {
          inputCost: (inputTokens / 1_000_000) * 3.0,
          outputCost: (outputTokens / 1_000_000) * 15.0,
          totalCost:
            (inputTokens / 1_000_000) * 3.0 + (outputTokens / 1_000_000) * 15.0,
          currency: 'USD',
        },
        model: 'claude-sonnet-4-5-20250929',
      });

      console.log(`   ✅ Message ${i} created`);
    }

    // Aggregate usage
    const usage = await getConversationUsage(testConversation.id);

    console.log('\nAggregated Usage:');
    console.log(`- Total input tokens: ${usage.totalInputTokens} (expected: 600)`);
    console.log(`- Total output tokens: ${usage.totalOutputTokens} (expected: 1200)`);
    console.log(`- Total tokens: ${usage.totalTokens} (expected: 1800)`);
    console.log(`- Total cost: $${usage.totalCost.toFixed(6)}`);
    console.log(`- Message count: ${usage.messageCount} (expected: 3)`);

    // Verify totals
    if (
      usage.totalInputTokens === 600 &&
      usage.totalOutputTokens === 1200 &&
      usage.messageCount === 3
    ) {
      console.log('\n✅ Aggregation test passed!');
    } else {
      throw new Error('Aggregation totals do not match expected values');
    }

    // Cleanup
    await prisma.message.deleteMany({
      where: { conversationId: testConversation.id },
    });
    await prisma.conversation.delete({
      where: { id: testConversation.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });

    console.log('✅ Cleanup completed\n');
  } catch (error) {
    console.error('\n❌ Aggregation test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
if (require.main === module) {
  (async () => {
    try {
      // Run main integration test
      await testTokenTracking();

      // Run aggregation test
      await testMultipleMessages();

      console.log('🎉 All VBT-158 tests completed successfully!\n');
      process.exit(0);
    } catch (error) {
      console.error('\n💥 Test suite failed\n');
      process.exit(1);
    }
  })();
}
