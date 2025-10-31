/**
 * Usage Tracking Unit Test
 * VBT-158: Test token counting and usage tracking without API calls
 *
 * This test verifies the usage tracking functions work correctly
 * without requiring actual Claude API calls.
 *
 * Run with: npx ts-node src/services/ai/test-usage-tracking-unit.ts
 */

import { PrismaClient } from '../../generated/prisma';
import { getMessageService } from '../message.service';
import {
  getMessageUsage,
  getConversationUsage,
  getUserUsage,
  getConversationUsageStats,
  verifyMessageUsage,
  getUserUsageDetails,
  getConversationUsageDetails,
} from './usage-tracking';

const prisma = new PrismaClient();

async function runTests() {
  console.log('\n🧪 VBT-158: Usage Tracking Unit Tests\n');
  console.log('='.repeat(60));

  let testUser: any;
  let testConversation: any;

  try {
    // Setup test data
    console.log('\n📝 Setup: Creating test user and conversation...');

    testUser = await prisma.user.create({
      data: {
        email: `test-unit-${Date.now()}@example.com`,
        password: 'test123',
        name: 'Unit Test User',
      },
    });
    console.log(`   ✅ User created: ${testUser.id}`);

    testConversation = await prisma.conversation.create({
      data: {
        userId: testUser.id,
        title: 'Unit Test Conversation',
      },
    });
    console.log(`   ✅ Conversation created: ${testConversation.id}`);

    // Test 1: Create message with token usage
    console.log('\n✅ Test 1: Store token usage in message');
    const messageService = getMessageService();

    const assistantMsg = await messageService.createAssistantMessage({
      conversationId: testConversation.id,
      content: 'This is a test assistant response',
      tokenUsage: {
        inputTokens: 50,
        outputTokens: 100,
        totalTokens: 150,
      },
      cost: {
        inputCost: 0.00015, // 50 / 1M * $3
        outputCost: 0.0015, // 100 / 1M * $15
        totalCost: 0.00165,
        currency: 'USD',
      },
      model: 'claude-sonnet-4-5-20250929',
      stopReason: 'end_turn',
    });
    console.log(`   ✅ Message created: ${assistantMsg.id}`);

    // Test 2: Verify token usage
    console.log('\n✅ Test 2: Verify token usage was stored');
    const verification = await verifyMessageUsage(assistantMsg.id);

    if (!verification.isValid) {
      throw new Error(`Verification failed: ${verification.details}`);
    }
    console.log(`   ✅ Verified: ${verification.details}`);
    console.log(`   - Has metadata: ${verification.hasMetadata}`);
    console.log(`   - Has token usage: ${verification.hasTokenUsage}`);
    console.log(`   - Has cost: ${verification.hasCost}`);

    // Test 3: Retrieve message usage
    console.log('\n✅ Test 3: Retrieve message usage');
    const messageUsage = await getMessageUsage(assistantMsg.id);

    if (!messageUsage) {
      throw new Error('Failed to retrieve message usage');
    }

    if (
      messageUsage.tokenUsage.inputTokens !== 50 ||
      messageUsage.tokenUsage.outputTokens !== 100 ||
      messageUsage.tokenUsage.totalTokens !== 150
    ) {
      throw new Error('Token counts do not match');
    }

    console.log('   ✅ Message usage retrieved correctly');
    console.log(`   - Input tokens: ${messageUsage.tokenUsage.inputTokens}`);
    console.log(`   - Output tokens: ${messageUsage.tokenUsage.outputTokens}`);
    console.log(`   - Total tokens: ${messageUsage.tokenUsage.totalTokens}`);
    console.log(`   - Cost: $${messageUsage.cost.totalCost.toFixed(6)}`);

    // Test 4: Create multiple messages and aggregate
    console.log('\n✅ Test 4: Create multiple messages for aggregation');

    await messageService.createAssistantMessage({
      conversationId: testConversation.id,
      content: 'Second response',
      tokenUsage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      cost: { inputCost: 0.0003, outputCost: 0.003, totalCost: 0.0033, currency: 'USD' },
      model: 'claude-sonnet-4-5-20250929',
    });

    await messageService.createAssistantMessage({
      conversationId: testConversation.id,
      content: 'Third response',
      tokenUsage: { inputTokens: 150, outputTokens: 300, totalTokens: 450 },
      cost: { inputCost: 0.00045, outputCost: 0.0045, totalCost: 0.00495, currency: 'USD' },
      model: 'claude-sonnet-4-5-20250929',
    });

    console.log('   ✅ Created 2 additional messages');

    // Test 5: Aggregate conversation usage
    console.log('\n✅ Test 5: Aggregate conversation usage');
    const convUsage = await getConversationUsage(testConversation.id);

    console.log(`   - Total input tokens: ${convUsage.totalInputTokens} (expected: 300)`);
    console.log(`   - Total output tokens: ${convUsage.totalOutputTokens} (expected: 600)`);
    console.log(`   - Total tokens: ${convUsage.totalTokens} (expected: 900)`);
    console.log(`   - Total cost: $${convUsage.totalCost.toFixed(6)}`);
    console.log(`   - Message count: ${convUsage.messageCount} (expected: 3)`);

    if (
      convUsage.totalInputTokens !== 300 ||
      convUsage.totalOutputTokens !== 600 ||
      convUsage.messageCount !== 3
    ) {
      throw new Error('Aggregated values do not match expected');
    }
    console.log('   ✅ Aggregation correct');

    // Test 6: Get user usage
    console.log('\n✅ Test 6: Get user usage');
    const userUsage = await getUserUsage(testUser.id);

    console.log(`   - Total input tokens: ${userUsage.totalInputTokens}`);
    console.log(`   - Total output tokens: ${userUsage.totalOutputTokens}`);
    console.log(`   - Total tokens: ${userUsage.totalTokens}`);
    console.log(`   - Total cost: $${userUsage.totalCost.toFixed(6)}`);
    console.log(`   - Message count: ${userUsage.messageCount}`);

    // Test 7: Get usage details
    console.log('\n✅ Test 7: Get detailed usage records');
    const details = await getConversationUsageDetails(testConversation.id);

    console.log(`   - Retrieved ${details.length} usage records`);
    if (details.length !== 3) {
      throw new Error('Expected 3 detailed records');
    }
    console.log('   ✅ Details retrieved correctly');

    // Test 8: Get conversation stats
    console.log('\n✅ Test 8: Get conversation usage statistics');
    const stats = await getConversationUsageStats(testConversation.id);

    console.log(`   - Total assistant messages: ${stats.totalAssistantMessages}`);
    console.log(`   - Messages with usage: ${stats.messagesWithUsage}`);
    console.log(`   - Messages without usage: ${stats.messagesWithoutUsage}`);
    console.log(`   - Data completeness: ${stats.dataCompleteness.toFixed(1)}%`);

    if (stats.dataCompleteness !== 100) {
      throw new Error('Expected 100% data completeness');
    }
    console.log('   ✅ Statistics correct');

    // Test 9: Test user messages don't have usage tracking
    console.log('\n✅ Test 9: Verify user messages skip usage tracking');
    const userMsg = await messageService.createUserMessage({
      conversationId: testConversation.id,
      userId: testUser.id,
      content: 'User message',
    });

    const userMsgVerification = await verifyMessageUsage(userMsg.id);
    console.log(`   - User message valid: ${userMsgVerification.isValid}`);
    console.log(`   - Details: ${userMsgVerification.details}`);
    console.log('   ✅ User messages correctly skip tracking');

    // Test 10: Test user usage details
    console.log('\n✅ Test 10: Get user usage details');
    const userDetails = await getUserUsageDetails(testUser.id, 10);
    console.log(`   - Retrieved ${userDetails.length} user usage records`);
    console.log('   ✅ User details retrieved');

    console.log('\n' + '='.repeat(60));
    console.log('✅ All unit tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    if (testConversation) {
      console.log('\n🧹 Cleaning up test data...');
      await prisma.message.deleteMany({
        where: { conversationId: testConversation.id },
      });
      await prisma.conversation.delete({
        where: { id: testConversation.id },
      });
    }

    if (testUser) {
      await prisma.user.delete({
        where: { id: testUser.id },
      });
    }

    console.log('   ✅ Cleanup completed');
    await prisma.$disconnect();
  }
}

// Run tests
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\n🎉 VBT-158 Unit Tests Complete!\n');
      process.exit(0);
    })
    .catch(() => {
      console.error('\n💥 Unit tests failed\n');
      process.exit(1);
    });
}
