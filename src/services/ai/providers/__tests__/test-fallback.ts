/**
 * FallbackChainManager Unit Tests
 * VBT-173: Tests for provider fallback logic
 *
 * Run with: npm run test:provider-unit
 */

import { FallbackChainManager } from '../fallback';
import { AIProviderFactory, ProviderConstructor } from '../factory';
import { ProviderType, ProviderConfig } from '../types';
import { IAIProvider } from '../IAIProvider';
import { MockProvider, MockProviderConfig } from './MockProvider';
import { ProviderError, ProviderErrorType } from '../errors';

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    testsFailed++;
    throw new Error(`Assertion failed: ${message}`);
  }
  testsPassed++;
}

// Helper to create provider constructor
const createMockProviderConstructor = (mockConfig?: MockProviderConfig): ProviderConstructor => {
  return (config: ProviderConfig): IAIProvider => {
    return new MockProvider(config, mockConfig);
  };
};

/**
 * Test 1: Basic fallback functionality
 */
async function testBasicFallback() {
  console.log('Test: Basic Fallback');

  const manager = FallbackChainManager.getInstance();
  const factory = AIProviderFactory.getInstance();

  // Register failing primary provider
  factory.registerProvider(
    ProviderType.CLAUDE,
    createMockProviderConstructor({ simulateError: true, errorType: ProviderErrorType.RATE_LIMIT })
  );

  // Register working fallback provider
  factory.registerProvider(
    ProviderType.OPENAI,
    createMockProviderConstructor({ mockResponse: 'Fallback response!' })
  );

  let result: string | null = null;

  try {
    result = await manager.executeWithFallback(
      ProviderType.CLAUDE,
      async (provider) => {
        const response = await provider.sendMessage({
          conversationId: 'test-conv',
          userId: 'test-user',
          messages: [{ role: 'user', content: 'Test message' }],
        });
        return response.content;
      },
      (type) => {
        return factory.createProvider(type, {
          provider: type,
          apiKey: 'test-key',
          defaultModel: 'mock-model-fast',
          maxTokens: 2048,
          timeout: 30000,
          maxRetries: 3,
        });
      }
    );
  } catch (error) {
    assert(false, `Should not throw error with fallback: ${error}`);
  }

  assert(result === 'Fallback response!', 'Should return fallback response');

  console.log('✅ Basic fallback test passed\n');
}

/**
 * Test 2: Fallback chain exhaustion
 */
async function testFallbackChainExhaustion() {
  console.log('Test: Fallback Chain Exhaustion');

  const manager = FallbackChainManager.getInstance();
  const factory = AIProviderFactory.getInstance();

  // Clear cache to avoid reusing providers from previous test
  await factory.clearCache();

  // Register all failing providers
  factory.registerProvider(
    ProviderType.CLAUDE,
    createMockProviderConstructor({ simulateError: true })
  );

  factory.registerProvider(
    ProviderType.OPENAI,
    createMockProviderConstructor({ simulateError: true })
  );

  let didThrow = false;

  try {
    await manager.executeWithFallback(
      ProviderType.CLAUDE,
      async (provider) => {
        await provider.sendMessage({
          conversationId: 'test-conv',
          userId: 'test-user',
          messages: [{ role: 'user', content: 'Test message' }],
        });
        return 'success';
      },
      (type) => {
        return factory.createProvider(type, {
          provider: type,
          apiKey: 'test-key',
          defaultModel: 'mock-model-fast',
          maxTokens: 2048,
          timeout: 30000,
          maxRetries: 3,
        });
      }
    );
  } catch (error) {
    didThrow = true;
    assert(error instanceof ProviderError, 'Should throw ProviderError');
  }

  assert(didThrow, 'Should throw error when all fallbacks fail');

  console.log('✅ Fallback exhaustion test passed\n');
}

/**
 * Test 3: Custom fallback chain
 */
async function testCustomFallbackChain() {
  console.log('Test: Custom Fallback Chain');

  const manager = FallbackChainManager.getInstance();

  // Set custom chain
  manager.setFallbackChain(ProviderType.CLAUDE, [ProviderType.OPENAI]);

  const chain = manager.getFallbackChain(ProviderType.CLAUDE);

  assert(chain.length === 1, 'Should have 1 fallback');
  assert(chain[0] === ProviderType.OPENAI, 'Should have OpenAI as fallback');

  console.log('✅ Custom fallback chain test passed\n');
}

/**
 * Test 4: Fallback statistics
 */
async function testFallbackStatistics() {
  console.log('Test: Fallback Statistics');

  const manager = FallbackChainManager.getInstance();
  const factory = AIProviderFactory.getInstance();

  // Clear cache and stats
  await factory.clearCache();
  manager.clearStats();

  // Trigger fallback
  factory.registerProvider(
    ProviderType.CLAUDE,
    createMockProviderConstructor({ simulateError: true })
  );

  factory.registerProvider(
    ProviderType.OPENAI,
    createMockProviderConstructor({ mockResponse: 'Success' })
  );

  await manager.executeWithFallback(
    ProviderType.CLAUDE,
    async (provider) => {
      const response = await provider.sendMessage({
        conversationId: 'test-conv',
        userId: 'test-user',
        messages: [{ role: 'user', content: 'Test' }],
      });
      return response.content;
    },
    (type) => {
      return factory.createProvider(type, {
        provider: type,
        apiKey: 'test-key',
        defaultModel: 'mock-model-fast',
        maxTokens: 2048,
        timeout: 30000,
        maxRetries: 3,
      });
    }
  );

  const stats = manager.getStats();

  assert(stats.size > 0, 'Should have statistics');

  // Stats are keyed as "FROM->TO" transitions
  const fallbackKey = `${ProviderType.CLAUDE}->${ProviderType.OPENAI}`;
  const claudeToOpenAIStats = stats.get(fallbackKey);
  assert(claudeToOpenAIStats !== undefined, 'Should have Claude->OpenAI fallback statistics');
  assert(typeof claudeToOpenAIStats === 'number' && claudeToOpenAIStats > 0, 'Should track fallback count');

  console.log('Statistics:', Array.from(stats.entries()));
  console.log('✅ Fallback statistics test passed\n');
}

/**
 * Test 5: No fallback needed
 */
async function testNoFallbackNeeded() {
  console.log('Test: No Fallback Needed');

  const manager = FallbackChainManager.getInstance();
  const factory = AIProviderFactory.getInstance();

  // Clear cache
  await factory.clearCache();

  // Register working provider
  factory.registerProvider(
    ProviderType.CLAUDE,
    createMockProviderConstructor({ mockResponse: 'Primary response!' })
  );

  const result = await manager.executeWithFallback(
    ProviderType.CLAUDE,
    async (provider) => {
      const response = await provider.sendMessage({
        conversationId: 'test-conv',
        userId: 'test-user',
        messages: [{ role: 'user', content: 'Test' }],
      });
      return response.content;
    },
    (type) => {
      return factory.createProvider(type, {
        provider: type,
        apiKey: 'test-key',
        defaultModel: 'mock-model-fast',
        maxTokens: 2048,
        timeout: 30000,
        maxRetries: 3,
      });
    }
  );

  assert(result === 'Primary response!', 'Should return primary response');

  console.log('✅ No fallback needed test passed\n');
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 FALLBACK CHAIN MANAGER UNIT TESTS (VBT-173)');
  console.log('='.repeat(70));
  console.log('Testing provider fallback logic and chain management\n');

  try {
    await testBasicFallback();
    await testFallbackChainExhaustion();
    await testCustomFallbackChain();
    await testFallbackStatistics();
    await testNoFallbackNeeded();

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL FALLBACK TESTS PASSED!');
    console.log('='.repeat(70));
    console.log(`Total: ${testsPassed + testsFailed} assertions`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log('='.repeat(70) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ FALLBACK TEST SUITE FAILED');
    console.error('='.repeat(70));
    console.error(`Total: ${testsPassed + testsFailed} assertions`);
    console.error(`Passed: ${testsPassed}`);
    console.error(`Failed: ${testsFailed}`);
    console.error('='.repeat(70));
    console.error('\nError:', error);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running fallback tests:', error);
  process.exit(1);
});
