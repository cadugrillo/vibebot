/**
 * AI Provider Factory Unit Tests
 * VBT-173: Tests for provider creation, caching, and registration
 *
 * Run with: npm run test:provider-unit
 */

import { AIProviderFactory, ProviderFactoryError, ProviderConstructor } from '../factory';
import { ProviderType, ProviderConfig } from '../types';
import { ClaudeProvider } from '../claude';
import { MockProvider } from './MockProvider';
import { IAIProvider } from '../IAIProvider';

// Helper function to create MockProvider constructor
const createMockProviderConstructor = (): ProviderConstructor => {
  return (config: ProviderConfig): IAIProvider => {
    return new MockProvider(config);
  };
};

// Helper function to create ClaudeProvider constructor
const createClaudeProviderConstructor = (): ProviderConstructor => {
  return (config: ProviderConfig): IAIProvider => {
    return new ClaudeProvider(config);
  };
};

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

/**
 * Test 1: Factory singleton pattern
 */
async function testFactorySingleton() {
  console.log('Test: Factory Singleton Pattern');

  const factory1 = AIProviderFactory.getInstance();
  const factory2 = AIProviderFactory.getInstance();

  assert(factory1 === factory2, 'getInstance should return same instance');

  console.log('✅ Singleton test passed\n');
}

/**
 * Test 2: Provider registration
 */
async function testProviderRegistration() {
  console.log('Test: Provider Registration');

  const factory = AIProviderFactory.getInstance();

  // Register mock provider
  factory.registerProvider(ProviderType.CLAUDE, createMockProviderConstructor());

  const registered = factory.getRegisteredProviders();
  assert(registered.includes(ProviderType.CLAUDE), 'Should include registered provider');

  console.log(`✅ Registration test passed (${registered.length} providers)\n`);
}

/**
 * Test 3: Provider creation
 */
async function testProviderCreation() {
  console.log('Test: Provider Creation');

  const factory = AIProviderFactory.getInstance();
  factory.registerProvider(ProviderType.CLAUDE, createMockProviderConstructor());

  const config: ProviderConfig = {
    provider: ProviderType.CLAUDE,
    apiKey: 'test-key',
    defaultModel: 'mock-model-fast',
    maxTokens: 2048,
    timeout: 30000,
    maxRetries: 3,
  };

  const provider = factory.createProvider(ProviderType.CLAUDE, config);

  assert(provider !== null, 'Should create provider');
  assert(provider.getProviderType() === ProviderType.CLAUDE, 'Should have correct type');
  assert(provider.isInitialized(), 'Should be initialized');

  console.log('✅ Provider creation test passed\n');
}

/**
 * Test 4: Provider caching
 */
async function testProviderCaching() {
  console.log('Test: Provider Caching');

  const factory = AIProviderFactory.getInstance();
  factory.registerProvider(ProviderType.CLAUDE, createMockProviderConstructor());

  const config: ProviderConfig = {
    provider: ProviderType.CLAUDE,
    apiKey: 'test-key',
    defaultModel: 'mock-model-fast',
    maxTokens: 2048,
    timeout: 30000,
    maxRetries: 3,
  };

  // Create first provider
  const provider1 = factory.createProvider(ProviderType.CLAUDE, config);

  // Create second provider with same config
  const provider2 = factory.createProvider(ProviderType.CLAUDE, config);

  // Should be same instance due to caching
  assert(provider1 === provider2, 'Should return cached instance');

  // Clear cache (await since it's async)
  await factory.clearCache();

  // Create third provider after cache clear
  const provider3 = factory.createProvider(ProviderType.CLAUDE, config);

  // Should be different instance
  assert(provider1 !== provider3, 'Should create new instance after cache clear');

  console.log('✅ Caching test passed\n');
}

/**
 * Test 5: Invalid provider creation
 */
async function testInvalidProviderCreation() {
  console.log('Test: Invalid Provider Creation');

  const factory = AIProviderFactory.getInstance();

  try {
    // Try to create unregistered provider
    factory.createProvider(ProviderType.OPENAI, {
      provider: ProviderType.OPENAI,
      apiKey: 'test',
      defaultModel: 'gpt-4',
      maxTokens: 2048,
      timeout: 30000,
      maxRetries: 3,
    });

    assert(false, 'Should throw error for unregistered provider');
  } catch (error) {
    assert(error instanceof ProviderFactoryError, 'Should throw ProviderFactoryError');
    assert((error as Error).message.includes('not registered'), 'Error should mention unregistered');
  }

  console.log('✅ Invalid provider test passed\n');
}

/**
 * Test 6: Multiple provider types
 */
async function testMultipleProviderTypes() {
  console.log('Test: Multiple Provider Types');

  const factory = AIProviderFactory.getInstance();
  factory.clearCache();

  // Register multiple providers
  factory.registerProvider(ProviderType.CLAUDE, createMockProviderConstructor());
  factory.registerProvider(ProviderType.OPENAI, createMockProviderConstructor());

  const registered = factory.getRegisteredProviders();

  assert(registered.length === 2, 'Should have 2 registered providers');
  assert(registered.includes(ProviderType.CLAUDE), 'Should include Claude');
  assert(registered.includes(ProviderType.OPENAI), 'Should include OpenAI');

  // Create both types
  const claudeProvider = factory.createProvider(ProviderType.CLAUDE, {
    provider: ProviderType.CLAUDE,
    apiKey: 'test',
    defaultModel: 'mock-model-fast',
    maxTokens: 2048,
    timeout: 30000,
    maxRetries: 3,
  });

  const openaiProvider = factory.createProvider(ProviderType.OPENAI, {
    provider: ProviderType.OPENAI,
    apiKey: 'test',
    defaultModel: 'mock-model-fast',
    maxTokens: 2048,
    timeout: 30000,
    maxRetries: 3,
  });

  assert(claudeProvider.getProviderType() === ProviderType.CLAUDE, 'Claude provider should have correct type');
  assert(openaiProvider.getProviderType() === ProviderType.OPENAI, 'OpenAI provider should have correct type');

  console.log('✅ Multiple provider types test passed\n');
}

/**
 * Test 7: Factory reset
 */
async function testFactoryReset() {
  console.log('Test: Factory Reset');

  const factory1 = AIProviderFactory.getInstance();
  factory1.registerProvider(ProviderType.CLAUDE, createMockProviderConstructor());

  const registered1 = factory1.getRegisteredProviders();
  assert(registered1.length > 0, 'Should have registered providers');

  // Reset factory
  AIProviderFactory.resetInstance();

  const factory2 = AIProviderFactory.getInstance();
  const registered2 = factory2.getRegisteredProviders();

  assert(registered2.length === 0, 'Should have no registered providers after reset');
  assert(factory1 !== factory2, 'Should be different instance after reset');

  console.log('✅ Factory reset test passed\n');
}

/**
 * Test 8: Real ClaudeProvider registration
 */
async function testRealClaudeProvider() {
  console.log('Test: Real ClaudeProvider Registration');

  const factory = AIProviderFactory.getInstance();

  // Register real Claude provider
  factory.registerProvider(ProviderType.CLAUDE, createClaudeProviderConstructor());

  const config: ProviderConfig = {
    provider: ProviderType.CLAUDE,
    apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
    defaultModel: 'claude-sonnet-4-5-20250929',
    maxTokens: 2048,
    timeout: 30000,
    maxRetries: 3,
  };

  const provider = factory.createProvider(ProviderType.CLAUDE, config);

  assert(provider instanceof ClaudeProvider, 'Should create ClaudeProvider instance');
  assert(provider.getProviderType() === ProviderType.CLAUDE, 'Should have Claude type');
  assert(provider.isInitialized(), 'Should be initialized');

  // Test metadata
  const metadata = provider.getMetadata();
  assert(metadata.type === ProviderType.CLAUDE, 'Metadata should have Claude type');
  assert(metadata.models.length > 0, 'Should have models');
  assert(metadata.capabilities.streaming === true, 'Should support streaming');

  console.log('✅ Real ClaudeProvider test passed\n');
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 AI PROVIDER FACTORY UNIT TESTS (VBT-173)');
  console.log('='.repeat(70));
  console.log('Testing provider factory creation, caching, and registration\n');

  try {
    await testFactorySingleton();
    await testProviderRegistration();
    await testProviderCreation();
    await testProviderCaching();
    await testInvalidProviderCreation();
    await testMultipleProviderTypes();
    await testFactoryReset();
    await testRealClaudeProvider();

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL FACTORY TESTS PASSED!');
    console.log('='.repeat(70));
    console.log(`Total: ${testsPassed + testsFailed} assertions`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log('='.repeat(70) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ FACTORY TEST SUITE FAILED');
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
  console.error('Fatal error running factory tests:', error);
  process.exit(1);
});
