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
import { AIProviderFactory, ProviderType } from '../../services/ai/providers';

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
  assert(stats.registeredProviders !== undefined, 'Should have registered providers');
  assert(stats.providerCount !== undefined && stats.providerCount > 0, 'Should have provider count');

  console.log('Statistics:', JSON.stringify(stats, null, 2));
  console.log('✅ Statistics tracking test passed\n');
}

/**
 * VBT-172: Test provider status information
 */
async function testProviderStatus() {
  console.log('Test: Provider Status (VBT-172)');

  // Get provider from factory
  const factory = AIProviderFactory.getInstance();
  const provider = factory.createProvider(ProviderType.CLAUDE, {
    provider: ProviderType.CLAUDE,
    apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
    defaultModel: 'claude-sonnet-4-5-20250929',
    maxTokens: 2048,
    timeout: 30000,
    maxRetries: 3,
  });

  // Get provider status
  const status = provider.getProviderStatus();

  assert(status.initialized === true, 'Should be initialized');
  assert(status.circuitState !== undefined, 'Should have circuit state');
  assert(['CLOSED', 'HALF_OPEN', 'OPEN'].includes(status.circuitState), 'Should have valid circuit state');
  assert(typeof status.available === 'boolean', 'Should have availability flag');
  assert(typeof status.consecutiveFailures === 'number', 'Should have consecutive failures count');
  assert(typeof status.errorRate === 'number', 'Should have error rate');
  assert(status.errorRate >= 0 && status.errorRate <= 1, 'Error rate should be between 0 and 1');

  console.log('Provider Status:', {
    initialized: status.initialized,
    available: status.available,
    circuitState: status.circuitState,
    consecutiveFailures: status.consecutiveFailures,
    errorRate: status.errorRate,
  });

  console.log('✅ Provider status test passed\n');
}

/**
 * VBT-172: Test rate limit information
 */
async function testRateLimitInfo() {
  console.log('Test: Rate Limit Information (VBT-172)');

  // Get provider from factory
  const factory = AIProviderFactory.getInstance();
  const provider = factory.createProvider(ProviderType.CLAUDE, {
    provider: ProviderType.CLAUDE,
    apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
    defaultModel: 'claude-sonnet-4-5-20250929',
    maxTokens: 2048,
    timeout: 30000,
    maxRetries: 3,
  });

  // Get rate limit info
  const rateLimits = provider.getRateLimitInfo();

  assert(typeof rateLimits.isRateLimited === 'boolean', 'Should have isRateLimited flag');
  assert(rateLimits.requestsPerMinute !== undefined, 'Should have requestsPerMinute limit');
  assert(rateLimits.tokensPerMinute !== undefined, 'Should have tokensPerMinute limit');

  console.log('Rate Limit Info:', {
    isRateLimited: rateLimits.isRateLimited,
    requestsPerMinute: rateLimits.requestsPerMinute,
    tokensPerMinute: rateLimits.tokensPerMinute,
    tokensPerDay: rateLimits.tokensPerDay,
  });

  console.log('✅ Rate limit info test passed\n');
}

/**
 * VBT-172: Test model availability checking
 */
async function testModelAvailability() {
  console.log('Test: Model Availability (VBT-172)');

  // Get provider from factory
  const factory = AIProviderFactory.getInstance();
  const provider = factory.createProvider(ProviderType.CLAUDE, {
    provider: ProviderType.CLAUDE,
    apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
    defaultModel: 'claude-sonnet-4-5-20250929',
    maxTokens: 2048,
    timeout: 30000,
    maxRetries: 3,
  });

  // Check availability of a valid model
  const validModel = provider.checkModelAvailability('claude-sonnet-4-5-20250929');
  assert(validModel.modelId === 'claude-sonnet-4-5-20250929', 'Should return correct model ID');
  assert(validModel.available === true, 'Valid model should be available');
  assert(validModel.deprecated === false, 'Sonnet 4.5 should not be deprecated');

  // Check availability of an invalid model
  const invalidModel = provider.checkModelAvailability('invalid-model-xyz');
  assert(invalidModel.modelId === 'invalid-model-xyz', 'Should return queried model ID');
  assert(invalidModel.available === false, 'Invalid model should not be available');
  assert(invalidModel.unavailableReason !== undefined, 'Should have unavailability reason');

  console.log('Valid Model:', {
    modelId: validModel.modelId,
    available: validModel.available,
    deprecated: validModel.deprecated,
  });

  console.log('Invalid Model:', {
    modelId: invalidModel.modelId,
    available: invalidModel.available,
    unavailableReason: invalidModel.unavailableReason,
  });

  console.log('✅ Model availability test passed\n');
}

/**
 * VBT-172: Test provider metadata
 */
async function testProviderMetadata() {
  console.log('Test: Provider Metadata (VBT-172)');

  // Get provider from factory
  const factory = AIProviderFactory.getInstance();
  const provider = factory.createProvider(ProviderType.CLAUDE, {
    provider: ProviderType.CLAUDE,
    apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
    defaultModel: 'claude-sonnet-4-5-20250929',
    maxTokens: 2048,
    timeout: 30000,
    maxRetries: 3,
  });

  // Get provider metadata
  const metadata = provider.getMetadata();

  assert(metadata.type === ProviderType.CLAUDE, 'Should have correct provider type');
  assert(metadata.name !== undefined, 'Should have provider name');
  assert(metadata.description !== undefined, 'Should have provider description');
  assert(Array.isArray(metadata.models), 'Should have models array');
  assert(metadata.models.length > 0, 'Should have at least one model');
  assert(metadata.capabilities !== undefined, 'Should have capabilities');
  assert(typeof metadata.capabilities.streaming === 'boolean', 'Should have streaming capability');
  assert(typeof metadata.capabilities.vision === 'boolean', 'Should have vision capability');
  assert(metadata.capabilities.streaming === true, 'Claude should support streaming');

  console.log('Provider Metadata:', {
    type: metadata.type,
    name: metadata.name,
    modelCount: metadata.models.length,
    capabilities: metadata.capabilities,
  });

  console.log('✅ Provider metadata test passed\n');
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

    // VBT-172: Provider Capabilities and Metadata tests
    await testProviderStatus();
    await testRateLimitInfo();
    await testModelAvailability();
    await testProviderMetadata();

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
