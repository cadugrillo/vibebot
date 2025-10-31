# Migration from ClaudeService to ClaudeProvider

## Status: ClaudeService is DEPRECATED

**As of VBT-42** (AI Provider Abstraction Layer), `ClaudeService` is deprecated in favor of the new provider architecture.

**New Code**: Use `ClaudeProvider` from `src/services/ai/providers/`
**Old Code**: `ClaudeService` in `src/services/ai/claude/` (deprecated)

---

## Why Migrate?

The new `ClaudeProvider` offers:

✅ **Provider-agnostic architecture** - Easy to add OpenAI, etc.
✅ **Better utilities** - RateLimitManager, CircuitBreaker, ErrorLogger, SystemPromptManager
✅ **Unified interface** - IAIProvider works across all providers
✅ **Improved error handling** - ProviderError with standardized types
✅ **Better streaming** - Unified streaming interface
✅ **Cost tracking** - Built-in per-model pricing
✅ **Modern architecture** - Factory pattern, dependency injection

---

## Quick Migration Guide

### Before (ClaudeService - DEPRECATED)

```typescript
import { ClaudeService } from './services/ai/claude';

const claude = new ClaudeService();

const response = await claude.streamResponse({
  messages: [{ role: 'user', content: 'Hello' }],
  callbacks: {
    onToken: (token) => console.log(token),
    onComplete: () => console.log('Done'),
  }
});
```

### After (ClaudeProvider - RECOMMENDED)

```typescript
import { ClaudeProvider } from './services/ai/providers';
import { ProviderConfigManager } from './services/ai/providers/config';

// Get configuration
const configManager = ProviderConfigManager.getInstance();
const config = configManager.getClaudeConfig();

// Create provider
const provider = new ClaudeProvider(config);

// Stream message
const response = await provider.streamMessage(
  {
    conversationId: 'conv-123',
    userId: 'user-123',
    messages: [{ role: 'user', content: 'Hello' }],
  },
  {
    onToken: (token) => console.log(token),
    onComplete: () => console.log('Done'),
    onError: (error) => console.error(error),
  }
);
```

---

## Detailed Migration

### 1. Configuration

**Before (ClaudeService):**
```typescript
import { getClaudeConfig, ClaudeConfig } from './services/ai/claude/config';

const config = getClaudeConfig(); // Loads from env
```

**After (ClaudeProvider):**
```typescript
import { ProviderConfigManager } from './services/ai/providers/config';

const configManager = ProviderConfigManager.getInstance();
const config = configManager.getClaudeConfig(); // Loads from env + validates
```

---

### 2. Initialization

**Before:**
```typescript
const claude = new ClaudeService();
const isReady = claude.isInitialized();
```

**After:**
```typescript
const provider = new ClaudeProvider(config);
await provider.initialize(); // Async initialization
const metadata = provider.getMetadata(); // Get provider info
```

---

### 3. Testing Connection

**Before:**
```typescript
const isConnected = await claude.testConnection();
```

**After:**
```typescript
const isConnected = await provider.testConnection();
// Same API!
```

---

### 4. Sending Non-Streaming Messages

**Before:**
```typescript
// ClaudeService doesn't have a sendMessage - only streaming
```

**After:**
```typescript
const response = await provider.sendMessage({
  conversationId: 'conv-123',
  userId: 'user-123',
  messages: [{ role: 'user', content: 'Hello' }],
  model: 'claude-sonnet-4.5-20250514', // Optional
  systemPrompt: 'You are a helpful assistant', // Optional
  maxTokens: 1024, // Optional
});

console.log(response.content); // Response text
console.log(response.tokenUsage); // Input/output tokens
console.log(response.cost); // Cost in USD
```

---

### 5. Streaming Messages

**Before:**
```typescript
const response = await claude.streamResponse({
  messages: [{ role: 'user', content: 'Hello' }],
  model: 'claude-sonnet-4-20240620', // Old model ID
  systemPrompt: 'You are helpful',
  callbacks: {
    onToken: (token: string) => {
      process.stdout.write(token);
    },
    onComplete: (fullText: string) => {
      console.log('\n\nComplete:', fullText);
    },
    onError: (error: ClaudeServiceError) => {
      console.error('Error:', error.message);
    },
  },
});
```

**After:**
```typescript
const response = await provider.streamMessage(
  {
    conversationId: 'conv-123',
    userId: 'user-123',
    messages: [{ role: 'user', content: 'Hello' }],
    model: 'claude-sonnet-4.5-20250514', // New model ID
    systemPrompt: 'You are helpful',
    messageId: 'msg-123', // Optional
  },
  {
    onToken: (token: string, metadata?: any) => {
      process.stdout.write(token);
    },
    onComplete: (fullText: string) => {
      console.log('\n\nComplete:', fullText);
    },
    onError: (error: Error) => {
      console.error('Error:', error.message);
    },
  }
);

console.log(response.content); // Full response
console.log(response.tokenUsage); // Token stats
console.log(response.cost); // Cost breakdown
```

---

### 6. Model Management

**Before:**
```typescript
const defaultModel = claude.getDefaultModel();
claude.setDefaultModel('claude-3-opus-20240229');

const modelInfo = claude.getModelInfo('claude-3-sonnet-20240229');
const isValid = claude.isModelValid('claude-3-opus-20240229');
const models = claude.getAvailableModels();
const recommended = claude.getRecommendedModel();
```

**After:**
```typescript
import {
  CLAUDE_MODELS,
  getClaudeModelConfig,
  isValidClaudeModel,
  getAllClaudeModels,
  getRecommendedClaudeModel,
} from './services/ai/providers/claude/models';

// Default model from config
const defaultModel = config.defaultModel;

// Get model info
const modelInfo = getClaudeModelConfig('claude-sonnet-4.5-20250514');
const isValid = isValidClaudeModel('claude-sonnet-4.5-20250514');
const models = getAllClaudeModels();
const recommended = getRecommendedClaudeModel();

// Model info structure
console.log(modelInfo.id); // 'claude-sonnet-4.5-20250514'
console.log(modelInfo.name); // 'Claude Sonnet 4.5'
console.log(modelInfo.contextWindow); // 200000
console.log(modelInfo.maxOutput); // 8192
console.log(modelInfo.pricing.input); // Per million tokens
console.log(modelInfo.pricing.output); // Per million tokens
```

---

### 7. Error Handling

**Before:**
```typescript
import { ClaudeServiceError, ClaudeErrorType } from './services/ai/claude/types';

try {
  await claude.streamResponse(...);
} catch (error) {
  if (error instanceof ClaudeServiceError) {
    switch (error.type) {
      case ClaudeErrorType.AUTHENTICATION:
        // Handle auth error
        break;
      case ClaudeErrorType.RATE_LIMIT:
        console.log(`Retry after: ${error.retryAfter}ms`);
        break;
      // ...
    }
  }
}
```

**After:**
```typescript
import { ProviderError, ProviderErrorType } from './services/ai/providers/errors';

try {
  await provider.streamMessage(...);
} catch (error) {
  if (error instanceof ProviderError) {
    console.log(`Error type: ${error.type}`);
    console.log(`Retryable: ${error.retryable}`);
    console.log(`Status code: ${error.statusCode}`);
    console.log(`Message: ${error.message}`);

    switch (error.type) {
      case ProviderErrorType.AUTHENTICATION:
        // Handle auth error
        break;
      case ProviderErrorType.RATE_LIMIT:
        console.log(`Retry after: ${error.retryAfter}s`);
        break;
      // ...
    }
  }
}
```

---

### 8. Advanced: Using Provider Utilities

**ClaudeProvider** now includes built-in utilities that were separate in ClaudeService:

```typescript
// Create provider with default utilities
const provider = new ClaudeProvider(config);

// Or create with custom utilities
import {
  ProviderUtilities,
  createUtilitiesForProvider,
} from './services/ai/providers/utils';
import { ProviderType } from './services/ai/providers/types';

const utilities = createUtilitiesForProvider(ProviderType.CLAUDE);

const provider = new ClaudeProvider({
  config,
  utilities: utilities.getAll(),
});

// Access utilities
const errorLogger = provider.getErrorLogger();
const circuitBreaker = provider.getCircuitBreaker();
const rateLimitManager = provider.getRateLimitManager();
const systemPromptManager = provider.getSystemPromptManager();

// View statistics
errorLogger.printStats();
circuitBreaker.printSummary();
systemPromptManager.printAvailablePresets();
```

---

### 9. System Prompts (New Feature!)

ClaudeProvider has built-in system prompt management:

```typescript
// Use a preset
const response = await provider.sendMessage({
  conversationId: 'conv-123',
  userId: 'user-123',
  messages: [{ role: 'user', content: 'Hello' }],
  systemPrompt: 'coding', // Uses built-in coding preset
});

// Custom system prompt (validated and sanitized)
const response = await provider.sendMessage({
  conversationId: 'conv-123',
  userId: 'user-123',
  messages: [{ role: 'user', content: 'Hello' }],
  systemPrompt: 'You are an expert in TypeScript and Node.js...',
});

// Available presets: 'default', 'coding', 'writing', 'analysis', 'concise', 'teaching'
```

---

## Type Mapping

### Message Types

**Before (ClaudeService):**
```typescript
interface ClaudeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

**After (ClaudeProvider):**
```typescript
interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string; // Optional
}
```

### Response Types

**Before:**
```typescript
interface ClaudeResponse {
  text: string;
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  model: string;
  id: string;
}
```

**After:**
```typescript
interface AIResponse {
  content: string; // Full response text
  messageId: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: {
    inputCost: number; // In USD
    outputCost: number; // In USD
    totalCost: number; // In USD
    currency: 'USD';
  };
  model: string;
  stopReason: string;
  finishReason?: string;
  rateLimitInfo?: RateLimitInfo; // If available
  provider: ProviderType; // 'claude'
  metadata?: Record<string, any>; // Additional metadata
}
```

---

## Breaking Changes

1. **Model IDs**: Some model IDs have changed
   - Old: `claude-3-sonnet-20240229`
   - New: `claude-sonnet-4.5-20250514`

2. **Initialization**: Now async
   - Old: `new ClaudeService()` (sync)
   - New: `await provider.initialize()` (async)

3. **Message format**: Added required fields
   - Must include `conversationId` and `userId`

4. **Error types**: Renamed
   - `ClaudeServiceError` → `ProviderError`
   - `ClaudeErrorType` → `ProviderErrorType`

5. **Response format**: Different structure
   - `text` → `content`
   - Added `cost` breakdown
   - Added `provider` field

---

## Migration Checklist

- [ ] Replace `ClaudeService` imports with `ClaudeProvider`
- [ ] Update configuration loading to use `ProviderConfigManager`
- [ ] Change `new ClaudeService()` to `new ClaudeProvider(config)` + `await initialize()`
- [ ] Update streaming callbacks to new format
- [ ] Add `conversationId` and `userId` to all message calls
- [ ] Update model IDs to new format
- [ ] Replace `ClaudeServiceError` with `ProviderError`
- [ ] Update error type checks to `ProviderErrorType`
- [ ] Update response property access (`text` → `content`)
- [ ] Update tests to use new provider architecture
- [ ] Remove unused `ClaudeService` imports

---

## Getting Help

If you encounter issues during migration:

1. Check the [Provider Architecture Documentation](../../docs/PROVIDER_UTILITIES_ARCHITECTURE.md)
2. Review [ClaudeProvider source](./providers/claude/ClaudeProvider.ts)
3. See [example usage](./providers/claude/README.md)
4. Look at [integration tests](./claude/test-integration.ts)

---

## Timeline

- **Now**: `ClaudeService` is deprecated but still works
- **Next Sprint**: WebSocket handlers migrate to `ClaudeProvider` (VBT-42)
- **Future**: `ClaudeService` will be removed

Start migrating new code now, and plan to migrate existing code over the next few sprints.
