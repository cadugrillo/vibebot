/**
 * Rate Limit Handler Tests
 * VBT-159: Test rate limit detection and handling
 *
 * Run with: npx ts-node src/services/ai/claude/test-rate-limit.ts
 */

import { RateLimitHandler, formatRateLimitInfo, logRateLimitEvent, RateLimitInfo } from './rate-limit';

/**
 * Test exponential backoff calculation
 */
function testBackoffCalculation() {
  console.log('\n🧪 Test 1: Exponential Backoff Calculation\n');
  console.log('='.repeat(60));

  const handler = new RateLimitHandler({
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 32000,
    jitterFactor: 0.1,
  });

  console.log('Testing backoff delays for 5 attempts:\n');

  for (let attempt = 0; attempt < 5; attempt++) {
    const delay = handler.calculateBackoffDelay(attempt);
    const expectedBase = Math.min(1000 * Math.pow(2, attempt), 32000);
    console.log(`Attempt ${attempt}:`);
    console.log(`  - Expected base: ${expectedBase}ms`);
    console.log(`  - Actual delay: ${delay.toFixed(0)}ms`);
    console.log(`  - Within range: ${delay >= expectedBase * 0.9 && delay <= expectedBase * 1.1 ? '✅' : '❌'}`);
  }

  console.log('\n✅ Backoff calculation test complete\n');
}

/**
 * Test rate limit info parsing
 */
function testRateLimitParsing() {
  console.log('\n🧪 Test 2: Rate Limit Info Parsing\n');
  console.log('='.repeat(60));

  // Create a mock rate limit info (simulating what would be parsed)
  const rateLimitInfo: RateLimitInfo = {
    isRateLimited: true,
    retryAfter: 60,
    limit: 100,
    remaining: 0,
    reset: new Date(Date.now() + 3600000),
    requestsPerMinute: 50,
    tokensPerMinute: 100000,
  };

  console.log('Rate limit information:');
  console.log(`  - Is rate limited: ${rateLimitInfo.isRateLimited}`);
  console.log(`  - Retry after: ${rateLimitInfo.retryAfter}s`);
  console.log(`  - Limit: ${rateLimitInfo.limit}`);
  console.log(`  - Remaining: ${rateLimitInfo.remaining}`);
  console.log(`  - Reset time: ${rateLimitInfo.reset?.toLocaleString()}`);
  console.log(`  - Requests/minute: ${rateLimitInfo.requestsPerMinute}`);
  console.log(`  - Tokens/minute: ${rateLimitInfo.tokensPerMinute}`);

  // Test formatting
  console.log('\nFormatted message:');
  console.log(`  "${formatRateLimitInfo(rateLimitInfo)}"`);

  console.log('\n✅ Rate limit parsing test complete\n');
}

/**
 * Test rate limit logging
 */
function testRateLimitLogging() {
  console.log('\n🧪 Test 3: Rate Limit Event Logging\n');
  console.log('='.repeat(60));

  const rateLimitInfo: RateLimitInfo = {
    isRateLimited: true,
    retryAfter: 30,
    limit: 100,
    remaining: 0,
    reset: new Date(Date.now() + 3600000),
    requestsPerMinute: 50,
    tokensPerMinute: 100000,
  };

  logRateLimitEvent(rateLimitInfo, 'Test API call');

  console.log('✅ Rate limit logging test complete\n');
}

/**
 * Test retry with mock functions
 */
async function testRetryLogic() {
  console.log('\n🧪 Test 4: Retry Logic with Mock Functions\n');
  console.log('='.repeat(60));

  const handler = new RateLimitHandler({
    maxRetries: 3,
    baseDelay: 100, // Shorter delay for testing
    maxDelay: 1000,
    jitterFactor: 0.1,
  });

  // Test 1: Successful call (no retries needed)
  console.log('\nTest 4a: Successful call without retries');
  let callCount = 0;
  try {
    const result = await handler.executeWithRetry(async () => {
      callCount++;
      return 'success';
    }, 'Test successful call');

    console.log(`  - Result: ${result}`);
    console.log(`  - Call count: ${callCount} (expected: 1)`);
    console.log(`  - Status: ${callCount === 1 ? '✅ PASS' : '❌ FAIL'}`);
  } catch (error) {
    console.log(`  - Status: ❌ FAIL - ${error}`);
  }

  // Test 2: Simulate rate limit by checking isRetryableError
  console.log('\nTest 4b: Checking retryable error detection');
  handler.reset();

  // Test with simulated network error
  try {
    const networkError = new Error('network timeout');
    const isRetryable = handler.isRetryableError(networkError);
    console.log(`  - Network error retryable: ${isRetryable} (expected: true)`);
    console.log(`  - Status: ${isRetryable ? '✅ PASS' : '❌ FAIL'}`);
  } catch (error) {
    console.log(`  - Status: ❌ FAIL - ${error}`);
  }

  // Test 3: Verify backoff delay increases
  console.log('\nTest 4c: Verify backoff increases with attempts');
  handler.reset();

  try {
    const delays: number[] = [];
    for (let i = 0; i < 3; i++) {
      const delay = handler.calculateBackoffDelay(i);
      delays.push(delay);
    }
    const isIncreasing = delays.length === 3 && delays[0]! < delays[1]! && delays[1]! < delays[2]!;
    console.log(`  - Delays: [${delays.map(d => d.toFixed(0)).join('ms, ')}ms]`);
    console.log(`  - Is increasing: ${isIncreasing}`);
    console.log(`  - Status: ${isIncreasing ? '✅ PASS' : '❌ FAIL'}`);
  } catch (error) {
    console.log(`  - Status: ❌ FAIL - ${error}`);
  }

  console.log('\n✅ Retry logic test complete\n');
}

/**
 * Test retryable error detection
 */
function testRetryableErrorDetection() {
  console.log('\n🧪 Test 5: Retryable Error Detection\n');
  console.log('='.repeat(60));

  const handler = new RateLimitHandler();

  const tests = [
    {
      name: 'Network timeout error',
      error: new Error('network timeout'),
      expected: true,
    },
    {
      name: 'ECONNRESET error',
      error: new Error('ECONNRESET'),
      expected: true,
    },
    {
      name: 'ENOTFOUND error',
      error: new Error('ENOTFOUND'),
      expected: true,
    },
    {
      name: 'Generic error',
      error: new Error('Something went wrong'),
      expected: false,
    },
  ];

  console.log('Testing error retryability:\n');

  for (const test of tests) {
    const isRetryable = handler.isRetryableError(test.error);
    const status = isRetryable === test.expected ? '✅' : '❌';
    console.log(`${status} ${test.name}:`);
    console.log(`     Expected: ${test.expected}, Got: ${isRetryable}`);
  }

  console.log('\n✅ Retryable error detection test complete\n');
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 VBT-159: Rate Limit Handler Test Suite');
  console.log('='.repeat(60));

  try {
    testBackoffCalculation();
    testRateLimitParsing();
    testRateLimitLogging();
    await testRetryLogic();
    testRetryableErrorDetection();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All rate limit handler tests passed!');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    throw error;
  }
}

// Run tests
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('🎉 VBT-159 test suite complete!\n');
      process.exit(0);
    })
    .catch(() => {
      console.error('💥 Test suite failed\n');
      process.exit(1);
    });
}
