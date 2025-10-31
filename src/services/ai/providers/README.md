# AI Provider Abstraction Layer

**VBT-42**: Provider-agnostic architecture for multiple AI providers (Claude, OpenAI, etc.)

## 📁 Directory Structure

```
providers/
├── README.md                    # This file
├── IAIProvider.ts              # Main provider interface
├── factory.ts                  # Provider factory for creation
├── config.ts                   # Configuration management
├── types.ts                    # Shared types
├── errors.ts                   # Unified error handling
├── streaming.ts                # Streaming abstractions
│
├── claude/                     # Claude/Anthropic provider
│   ├── ClaudeProvider.ts       # Main provider implementation
│   ├── ClaudeStreamHandler.ts  # Streaming handler
│   ├── ClaudeErrorMapper.ts    # Error mapping
│   ├── models.ts               # Model configurations
│   └── index.ts
│
└── utils/                      # Provider-agnostic utilities
    ├── rate-limit/             # Rate limiting with retry
    ├── circuit-breaker/        # Circuit breaker pattern
    ├── error-logging/          # Structured error logging
    ├── system-prompts/         # System prompt management
    ├── ProviderUtilities.ts    # Convenience wrapper
    └── __tests__/              # Comprehensive tests
```

---

## 🚀 Quick Start

### 1. Basic Usage

```typescript
import { AIProviderFactory } from './services/ai/providers';
import { ProviderType } from './services/ai/providers/types';

// Create provider using factory
const factory = AIProviderFactory.getInstance();
const provider = factory.createProvider(ProviderType.CLAUDE);

// Send a message
const response = await provider.sendMessage({
  conversationId: 'conv-123',
  userId: 'user-123',
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
});

console.log(response.content); // AI response
console.log(response.cost); // Cost breakdown
```

### 2. Streaming Responses

```typescript
// Stream AI response in real-time
await provider.streamMessage(
  {
    conversationId: 'conv-123',
    userId: 'user-123',
    messages: [{ role: 'user', content: 'Tell me a story' }],
  },
  (event) => {
    if (event.type === 'delta') {
      process.stdout.write(event.content); // Stream chunks
    } else if (event.type === 'complete') {
      console.log('\n\nDone!');
    } else if (event.type === 'error') {
      console.error('Error:', event.error);
    }
  }
);
```

### 3. Using Provider Utilities

```typescript
import { createUtilitiesForProvider } from './services/ai/providers/utils';

// Create utilities configured for Claude
const utilities = createUtilitiesForProvider(ProviderType.CLAUDE);

// Create provider with custom utilities
const provider = new ClaudeProvider({
  config: claudeConfig,
  utilities: utilities.getAll(),
});

// Check statistics
console.log(utilities.errorLogger.getStats());
console.log(utilities.circuitBreaker.getAllStats());
```

---

## 📚 Core Concepts

### IAIProvider Interface

All providers implement this unified interface:

```typescript
interface IAIProvider {
  // Metadata
  getMetadata(): ProviderMetadata;
  getAvailableModels(): ModelConfig[];

  // Connection
  testConnection(): Promise<boolean>;

  // Messaging
  sendMessage(params: SendMessageParams): Promise<AIResponse>;
  streamMessage(params: StreamMessageParams, callback: StreamCallback): Promise<AIResponse>;
}
```

### Provider Factory

Creates and manages provider instances:

```typescript
const factory = AIProviderFactory.getInstance();

// Create provider (cached by default)
const provider = factory.createProvider(ProviderType.CLAUDE, config);

// Force new instance
const newProvider = factory.createProvider(ProviderType.CLAUDE, config, true);

// Check registered providers
console.log(factory.getRegisteredProviders()); // ['claude']
```

### Configuration Management

Centralized configuration loading:

```typescript
const configManager = ProviderConfigManager.getInstance();

// Get config (loads from environment)
const config = configManager.getConfig(ProviderType.CLAUDE);

// Validate configuration
const validation = configManager.validateConfig(ProviderType.CLAUDE, config);
if (!validation.isValid) {
  console.error('Config errors:', validation.errors);
}
```

---

## 🛠️ Provider Utilities

### 1. Rate Limiting

Automatic retry with exponential backoff:

```typescript
import { RateLimitManager, AnthropicRateLimitHeaderParser } from './utils';

const rateLimiter = new RateLimitManager(
  { maxRetries: 3, baseDelay: 1000 },
  new AnthropicRateLimitHeaderParser()
);

// Wraps API calls with retry logic
const result = await rateLimiter.executeWithRetry(async () => {
  return await someApiCall();
});
```

### 2. Circuit Breaker

Prevents cascading failures:

```typescript
import { CircuitBreakerManager } from './utils';

const circuitBreaker = new CircuitBreakerManager();

// Wraps operations with circuit breaker
const result = await circuitBreaker.execute('api-call', async () => {
  return await apiCall();
}, {
  failureThreshold: 5,  // Open after 5 failures
  timeout: 60000,       // Reset after 60s
});

// Check state
const stats = circuitBreaker.getStats('api-call');
console.log(stats.state); // CLOSED, OPEN, or HALF_OPEN
```

### 3. Error Logging

Structured error tracking:

```typescript
import { ErrorLogger } from './utils';

const errorLogger = new ErrorLogger(1000); // Keep last 1000 errors

// Log errors
errorLogger.logError(error, {
  userId: 'user-123',
  conversationId: 'conv-123',
  operation: 'sendMessage',
});

// Get statistics
const stats = errorLogger.getStats();
console.log(`Total errors: ${stats.total}`);
console.log(`By type:`, stats.byType);
console.log(`By provider:`, stats.byProvider);
```

### 4. System Prompts

Validate and manage system prompts:

```typescript
import { SystemPromptManager } from './utils';

const promptManager = new SystemPromptManager();

// Use built-in presets
const codingPreset = promptManager.getPreset('coding');

// Validate custom prompt
const validation = promptManager.validate('You are helpful');
console.log(validation.isValid); // true
console.log(validation.estimatedTokens); // ~4

// Create custom preset
const custom = promptManager.createCustomPreset({
  name: 'My Assistant',
  description: 'Specialized assistant',
  prompt: 'You are my specialized assistant',
  category: 'custom',
});
```

---

## 🎯 Best Practices

### 1. Use Factory Pattern

```typescript
// ✅ Good: Use factory
const factory = AIProviderFactory.getInstance();
const provider = factory.createProvider(ProviderType.CLAUDE);

// ❌ Bad: Direct instantiation
const provider = new ClaudeProvider(config); // Bypasses factory benefits
```

### 2. Handle Errors Properly

```typescript
import { ProviderError, ProviderErrorType } from './providers/errors';

try {
  const response = await provider.sendMessage(params);
} catch (error) {
  if (error instanceof ProviderError) {
    switch (error.type) {
      case ProviderErrorType.RATE_LIMIT:
        console.log('Rate limited! Retry later.');
        break;
      case ProviderErrorType.AUTHENTICATION:
        console.error('Invalid API key!');
        break;
      default:
        console.error(`Provider error: ${error.message}`);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### 3. Use Utilities for Resilience

```typescript
// ✅ Good: Use utilities for automatic resilience
const provider = new ClaudeProvider({
  config,
  utilities: {
    rateLimitManager: new RateLimitManager(),
    circuitBreaker: new CircuitBreakerManager(),
    errorLogger: new ErrorLogger(),
  },
});

// ❌ Bad: Manual error handling everywhere
try {
  await provider.sendMessage(params);
} catch (error) {
  // Manual retry logic...
  // Manual circuit breaking...
  // Manual error logging...
}
```

### 4. Stream for Better UX

```typescript
// ✅ Good: Stream for real-time feedback
await provider.streamMessage(params, (event) => {
  if (event.type === 'delta') {
    updateUI(event.content);
  }
});

// ❌ Bad: Wait for complete response
const response = await provider.sendMessage(params);
updateUI(response.content); // User waits entire time
```

### 5. Monitor and Log

```typescript
// Get provider stats
const errorStats = provider.getErrorLogger().getStats();
const circuitStats = provider.getCircuitBreaker().getAllStats();

// Log important metrics
console.log(`Errors: ${errorStats.total}`);
console.log(`Rate limit errors: ${errorStats.byType['RATE_LIMIT']}`);
console.log(`Circuit state: ${circuitStats['claude-send'].state}`);
```

---

## 🧪 Testing

### Unit Tests

```typescript
import { ClaudeProvider } from './providers/claude';
import { ProviderError, ProviderErrorType } from './providers/errors';

describe('ClaudeProvider', () => {
  it('should send message successfully', async () => {
    const provider = new ClaudeProvider(config);

    const response = await provider.sendMessage({
      conversationId: 'test',
      userId: 'test',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(response.content).toBeTruthy();
    expect(response.cost.totalCost).toBeGreaterThan(0);
  });
});
```

### Integration Tests

See `utils/__tests__/` for 770+ comprehensive tests covering all scenarios.

---

## 📖 API Reference

### SendMessageParams

```typescript
interface SendMessageParams {
  conversationId: string;
  userId: string;
  messages: AIMessage[];
  messageId?: string;
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  providerOptions?: Record<string, any>;
}
```

### AIResponse

```typescript
interface AIResponse {
  content: string;              // Response text
  messageId: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: {
    inputCost: number;          // In USD
    outputCost: number;
    totalCost: number;
    currency: 'USD';
  };
  model: string;
  stopReason: string;
  provider: ProviderType;
  metadata?: Record<string, any>;
}
```

### StreamEvent

```typescript
interface StreamEvent {
  type: 'start' | 'delta' | 'complete' | 'error';
  content?: string;
  isComplete?: boolean;
  messageId?: string;
  error?: string;
  metadata?: Record<string, any>;
}
```

---

## 🔧 Advanced Usage

### Custom Provider Implementation

```typescript
class MyCustomProvider implements IAIProvider {
  getMetadata(): ProviderMetadata {
    return {
      name: 'My Provider',
      type: ProviderType.OPENAI, // Or custom type
      version: '1.0.0',
      // ...
    };
  }

  async sendMessage(params: SendMessageParams): Promise<AIResponse> {
    // Implementation
  }

  async streamMessage(params: StreamMessageParams, callback: StreamCallback): Promise<AIResponse> {
    // Implementation
  }

  // ... other methods
}

// Register with factory
const factory = AIProviderFactory.getInstance();
factory.registerProvider('my-provider', (config) => new MyCustomProvider(config));
```

### Shared Utilities Across Providers

```typescript
import { createSharedUtilities } from './providers/utils';

// Create shared utilities for all providers
const shared = createSharedUtilities();

// Use same error logger for all providers
const claude = new ClaudeProvider({
  config: claudeConfig,
  utilities: shared.getAll(),
});

const openai = new OpenAIProvider({
  config: openaiConfig,
  utilities: shared.getAll(),
});

// Unified error logging
console.log(shared.errorLogger.getStats());
// Shows errors from both providers
```

---

## 📝 Migration Guide

See [MIGRATION.md](../../claude/MIGRATION.md) for complete migration guide from old ClaudeService to new provider architecture.

---

## 🐛 Troubleshooting

### Issue: "Provider not initialized"
**Solution**: Call `await provider.initialize()` or ensure factory creates provider correctly.

### Issue: "Rate limit exceeded"
**Solution**: Rate limiting is automatic with utilities. Check `provider.getRateLimitManager().getStats()`.

### Issue: "Circuit breaker is OPEN"
**Solution**: Too many failures. Wait for timeout or call `provider.getCircuitBreaker().resetBreaker(name)`.

### Issue: "Invalid API key"
**Solution**: Check `.env` file and ensure `ANTHROPIC_API_KEY` is set correctly.

---

## 📚 Related Documentation

- [Provider Utilities Architecture](../../../docs/PROVIDER_UTILITIES_ARCHITECTURE.md)
- [Migration Guide](../../claude/MIGRATION.md)
- [Test Documentation](./utils/__tests__/README.md)
- [WebSocket Integration](../../../websocket/handlers/aiIntegration.ts)

---

## 🤝 Contributing

When adding new providers:
1. Implement `IAIProvider` interface
2. Create provider-specific error mapper
3. Add model configurations
4. Register with factory
5. Write comprehensive tests
6. Update documentation

---

## 📄 License

MIT License - See LICENSE file for details
