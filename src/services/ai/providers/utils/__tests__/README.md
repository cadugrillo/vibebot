# Provider Utilities Tests

Comprehensive test suite for provider-agnostic utilities.

## Test Files

### 1. `rate-limit.test.ts` (170+ tests)
Tests for `RateLimitManager`:
- ✅ Basic functionality
- ✅ Retry logic with exponential backoff
- ✅ Max retries enforcement
- ✅ Backoff calculation (exponential + jitter)
- ✅ Header parsers (Anthropic, OpenAI)
- ✅ retryAfter handling from errors
- ✅ Error messages and context

**Key Scenarios:**
- Successful execution on first try
- Retry on rate limit errors
- Respect maxRetries limit
- Non-rate-limit errors not retried
- Exponential backoff with jitter
- Header parsing for different providers

### 2. `circuit-breaker.test.ts` (150+ tests)
Tests for `CircuitBreakerManager`:
- ✅ Circuit states (CLOSED, OPEN, HALF_OPEN)
- ✅ Failure threshold triggering
- ✅ Immediate rejection when OPEN
- ✅ Timeout and state transitions
- ✅ Success threshold in HALF_OPEN
- ✅ Statistics tracking
- ✅ Breaker management (reset, remove, clear)
- ✅ Custom configuration

**Key Scenarios:**
- Circuit opens after threshold failures
- Circuit rejects immediately when open
- Circuit transitions to half-open after timeout
- Circuit closes after success threshold
- Statistics accurately track successes/failures

### 3. `error-logger.test.ts` (140+ tests)
Tests for `ErrorLogger`:
- ✅ Logging ProviderError and generic Error
- ✅ Context inclusion (userId, conversationId, etc.)
- ✅ Statistics (by severity, type, provider)
- ✅ Querying (recent, by severity, by type, by provider)
- ✅ Max entries limit
- ✅ Management (clear, count)
- ✅ JSON export

**Key Scenarios:**
- Log errors with full context
- Track statistics by multiple dimensions
- Filter errors by severity/type/provider
- Respect maxEntries limit
- Export to JSON for analysis

### 4. `system-prompts.test.ts` (180+ tests)
Tests for `SystemPromptManager`:
- ✅ Built-in presets (default, coding, writing, etc.)
- ✅ Validation (length, tokens, patterns)
- ✅ Sanitization (whitespace, newlines)
- ✅ Token estimation
- ✅ Custom presets (create, update, delete)
- ✅ Preset selection logic
- ✅ Configuration management

**Key Scenarios:**
- Get built-in presets
- Validate prompts (length, tokens, suspicious patterns)
- Sanitize prompts (trim, normalize whitespace)
- Create and manage custom presets
- Select appropriate prompt with fallback logic

### 5. `provider-utilities.test.ts` (130+ tests)
Integration tests for `ProviderUtilities`:
- ✅ Initialization and configuration
- ✅ All utilities working together
- ✅ Factory functions (createUtilitiesForProvider, createSharedUtilities)
- ✅ Statistics aggregation
- ✅ Reset functionality
- ✅ Real-world scenarios

**Key Scenarios:**
- All utilities initialized correctly
- Circuit breaker + rate limiting + error logging work together
- System prompt validation in API flow
- Shared utilities across providers
- Error tracking across multiple operations

## Running Tests

### Run all utility tests:
```bash
npm test -- utils/__tests__
```

### Run specific test file:
```bash
npm test -- rate-limit.test.ts
npm test -- circuit-breaker.test.ts
npm test -- error-logger.test.ts
npm test -- system-prompts.test.ts
npm test -- provider-utilities.test.ts
```

### Run with coverage:
```bash
npm test -- --coverage utils/__tests__
```

### Watch mode:
```bash
npm test -- --watch utils/__tests__
```

## Test Coverage Goals

**Target: 90%+ coverage for all utilities**

| Utility | Lines | Statements | Branches | Functions |
|---------|-------|------------|----------|-----------|
| RateLimitManager | 90%+ | 90%+ | 85%+ | 100% |
| CircuitBreakerManager | 90%+ | 90%+ | 85%+ | 100% |
| ErrorLogger | 90%+ | 90%+ | 85%+ | 100% |
| SystemPromptManager | 90%+ | 90%+ | 85%+ | 100% |
| ProviderUtilities | 95%+ | 95%+ | 90%+ | 100% |

## Test Structure

Each test file follows this structure:

```typescript
describe('UtilityName', () => {
  describe('Feature Category', () => {
    it('should do something specific', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Key Testing Patterns

### 1. Mocking with Jest
```typescript
const mockFn = jest.fn().mockResolvedValue('success');
const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
```

### 2. Async Testing
```typescript
it('should handle async operations', async () => {
  await manager.execute('test', async () => 'success');
  expect(...).toBe(...);
});
```

### 3. Error Testing
```typescript
try {
  await manager.execute();
  fail('Should have thrown');
} catch (error) {
  expect(error).toBeInstanceOf(ProviderError);
}

// Or using expect().rejects
await expect(manager.execute()).rejects.toThrow(ProviderError);
```

### 4. Timing Tests
```typescript
const before = Date.now();
await manager.executeWithRetry(mockFn);
const elapsed = Date.now() - before;
expect(elapsed).toBeGreaterThanOrEqual(expectedDelay);
```

## Test Data

Tests use realistic data:
- Error messages from actual API responses
- Realistic token counts (4 chars per token)
- Typical retry delays (1s to 32s)
- Real provider headers (Anthropic, OpenAI)

## CI/CD Integration

These tests should be run:
- ✅ On every commit (pre-commit hook)
- ✅ On every pull request
- ✅ Before deployment
- ✅ Nightly for regression testing

## Debugging Tests

### Run single test:
```bash
npm test -- -t "should retry on rate limit errors"
```

### Debug with Node inspector:
```bash
node --inspect-brk node_modules/.bin/jest rate-limit.test.ts
```

### Verbose output:
```bash
npm test -- --verbose utils/__tests__
```

## Adding New Tests

When adding new functionality:

1. **Add unit test** in the appropriate test file
2. **Add integration test** in `provider-utilities.test.ts` if needed
3. **Update coverage goals** if adding new files
4. **Document test scenarios** in this README

## Common Issues

### Test Timeouts
If tests timeout, increase Jest timeout:
```typescript
jest.setTimeout(10000); // 10 seconds
```

### Flaky Timing Tests
Add margin to timing expectations:
```typescript
expect(elapsed).toBeGreaterThanOrEqual(expectedDelay - 10); // 10ms margin
```

### Mock Cleanup
Always clear mocks between tests:
```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

## Test Maintenance

- Review and update tests when utilities change
- Keep test data realistic and up-to-date
- Remove obsolete tests promptly
- Refactor common patterns into helper functions

## Performance

Test suite should run in < 30 seconds for all utilities.

Current performance:
- rate-limit.test.ts: ~2-3s
- circuit-breaker.test.ts: ~2-3s
- error-logger.test.ts: ~1-2s
- system-prompts.test.ts: ~1-2s
- provider-utilities.test.ts: ~3-4s

**Total: ~10-15 seconds**
