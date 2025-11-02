/**
 * AI Integration Test Script
 * Tests AIIntegrationHandler functionality without requiring a test framework
 *
 * Run with: npm run test:ai-integration
 */

// Load environment variables
import 'dotenv/config';

import { AIIntegrationHandler } from './aiIntegration';
import { MessageEventType } from './messageHandlers';

// Mock WebSocket server for testing
class MockWebSocketServer {
  private sentMessages: any[] = [];

  sendToConversation(conversationId: string, message: any): void {
    this.sentMessages.push({ conversationId, message });
    console.log(`📨 Sent to conversation ${conversationId}:`, message.type);
  }

  getSentMessages(): any[] {
    return this.sentMessages;
  }

  clearMessages(): void {
    this.sentMessages = [];
  }
}

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`✅ ${message}`);
    testsPassed++;
  } else {
    console.error(`❌ ${message}`);
    testsFailed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual: any, expected: any, message: string): void {
  if (actual === expected) {
    console.log(`✅ ${message}`);
    testsPassed++;
  } else {
    console.error(`❌ ${message}`);
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual: ${actual}`);
    testsFailed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Commented out - not used in current tests
// async function sleep(ms: number): Promise<void> {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

// Test scenarios
async function testInitialization(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('Test 1: Initialization');
  console.log('='.repeat(70));

  const mockWs = new MockWebSocketServer() as any;
  const handler = new AIIntegrationHandler(mockWs);

  console.log('Initializing AI handler...');
  await handler.initialize();

  assert(handler.isReady(), 'Handler should be ready after initialization');
  console.log('✅ Initialization test passed\n');
}

async function testAIResponseGeneration(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('Test 2: AI Response Generation');
  console.log('='.repeat(70));

  const mockWs = new MockWebSocketServer() as any;
  const handler = new AIIntegrationHandler(mockWs, {
    maxTokens: 100, // Small response for testing
  });

  await handler.initialize();

  console.log('Generating AI response...');
  const startTime = Date.now();

  await handler.generateAIResponse({
    conversationId: 'test-conv-123',
    userId: 'test-user-123',
    messageId: 'test-msg-123',
    content: 'Say hello in exactly 3 words',
  });

  const elapsed = Date.now() - startTime;
  console.log(`Response generated in ${elapsed}ms`);

  const messages = mockWs.getSentMessages();

  // Should have at least one delta and one complete event
  const streamMessages = messages.filter(
    (m: any) => m.message.type === MessageEventType.STREAM
  );

  assert(streamMessages.length > 0, 'Should send stream messages');

  const deltaMessages = streamMessages.filter(
    (m: any) => !m.message.isComplete
  );
  const completeMessages = streamMessages.filter(
    (m: any) => m.message.isComplete
  );

  assert(deltaMessages.length > 0, 'Should send delta (chunk) messages');
  assert(completeMessages.length === 1, 'Should send exactly one complete message');

  // Combine all delta content
  const fullContent = deltaMessages
    .map((m: any) => m.message.content)
    .join('');

  console.log(`Full AI response: "${fullContent}"`);
  assert(fullContent.length > 0, 'AI response should have content');

  console.log('✅ AI response generation test passed\n');
}

async function testConversationHistory(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('Test 3: Conversation History Management');
  console.log('='.repeat(70));

  const mockWs = new MockWebSocketServer() as any;
  const handler = new AIIntegrationHandler(mockWs, {
    maxTokens: 50, // Very small for speed
  });

  await handler.initialize();

  console.log('Sending first message...');
  await handler.generateAIResponse({
    conversationId: 'conv-history-test',
    userId: 'user-123',
    messageId: 'msg-1',
    content: 'Remember the number 42',
  });

  console.log('Sending second message (testing context)...');
  mockWs.clearMessages();

  await handler.generateAIResponse({
    conversationId: 'conv-history-test',
    userId: 'user-123',
    messageId: 'msg-2',
    content: 'What number did I just mention?',
  });

  const messages = mockWs.getSentMessages();
  const deltaMessages = messages.filter(
    (m: any) => m.message.type === MessageEventType.STREAM && !m.message.isComplete
  );

  const response = deltaMessages
    .map((m: any) => m.message.content)
    .join('');

  console.log(`AI response with context: "${response}"`);

  // Check stats
  const stats = handler.getStats();
  assert(stats.conversationCount === 1, 'Should track one conversation');

  console.log('✅ Conversation history test passed\n');
}

async function testMultipleConversations(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('Test 4: Multiple Conversations');
  console.log('='.repeat(70));

  const mockWs = new MockWebSocketServer() as any;
  const handler = new AIIntegrationHandler(mockWs, {
    maxTokens: 50,
  });

  await handler.initialize();

  // Start multiple conversations in parallel
  console.log('Starting 3 parallel conversations...');
  await Promise.all([
    handler.generateAIResponse({
      conversationId: 'conv-1',
      userId: 'user-1',
      messageId: 'msg-1-1',
      content: 'Say A',
    }),
    handler.generateAIResponse({
      conversationId: 'conv-2',
      userId: 'user-2',
      messageId: 'msg-2-1',
      content: 'Say B',
    }),
    handler.generateAIResponse({
      conversationId: 'conv-3',
      userId: 'user-3',
      messageId: 'msg-3-1',
      content: 'Say C',
    }),
  ]);

  const stats = handler.getStats();
  assertEquals(stats.conversationCount, 3, 'Should track 3 conversations');

  // Verify messages went to correct conversations
  const messages = mockWs.getSentMessages();
  const conv1Messages = messages.filter((m: any) => m.conversationId === 'conv-1');
  const conv2Messages = messages.filter((m: any) => m.conversationId === 'conv-2');
  const conv3Messages = messages.filter((m: any) => m.conversationId === 'conv-3');

  assert(conv1Messages.length > 0, 'Conversation 1 should have messages');
  assert(conv2Messages.length > 0, 'Conversation 2 should have messages');
  assert(conv3Messages.length > 0, 'Conversation 3 should have messages');

  console.log('✅ Multiple conversations test passed\n');
}

async function testHistoryClear(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('Test 5: Clear Conversation History');
  console.log('='.repeat(70));

  const mockWs = new MockWebSocketServer() as any;
  const handler = new AIIntegrationHandler(mockWs, {
    maxTokens: 50,
  });

  await handler.initialize();

  await handler.generateAIResponse({
    conversationId: 'conv-clear-test',
    userId: 'user-123',
    messageId: 'msg-1',
    content: 'Test message',
  });

  let stats = handler.getStats();
  assertEquals(stats.conversationCount, 1, 'Should have 1 conversation before clear');

  console.log('Clearing conversation history...');
  handler.clearHistory('conv-clear-test');

  stats = handler.getStats();
  assertEquals(stats.conversationCount, 0, 'Should have 0 conversations after clear');

  console.log('✅ History clear test passed\n');
}

async function testConfiguration(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('Test 6: Configuration Management');
  console.log('='.repeat(70));

  const mockWs = new MockWebSocketServer() as any;

  // Test with custom config
  const handler = new AIIntegrationHandler(mockWs, {
    maxTokens: 100,
    temperature: 0.5,
    systemPrompt: 'You are a test assistant',
  });

  await handler.initialize();
  assert(handler.isReady(), 'Handler should initialize with custom config');

  // Update config
  handler.updateConfig({
    maxTokens: 200,
    temperature: 0.8,
  });

  console.log('✅ Configuration test passed\n');
}

async function testStatistics(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('Test 7: Statistics Tracking');
  console.log('='.repeat(70));

  const mockWs = new MockWebSocketServer() as any;
  const handler = new AIIntegrationHandler(mockWs, {
    maxTokens: 50,
  });

  await handler.initialize();

  // Generate multiple responses
  await handler.generateAIResponse({
    conversationId: 'conv-stats',
    userId: 'user-123',
    messageId: 'msg-1',
    content: 'Test 1',
  });

  await handler.generateAIResponse({
    conversationId: 'conv-stats',
    userId: 'user-123',
    messageId: 'msg-2',
    content: 'Test 2',
  });

  const stats = handler.getStats();

  assert(stats.ready === true, 'Should report ready status');
  assert(stats.conversationCount === 1, 'Should track conversations');
  assert(stats.errorStats !== undefined, 'Should have error stats');
  assert(stats.circuitBreakerStats !== undefined, 'Should have circuit breaker stats');

  console.log('Statistics:', JSON.stringify(stats, null, 2));
  console.log('✅ Statistics tracking test passed\n');
}

// Main test runner
async function runTests(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 AI INTEGRATION TEST SUITE');
  console.log('='.repeat(70));
  console.log('Testing AIIntegrationHandler with WebSocket integration\n');

  try {
    await testInitialization();
    await testAIResponseGeneration();
    await testConversationHistory();
    await testMultipleConversations();
    await testHistoryClear();
    await testConfiguration();
    await testStatistics();

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(70));
    console.log(`Total: ${testsPassed + testsFailed} tests`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log('='.repeat(70) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ TEST SUITE FAILED');
    console.error('='.repeat(70));
    console.error(`Total: ${testsPassed + testsFailed} tests`);
    console.error(`Passed: ${testsPassed}`);
    console.error(`Failed: ${testsFailed}`);
    console.error('='.repeat(70));
    console.error('\nError:', error);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
