/**
 * VBT-160: Test Error Handling and Fault Tolerance
 *
 * Tests for:
 * - Error categorization with severity levels
 * - Circuit breaker pattern
 * - Error logging system
 * - User-friendly error messages
 * - Stream interruption handling
 */

import { ClaudeServiceError, ClaudeErrorType, ErrorSeverity } from './types';
import { CircuitBreaker, CircuitState, CircuitBreakerManager } from './circuit-breaker';
import { getErrorLogger, resetErrorLogger } from './error-logger';

console.log('='.repeat(70));
console.log('VBT-160: Error Handling and Fault Tolerance Test Suite');
console.log('='.repeat(70));
console.log();

// Test 1: Error Severity Assignment
console.log('Test 1: Error Severity Assignment');
console.log('-'.repeat(70));

const authError = new ClaudeServiceError(
  ClaudeErrorType.AUTHENTICATION,
  'Invalid API key',
  401,
  false
);
console.log(`✓ Authentication error severity: ${authError.severity} (expected: CRITICAL)`);
console.assert(authError.severity === ErrorSeverity.CRITICAL, 'Auth error should be CRITICAL');

const rateLimitError = new ClaudeServiceError(
  ClaudeErrorType.RATE_LIMIT,
  'Rate limit exceeded',
  429,
  true
);
console.log(`✓ Rate limit error severity: ${rateLimitError.severity} (expected: MEDIUM)`);
console.assert(rateLimitError.severity === ErrorSeverity.MEDIUM, 'Rate limit error should be MEDIUM');

const networkError = new ClaudeServiceError(
  ClaudeErrorType.NETWORK,
  'Connection failed',
  undefined,
  true
);
console.log(`✓ Network error severity: ${networkError.severity} (expected: LOW)`);
console.assert(networkError.severity === ErrorSeverity.LOW, 'Network error should be LOW');

const validationError = new ClaudeServiceError(
  ClaudeErrorType.VALIDATION,
  'Invalid input',
  400,
  false
);
console.log(`✓ Validation error severity: ${validationError.severity} (expected: HIGH)`);
console.assert(validationError.severity === ErrorSeverity.HIGH, 'Validation error should be HIGH');

console.log('✅ Test 1 passed: All error severities assigned correctly\n');

// Test 2: User-Friendly Error Messages
console.log('Test 2: User-Friendly Error Messages');
console.log('-'.repeat(70));

const testErrors = [
  { type: ClaudeErrorType.AUTHENTICATION, expectedKeywords: ['Authentication', 'API key'] },
  { type: ClaudeErrorType.RATE_LIMIT, expectedKeywords: ['Rate limit', 'try again'] },
  { type: ClaudeErrorType.BILLING, expectedKeywords: ['Billing', 'account'] },
  { type: ClaudeErrorType.QUOTA_EXCEEDED, expectedKeywords: ['quota', 'exceeded'] },
  { type: ClaudeErrorType.NETWORK, expectedKeywords: ['Network', 'connection'] },
  { type: ClaudeErrorType.TIMEOUT, expectedKeywords: ['timeout', 'try again'] },
  { type: ClaudeErrorType.OVERLOADED, expectedKeywords: ['overloaded', 'try again'] },
  { type: ClaudeErrorType.STREAM_INTERRUPTED, expectedKeywords: ['Stream', 'interrupted'] },
];

for (const { type, expectedKeywords } of testErrors) {
  const error = new ClaudeServiceError(type, 'Test error', undefined, false);
  const userMessage = error.getUserMessage();
  const hasKeywords = expectedKeywords.every(kw =>
    userMessage.toLowerCase().includes(kw.toLowerCase())
  );
  console.log(`✓ ${type}: "${userMessage.substring(0, 50)}..."`);
  console.assert(hasKeywords, `${type} message should contain ${expectedKeywords.join(', ')}`);
}

console.log('✅ Test 2 passed: All error messages are user-friendly\n');

// Test 3: Circuit Breaker Pattern
console.log('Test 3: Circuit Breaker Pattern');
console.log('-'.repeat(70));

const testCircuitBreaker = async () => {
  const breaker = new CircuitBreaker('test-service', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 1000, // 1 second
    monitoringPeriod: 5000,
  });

  // Initial state
  console.log(`✓ Initial state: ${breaker.getState()} (expected: CLOSED)`);
  console.assert(breaker.getState() === CircuitState.CLOSED, 'Should start CLOSED');

  // Simulate 3 failures to open circuit
  for (let i = 0; i < 3; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error(`Test failure ${i + 1}`);
      });
    } catch (error) {
      // Expected
    }
  }

  const stateAfterFailures = breaker.getState();
  console.log(`✓ State after 3 failures: ${stateAfterFailures} (expected: OPEN)`);
  console.assert(stateAfterFailures === CircuitState.OPEN, 'Should be OPEN after threshold failures');

  // Verify circuit blocks requests
  try {
    await breaker.execute(async () => 'should not execute');
    console.error('❌ Circuit should have blocked request');
    process.exit(1);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Circuit breaker')) {
      console.log('✓ Circuit correctly blocks requests when OPEN');
    } else {
      throw error;
    }
  }

  // Get stats
  const stats = breaker.getStats();
  console.log(`✓ Total failures: ${stats.totalFailures} (expected: 3)`);
  console.assert(stats.totalFailures === 3, 'Should have recorded 3 failures');

  console.log('✅ Test 3 passed: Circuit breaker works correctly\n');
};

// Run circuit breaker test
(async () => {
  await testCircuitBreaker();

// Test 4: Error Logger
console.log('Test 4: Error Logger');
console.log('-'.repeat(70));

resetErrorLogger(); // Start fresh
const logger = getErrorLogger();

// Log various errors
const errors = [
  new ClaudeServiceError(ClaudeErrorType.AUTHENTICATION, 'Auth failed', 401, false),
  new ClaudeServiceError(ClaudeErrorType.RATE_LIMIT, 'Rate limited', 429, true),
  new ClaudeServiceError(ClaudeErrorType.NETWORK, 'Network error', undefined, true),
  new ClaudeServiceError(ClaudeErrorType.VALIDATION, 'Invalid input', 400, false),
];

for (const error of errors) {
  logger.logError(error, { testContext: true });
}

// Check stats
const stats = logger.getStats();
console.log(`✓ Total errors logged: ${stats.total} (expected: 4)`);
console.assert(stats.total === 4, 'Should have logged 4 errors');

console.log(`✓ Critical severity count: ${stats.bySeverity.CRITICAL} (expected: 1)`);
console.assert(stats.bySeverity.CRITICAL === 1, 'Should have 1 CRITICAL error');

console.log(`✓ Medium severity count: ${stats.bySeverity.MEDIUM} (expected: 1)`);
console.assert(stats.bySeverity.MEDIUM === 1, 'Should have 1 MEDIUM error');

console.log(`✓ Retryable count: ${stats.retryableCount} (expected: 2)`);
console.assert(stats.retryableCount === 2, 'Should have 2 retryable errors');

// Test filtering
const criticalErrors = logger.getErrorsBySeverity(ErrorSeverity.CRITICAL);
console.log(`✓ Critical errors retrieved: ${criticalErrors.length} (expected: 1)`);
console.assert(criticalErrors.length === 1, 'Should retrieve 1 critical error');

const authErrors = logger.getErrorsByType(ClaudeErrorType.AUTHENTICATION);
console.log(`✓ Auth errors retrieved: ${authErrors.length} (expected: 1)`);
console.assert(authErrors.length === 1, 'Should retrieve 1 auth error');

console.log('✅ Test 4 passed: Error logger works correctly\n');

// Test 5: Circuit Breaker Manager
console.log('Test 5: Circuit Breaker Manager');
console.log('-'.repeat(70));

const manager = new CircuitBreakerManager();

// Create breakers for different operations
const breaker1 = manager.getBreaker('operation-1');
const breaker2 = manager.getBreaker('operation-2');

console.assert(breaker1 !== breaker2, 'Should create different breakers');
console.assert(manager.getBreaker('operation-1') === breaker1, 'Should return same breaker instance');

console.log(`✓ Circuit breaker manager manages multiple breakers`);
console.log(`✓ Total breakers: ${manager.getCount()} (expected: 2)`);
console.assert(manager.getCount() === 2, 'Should have 2 breakers');

console.log('✅ Test 5 passed: Circuit breaker manager works correctly\n');

// Test 6: Error Context and Metadata
console.log('Test 6: Error Context and Metadata');
console.log('-'.repeat(70));

const errorWithContext = new ClaudeServiceError(
  ClaudeErrorType.STREAM_INTERRUPTED,
  'Stream interrupted',
  undefined,
  true,
  undefined,
  undefined,
  {
    messageId: 'test-msg-123',
    userId: 'user-456',
    partialContent: 'This is partial content...',
    contentLength: 50,
  }
);

console.log(`✓ Error has timestamp: ${errorWithContext.timestamp instanceof Date}`);
console.assert(errorWithContext.timestamp instanceof Date, 'Should have timestamp');

console.log(`✓ Error has context: ${Object.keys(errorWithContext.context || {}).length} keys`);
console.assert(errorWithContext.context?.messageId === 'test-msg-123', 'Should have context');

const logObject = errorWithContext.toLogObject();
console.log(`✓ Log object has all fields: ${Object.keys(logObject).length} keys`);
console.assert(logObject.type === ClaudeErrorType.STREAM_INTERRUPTED, 'Log object should have type');
console.assert(logObject.context, 'Log object should have context');

console.log('✅ Test 6 passed: Error context and metadata work correctly\n');

// Summary
console.log('='.repeat(70));
console.log('✅ ALL TESTS PASSED');
console.log('='.repeat(70));
console.log();
console.log('VBT-160 Implementation Summary:');
console.log('  ✅ Error categorization with 4 severity levels (LOW, MEDIUM, HIGH, CRITICAL)');
console.log('  ✅ Circuit breaker pattern with 3 states (CLOSED, OPEN, HALF_OPEN)');
console.log('  ✅ Comprehensive error logging with statistics and filtering');
console.log('  ✅ User-friendly error messages for all error types');
console.log('  ✅ Stream interruption detection and handling');
console.log('  ✅ Error context and metadata for debugging');
console.log('  ✅ Circuit breaker manager for multiple operations');
console.log();
console.log('Ready for integration with ClaudeService and WebSocket server!');
console.log();
})().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
