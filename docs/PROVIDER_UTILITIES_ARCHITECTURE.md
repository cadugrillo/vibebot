# Provider Utilities Architecture Design

**Date:** 2025-01-31
**Purpose:** Design provider-agnostic utility classes for AI provider abstraction layer
**Status:** Design Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Analysis of Existing Implementation](#analysis-of-existing-implementation)
3. [Architecture Design](#architecture-design)
4. [Utility Class Specifications](#utility-class-specifications)
5. [Integration Strategy](#integration-strategy)
6. [Migration Path](#migration-path)

---

## Executive Summary

### Problem Statement
The current Claude API integration (VBT-40) has excellent functionality including rate limiting, circuit breakers, error logging, and system prompt management. However, these utilities are tightly coupled to Claude-specific types and error classes, making them unusable with other providers (OpenAI, future providers).

### Solution
Extract and refactor these utilities into provider-agnostic classes that work with the unified `IAIProvider` interface, enabling all providers to benefit from the same resilience and management features.

### Benefits
- ✅ **Reusability:** Same utilities work with Claude, OpenAI, and future providers
- ✅ **Consistency:** All providers get the same error handling, rate limiting, etc.
- ✅ **Maintainability:** Fix bugs once, benefit all providers
- ✅ **Testability:** Test utilities independently of provider implementations
- ✅ **Backward Compatibility:** Old ClaudeService continues to work

---

## Analysis of Existing Implementation

### Current File Structure

```
src/services/ai/claude/
├── ClaudeService.ts           (529 lines) - Main service with embedded logic
├── types.ts                   (282 lines) - Claude-specific types
├── streaming.ts               (352 lines) - Stream handling
├── rate-limit.ts              (362 lines) - ⭐ Rate limiting (needs abstraction)
├── circuit-breaker.ts         (323 lines) - ⭐ Circuit breaker (mostly generic)
├── error-logger.ts            (312 lines) - ⭐ Error logging (needs abstraction)
├── system-prompts.ts          (545 lines) - ⭐ System prompts (mostly generic)
├── models.ts                  - Model definitions
├── config.ts                  - Configuration loading
└── index.ts                   - Exports
```

### Provider-Specific vs Generic Code Analysis

#### ⚠️ **Provider-Specific Code (Requires Abstraction)**

**1. Rate Limiting (`rate-limit.ts`)**
```typescript
// PROVIDER-SPECIFIC:
import Anthropic from '@anthropic-ai/sdk';
if (error instanceof Anthropic.RateLimitError) { ... }

// Header parsing:
const requestsPerMinute = headers['anthropic-ratelimit-requests-limit'];
const tokensPerMinute = headers['anthropic-ratelimit-tokens-limit'];

// Error throwing:
throw new ClaudeServiceError(ClaudeErrorType.RATE_LIMIT, ...);
```

**Abstraction Strategy:**
- Replace `Anthropic.RateLimitError` with `ProviderError` + type check
- Create pluggable `RateLimitHeaderParser` interface for provider-specific headers
- Use `ProviderError` instead of `ClaudeServiceError`

**2. Error Logging (`error-logger.ts`)**
```typescript
// PROVIDER-SPECIFIC:
import { ClaudeServiceError, ClaudeErrorType } from './types';

public logError(error: ClaudeServiceError | Error) {
  if (error instanceof ClaudeServiceError) { ... }
}

interface ErrorLogEntry {
  type: ClaudeErrorType;  // Provider-specific
}
```

**Abstraction Strategy:**
- Replace `ClaudeServiceError` with `ProviderError`
- Replace `ClaudeErrorType` with `ProviderErrorType`
- Add `provider: ProviderType` field to track which provider caused the error

**3. System Prompts (`system-prompts.ts`)**
```typescript
// PROVIDER-SPECIFIC (minimal):
throw new ClaudeServiceError(ClaudeErrorType.VALIDATION, ...);
```

**Abstraction Strategy:**
- Replace error throwing with `ProviderError`
- Rest is already generic!

#### ✅ **Generic Code (Minimal Changes)**

**1. Circuit Breaker (`circuit-breaker.ts`)**
- ✅ Already 95% provider-agnostic
- Only needs: Replace generic `Error` with `ProviderError` for consistency

**2. Exponential Backoff Algorithm**
- ✅ Completely generic, no changes needed

**3. Token Estimation**
- ✅ Generic algorithm (4 chars per token), no changes needed

**4. System Prompt Validation**
- ✅ Generic rules (length, patterns), no changes needed

---

## Architecture Design

### New Folder Structure

```
src/services/ai/providers/
├── utils/
│   ├── rate-limit/
│   │   ├── RateLimitManager.ts          (Main class, ~300 lines)
│   │   ├── RateLimitHeaderParser.ts     (Interface + implementations)
│   │   ├── RateLimitConfig.ts           (Configuration types)
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── RateLimitManager.test.ts
│   │
│   ├── circuit-breaker/
│   │   ├── CircuitBreaker.ts            (Single breaker, ~200 lines)
│   │   ├── CircuitBreakerManager.ts     (Manager for multiple, ~80 lines)
│   │   ├── CircuitBreakerConfig.ts      (Configuration types)
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── CircuitBreaker.test.ts
│   │
│   ├── error-logging/
│   │   ├── ErrorLogger.ts               (Main class, ~300 lines)
│   │   ├── ErrorLogEntry.ts             (Types, ~80 lines)
│   │   ├── ErrorStats.ts                (Statistics types, ~50 lines)
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── ErrorLogger.test.ts
│   │
│   ├── system-prompts/
│   │   ├── SystemPromptManager.ts       (Main class, ~250 lines)
│   │   ├── SystemPromptPreset.ts        (Preset definitions, ~300 lines)
│   │   ├── SystemPromptValidator.ts     (Validation logic, ~150 lines)
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── SystemPromptManager.test.ts
│   │
│   ├── ProviderUtilities.ts             (Convenience wrapper, ~150 lines)
│   └── index.ts                          (Export all utilities)
│
├── claude/
│   ├── ClaudeProvider.ts                 (Updated to use utilities)
│   ├── ClaudeStreamHandler.ts
│   ├── ClaudeErrorMapper.ts
│   └── models.ts
│
├── types.ts                              (Unified types)
├── errors.ts                             (ProviderError)
├── streaming.ts                          (BaseStreamHandler)
├── config.ts                             (ProviderConfigManager)
├── factory.ts                            (AIProviderFactory)
└── index.ts
```

### Design Principles

1. **Provider Agnostic:** All utilities work with `ProviderError` and `ProviderType`, not provider-specific types
2. **Pluggable:** Use interfaces for provider-specific behavior (e.g., header parsing)
3. **Composable:** Utilities can be used independently or together
4. **Opt-in:** Providers can choose which utilities to use
5. **Backward Compatible:** Old `ClaudeService` continues to work via wrapper pattern

---

## Utility Class Specifications

### 1. RateLimitManager

**Purpose:** Automatic retry with exponential backoff for rate limit errors

**Key Interfaces:**

```typescript
/**
 * Provider-specific header parser
 * Each provider implements this to parse their rate limit headers
 */
export interface RateLimitHeaderParser {
  parseHeaders(headers: Record<string, string>): Partial<RateLimitInfo>;
}

/**
 * Anthropic-specific parser
 */
export class AnthropicRateLimitHeaderParser implements RateLimitHeaderParser {
  parseHeaders(headers: Record<string, string>): Partial<RateLimitInfo> {
    return {
      requestsPerMinute: this.parseInt(headers['anthropic-ratelimit-requests-limit']),
      tokensPerMinute: this.parseInt(headers['anthropic-ratelimit-tokens-limit']),
      tokensPerDay: this.parseInt(headers['anthropic-ratelimit-tokens-daily-limit']),
      retryAfter: this.parseInt(headers['retry-after']),
    };
  }

  private parseInt(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
}

/**
 * OpenAI-specific parser
 */
export class OpenAIRateLimitHeaderParser implements RateLimitHeaderParser {
  parseHeaders(headers: Record<string, string>): Partial<RateLimitInfo> {
    return {
      limit: this.parseInt(headers['x-ratelimit-limit-requests']),
      remaining: this.parseInt(headers['x-ratelimit-remaining-requests']),
      reset: this.parseDate(headers['x-ratelimit-reset-requests']),
    };
  }

  private parseInt(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }

  private parseDate(value: string | undefined): Date | undefined {
    if (!value) return undefined;
    const timestamp = parseInt(value, 10);
    return isNaN(timestamp) ? undefined : new Date(timestamp * 1000);
  }
}
```

**Main Class:**

```typescript
export class RateLimitManager {
  private config: RetryConfig;
  private retryCount: number = 0;
  private headerParser?: RateLimitHeaderParser;

  constructor(
    config?: Partial<RetryConfig>,
    headerParser?: RateLimitHeaderParser
  ) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.headerParser = headerParser;
  }

  /**
   * Parse rate limit info from ProviderError
   * Works with ANY provider's error format
   */
  public parseRateLimitError(error: ProviderError): RateLimitInfo {
    // 1. Check if error already has rate limit info
    if (error.rateLimitInfo) {
      return error.rateLimitInfo;
    }

    // 2. Try to parse from headers using provider-specific parser
    if (this.headerParser && error.context?.headers) {
      const parsed = this.headerParser.parseHeaders(error.context.headers);
      return {
        isRateLimited: true,
        ...parsed,
      };
    }

    // 3. Fallback: use exponential backoff
    return {
      isRateLimited: true,
      retryAfter: this.calculateBackoffDelay(this.retryCount) / 1000,
    };
  }

  /**
   * Execute function with automatic retry on rate limit
   * Works with ANY provider that throws ProviderError
   */
  public async executeWithRetry<T>(
    fn: () => Promise<T>,
    context: string = 'API call'
  ): Promise<T> {
    this.retryCount = 0;

    while (true) {
      try {
        const result = await fn();

        if (this.retryCount > 0) {
          console.log(`✅ ${context} succeeded after ${this.retryCount} retries`);
        }

        return result;
      } catch (error) {
        // Check if it's a rate limit error from ANY provider
        if (error instanceof ProviderError &&
            error.type === ProviderErrorType.RATE_LIMIT) {

          const rateLimitInfo = this.parseRateLimitError(error);

          if (this.retryCount >= this.config.maxRetries) {
            throw new ProviderError(
              ProviderErrorType.RATE_LIMIT,
              `Rate limit exceeded. Max retries (${this.config.maxRetries}) reached.`,
              {
                statusCode: 429,
                retryable: false,
                rateLimitInfo,
                context: { ...error.context, retryAttempts: this.retryCount },
              }
            );
          }

          const delayMs = rateLimitInfo.retryAfter
            ? rateLimitInfo.retryAfter * 1000
            : this.calculateBackoffDelay(this.retryCount);

          console.log(`⚠️ Rate limit hit for ${context}`);
          console.log(`   Retry attempt: ${this.retryCount + 1}/${this.config.maxRetries}`);
          console.log(`   Waiting ${(delayMs / 1000).toFixed(1)}s...`);

          await this.wait(delayMs);
          this.retryCount++;
          continue;
        }

        // Not a rate limit error - rethrow
        throw error;
      }
    }
  }

  /**
   * Calculate exponential backoff delay with jitter
   * Formula: min(maxDelay, baseDelay * 2^attempt) + randomJitter
   */
  public calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);

    // Add jitter to prevent thundering herd
    const jitterRange = cappedDelay * this.config.jitterFactor;
    const jitter = Math.random() * jitterRange - jitterRange / 2;

    return Math.max(0, cappedDelay + jitter);
  }

  private async wait(delayMs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  public getRetryCount(): number {
    return this.retryCount;
  }

  public reset(): void {
    this.retryCount = 0;
  }
}
```

**Configuration:**

```typescript
export interface RetryConfig {
  maxRetries: number;      // Default: 3
  baseDelay: number;       // Default: 1000ms
  maxDelay: number;        // Default: 32000ms
  jitterFactor: number;    // Default: 0.1 (10%)
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 32000,
  jitterFactor: 0.1,
};
```

---

### 2. CircuitBreakerManager

**Purpose:** Prevent cascading failures by stopping requests to failing services

**Key Changes:** Minimal - already mostly generic!

```typescript
/**
 * Circuit Breaker (moved from claude/circuit-breaker.ts)
 * Only change: Throw ProviderError instead of generic Error
 */
export class CircuitBreaker {
  // ... same implementation as before

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        // CHANGED: Throw ProviderError instead of Error
        throw new ProviderError(
          ProviderErrorType.OVERLOADED,
          `Circuit breaker "${this.name}" is OPEN. Too many failures detected.`,
          {
            retryable: false,
            statusCode: 503,
            context: {
              circuitBreaker: this.name,
              nextAttemptTime: this.nextAttemptTime,
              consecutiveFailures: this.consecutiveFailures,
            },
          }
        );
      }
    }

    this.totalRequests++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  // ... rest of implementation unchanged
}
```

---

### 3. ErrorLogger

**Purpose:** Structured error logging with statistics and filtering

**Key Changes:**

```typescript
/**
 * Error log entry (provider-agnostic)
 */
export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  severity: ErrorSeverity;
  type: ProviderErrorType;          // CHANGED: was ClaudeErrorType
  message: string;
  statusCode?: number;
  retryable: boolean;
  context?: Record<string, any>;
  stack?: string;
  provider?: ProviderType;          // NEW: track which provider
  userId?: string;
  conversationId?: string;
  modelId?: string;
}

/**
 * Error statistics
 */
export interface ErrorStats {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byType: Record<ProviderErrorType, number>;     // CHANGED
  byProvider: Record<ProviderType, number>;      // NEW
  retryableCount: number;
  nonRetryableCount: number;
}

/**
 * Error Logger (provider-agnostic)
 */
export class ErrorLogger {
  private errors: ErrorLogEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Log an error (works with ANY provider)
   */
  public logError(
    error: ProviderError | Error,
    context?: Record<string, any>
  ): void {
    if (error instanceof ProviderError) {
      this.logProviderError(error, context);
    } else {
      this.logGenericError(error, context);
    }
  }

  private logProviderError(
    error: ProviderError,
    additionalContext?: Record<string, any>
  ): void {
    const entry: ErrorLogEntry = {
      id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      severity: error.severity,
      type: error.type,
      message: error.message,
      statusCode: error.statusCode,
      retryable: error.retryable,
      context: { ...error.context, ...additionalContext },
      stack: error.stack,
      provider: error.context?.provider as ProviderType,
    };

    this.addEntry(entry);
    this.printLog(entry, error);
  }

  // ... rest of implementation similar to old ErrorLogger
}
```

---

### 4. SystemPromptManager

**Purpose:** System prompt validation, presets, and management

**Key Changes:** Minimal - replace `ClaudeServiceError` with `ProviderError`

```typescript
/**
 * System Prompt Manager (provider-agnostic)
 */
export class SystemPromptManager {
  private config: SystemPromptConfig;
  private customPresets: Map<string, SystemPromptPreset> = new Map();

  constructor(config?: Partial<SystemPromptConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate system prompt
   */
  public validate(
    prompt: string | null | undefined
  ): SystemPromptValidation {
    // ... validation logic (unchanged from old implementation)
  }

  /**
   * Select system prompt for a conversation
   */
  public selectSystemPrompt(
    conversationPrompt?: string | null,
    presetId?: string,
    fallbackToDefault: boolean = true
  ): string | null {
    // Use custom conversation prompt if provided
    if (conversationPrompt) {
      const validation = this.validate(conversationPrompt);
      if (!validation.isValid) {
        // CHANGED: Throw ProviderError instead of ClaudeServiceError
        throw new ProviderError(
          ProviderErrorType.VALIDATION,
          `Invalid system prompt: ${validation.errors.join(', ')}`,
          {
            retryable: false,
            statusCode: 400,
            context: { validationErrors: validation.errors },
          }
        );
      }
      return this.sanitize(conversationPrompt);
    }

    // ... rest of logic unchanged
  }

  // ... other methods unchanged
}
```

---

## Integration Strategy

### Option 1: Constructor Injection (Recommended)

Providers receive utilities via constructor:

```typescript
export interface ClaudeProviderOptions {
  config: ProviderConfig;
  utilities?: {
    rateLimitManager?: RateLimitManager;
    circuitBreaker?: CircuitBreakerManager;
    errorLogger?: ErrorLogger;
    systemPromptManager?: SystemPromptManager;
  };
}

export class ClaudeProvider implements IAIProvider {
  private rateLimitManager: RateLimitManager;
  private circuitBreaker: CircuitBreakerManager;
  private errorLogger: ErrorLogger;
  private systemPromptManager: SystemPromptManager;

  constructor(options: ClaudeProviderOptions | ProviderConfig) {
    if ('provider' in options && 'apiKey' in options) {
      // Backward compatible: just ProviderConfig
      this.config = options;
      // Create default utilities
      this.rateLimitManager = new RateLimitManager(
        undefined,
        new AnthropicRateLimitHeaderParser()
      );
      this.circuitBreaker = new CircuitBreakerManager();
      this.errorLogger = new ErrorLogger();
      this.systemPromptManager = new SystemPromptManager();
    } else {
      // New: ClaudeProviderOptions with utilities
      const opts = options as ClaudeProviderOptions;
      this.config = opts.config;
      this.rateLimitManager = opts.utilities?.rateLimitManager ||
        new RateLimitManager(undefined, new AnthropicRateLimitHeaderParser());
      this.circuitBreaker = opts.utilities?.circuitBreaker ||
        new CircuitBreakerManager();
      this.errorLogger = opts.utilities?.errorLogger ||
        new ErrorLogger();
      this.systemPromptManager = opts.utilities?.systemPromptManager ||
        new SystemPromptManager();
    }

    this.client = new Anthropic({ ... });
  }
}
```

**Usage:**

```typescript
// Simple usage (default utilities)
const provider = new ClaudeProvider(config);

// Advanced usage (custom utilities)
const provider = new ClaudeProvider({
  config,
  utilities: {
    rateLimitManager: new RateLimitManager({ maxRetries: 5 }),
    circuitBreaker: new CircuitBreakerManager(),
    errorLogger: sharedErrorLogger,  // Share across providers
    systemPromptManager: new SystemPromptManager(),
  },
});
```

### Option 2: ProviderUtilities Helper Class

Convenience wrapper for all utilities:

```typescript
export class ProviderUtilities {
  public readonly rateLimitManager: RateLimitManager;
  public readonly circuitBreaker: CircuitBreakerManager;
  public readonly errorLogger: ErrorLogger;
  public readonly systemPromptManager: SystemPromptManager;

  constructor(options?: {
    rateLimitConfig?: Partial<RetryConfig>;
    rateLimitHeaderParser?: RateLimitHeaderParser;
    errorLoggerMaxEntries?: number;
    systemPromptConfig?: Partial<SystemPromptConfig>;
  }) {
    this.rateLimitManager = new RateLimitManager(
      options?.rateLimitConfig,
      options?.rateLimitHeaderParser
    );
    this.circuitBreaker = new CircuitBreakerManager();
    this.errorLogger = new ErrorLogger(options?.errorLoggerMaxEntries);
    this.systemPromptManager = new SystemPromptManager(
      options?.systemPromptConfig
    );
  }

  /**
   * Execute an API call with all protections
   */
  public async executeProtected<T>(
    operation: string,
    fn: () => Promise<T>,
    options?: {
      circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
      context?: Record<string, any>;
    }
  ): Promise<T> {
    try {
      return await this.circuitBreaker.execute(
        `provider-${operation}`,
        async () => {
          return await this.rateLimitManager.executeWithRetry(fn, operation);
        },
        options?.circuitBreakerConfig
      );
    } catch (error) {
      this.errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        { operation, ...options?.context }
      );
      throw error;
    }
  }
}
```

**Usage:**

```typescript
export class ClaudeProvider implements IAIProvider {
  private utilities: ProviderUtilities;

  constructor(config: ProviderConfig) {
    this.utilities = new ProviderUtilities({
      rateLimitHeaderParser: new AnthropicRateLimitHeaderParser(),
    });
  }

  public async streamMessage(...): Promise<AIResponse> {
    return await this.utilities.executeProtected(
      'streamMessage',
      async () => {
        const stream = await this.client.messages.create(...);
        return await handler.processStream(stream);
      },
      {
        circuitBreakerConfig: { failureThreshold: 5 },
        context: { userId, conversationId },
      }
    );
  }
}
```

---

## Migration Path

### Phase 1: Create Provider-Agnostic Utilities (Current)

1. ✅ Create `utils/rate-limit/` with RateLimitManager
2. ✅ Create `utils/circuit-breaker/` with CircuitBreakerManager
3. ✅ Create `utils/error-logging/` with ErrorLogger
4. ✅ Create `utils/system-prompts/` with SystemPromptManager
5. ✅ Create `utils/ProviderUtilities.ts` helper

### Phase 2: Update ClaudeProvider

1. ✅ Update ClaudeProvider constructor to accept utilities
2. ✅ Wrap API calls with utilities
3. ✅ Add utility access methods
4. ✅ Update tests

### Phase 3: Backward Compatibility

1. ✅ Update old ClaudeService to use ClaudeProvider internally
2. ✅ Add type conversion (ClaudeMessage ↔ AIMessage)
3. ✅ Maintain old API surface
4. ✅ Add deprecation warnings

### Phase 4: Documentation

1. ✅ Architecture documentation
2. ✅ Migration guide
3. ✅ API reference
4. ✅ Deprecation timeline

### Phase 5: Future Providers

When implementing OpenAI provider:

```typescript
export class OpenAIProvider implements IAIProvider {
  private utilities: ProviderUtilities;

  constructor(config: ProviderConfig) {
    // Use same utilities with OpenAI-specific parser!
    this.utilities = new ProviderUtilities({
      rateLimitHeaderParser: new OpenAIRateLimitHeaderParser(),
    });
  }

  // Same pattern as ClaudeProvider
}
```

---

## Design Decisions & Rationale

### 1. Why Pluggable Header Parsers?

**Problem:** Different providers use different header names for rate limits.

**Solution:** `RateLimitHeaderParser` interface allows each provider to implement their own parsing logic.

**Alternative Considered:** Hard-code all provider headers in one parser.
**Why Rejected:** Difficult to maintain, not extensible for future providers.

### 2. Why Constructor Injection?

**Problem:** How do providers get access to utilities?

**Solution:** Pass utilities via constructor, with sensible defaults.

**Alternative Considered:** Singleton utilities accessed globally.
**Why Rejected:** Makes testing difficult, prevents customization per provider.

### 3. Why Keep Circuit Breaker Separate?

**Problem:** Should circuit breaker be part of RateLimitManager?

**Solution:** Keep separate for single responsibility principle.

**Alternative Considered:** Combine into one "ResilienceManager".
**Why Rejected:** Less flexible, harder to test, violates SRP.

### 4. Why Provider-Agnostic Error Logging?

**Problem:** Should each provider have its own error logger?

**Solution:** One logger that works with all providers, tracks provider type.

**Alternative Considered:** Separate logger per provider.
**Why Rejected:** Harder to get unified error statistics across all providers.

---

## Success Criteria

### Functional Requirements

- ✅ All utilities work with Claude provider
- ✅ All utilities work with mock OpenAI provider
- ✅ Old ClaudeService continues to work
- ✅ Rate limiting prevents API overload
- ✅ Circuit breaker prevents cascading failures
- ✅ Error logger tracks all errors with statistics
- ✅ System prompt validation works correctly

### Non-Functional Requirements

- ✅ 95%+ test coverage for utilities
- ✅ Zero breaking changes to existing API
- ✅ Documentation complete
- ✅ Performance: < 1ms overhead per utility call
- ✅ Memory: Error logger limited to 1000 entries

---

## Next Steps

1. **Task 2:** Implement RateLimitManager (3-4 hours)
2. **Task 3:** Implement CircuitBreakerManager (1-2 hours)
3. **Task 4:** Implement ErrorLogger (2-3 hours)
4. **Task 5:** Implement SystemPromptManager (2 hours)
5. **Task 6:** Update ClaudeProvider (3-4 hours)
6. **Task 7:** Create integration layer (2 hours)
7. **Task 8:** Update ClaudeService wrapper (2-3 hours)
8. **Task 9:** Write tests (6-8 hours)
9. **Task 10:** Update WebSocket handlers (3-4 hours)
10. **Task 11:** Write documentation (4-5 hours)
11. **Task 12:** Deprecate old files (1-2 hours)

**Total Estimated Time:** 33-42 hours

---

## Conclusion

This architecture provides a solid foundation for provider-agnostic utilities that will benefit all current and future AI providers in the system. The design prioritizes reusability, testability, and maintainability while ensuring backward compatibility with existing code.

The pluggable design (header parsers, utility injection) makes it easy to support new providers with minimal code changes. The separation of concerns (rate limiting, circuit breaking, error logging, system prompts) ensures each utility can be tested, updated, and used independently.

---

**End of Design Document**
