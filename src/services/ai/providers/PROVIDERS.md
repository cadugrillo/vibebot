Architecture Overview

  Your project uses a provider abstraction layer that allows you to support multiple AI providers (Claude, OpenAI, etc.) through a unified interface. Think
   of it as a plugin system for AI services.

  Core Structure

  services/ai/
  ├── providers/
  │   ├── IAIProvider.ts          # The contract all providers must implement
  │   ├── factory.ts              # Creates and caches provider instances
  │   ├── claude/                 # Claude implementation (COMPLETE ✅)
  │   │   ├── ClaudeProvider.ts
  │   │   ├── ClaudeStreamHandler.ts
  │   │   └── ClaudeErrorMapper.ts
  │   └── utils/                  # Shared resilience utilities
  │       ├── rate-limit/         # Auto-retry with exponential backoff
  │       ├── circuit-breaker/    # Prevent cascading failures
  │       ├── error-logging/      # Structured error tracking
  │       └── system-prompts/     # Prompt management with presets

  ---
  How Providers Work

  1. The Interface (IAIProvider)

  Every provider must implement these core methods:
  - sendMessage() - Send a message and get a response
  - streamMessage() - Get streaming responses with callbacks
  - getAvailableModels() - List supported models
  - testConnection() - Health check
  - estimateCost() - Calculate usage costs

  This ensures all providers work the same way from the application's perspective.

  2. The Factory Pattern

  Instead of creating providers directly, you use AIProviderFactory:

  // Get the singleton factory
  const factory = AIProviderFactory.getInstance();

  // Create a provider (automatically cached)
  const provider = factory.createProvider(ProviderType.CLAUDE, config);

  // Now use it
  const response = await provider.sendMessage({...});

  Benefits:
  - Instance caching - Same config = same instance (saves memory)
  - Centralized management - One place to create/destroy providers
  - Dynamic registration - Add new providers at runtime

  3. Provider Utilities (The Secret Sauce)

  Each provider is wrapped with 4 resilience utilities that make it production-ready:

  🔄 RateLimitManager

  - Automatically retries when you hit rate limits (429 errors)
  - Uses exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s
  - Parses provider-specific headers to know when to retry

  🛡️ CircuitBreakerManager

  - Prevents cascading failures
  - After 5 failures, opens the circuit (fails fast)
  - Auto-recovers after 60 seconds to test if service is back

  📊 ErrorLogger

  - Tracks all errors in a circular buffer (last 1000 errors)
  - Categorizes by type, severity, provider
  - Provides statistics for monitoring

  📝 SystemPromptManager

  - 6 built-in presets (assistant, coding, creative, etc.)
  - Validates and sanitizes system prompts
  - Estimates token usage

  ---
  Message Flow Example

  When you send a message, here's what happens:

  1. Application calls provider.sendMessage()
                  ↓
  2. CircuitBreaker checks state (is service healthy?)
                  ↓
  3. RateLimitManager wraps the API call
                  ↓
  4. Claude API is called
                  ↓
  5. If 429 error → RateLimitManager retries with backoff
     If other error → ClaudeErrorMapper converts to ProviderError
                  ↓
  6. Response is converted to unified AIResponse format
                  ↓
  7. Tokens counted, cost calculated
                  ↓
  8. ErrorLogger tracks any errors
                  ↓
  9. Return unified response to application

  ---
  Currently Implemented

  ✅ Claude Provider (COMPLETE)

  Located in: providers/claude/

  Features:
  - 3 models: Sonnet 4.5 (recommended), Haiku 4.5 (economy), Opus 4.1 (premium)
  - Streaming support with real-time callbacks
  - Vision capabilities
  - Cost tracking (tokens × model pricing)
  - All utilities integrated

  Test Coverage: 17 integration tests passing

  ⏳ OpenAI Provider (PLANNED - VBT-44)

  Not yet implemented, but the architecture is ready:
  - Rate limit header parser already exists
  - Just needs implementation following the same pattern

  ---
  Key Design Benefits

  1. Provider Agnostic - Switch between Claude/OpenAI without changing application code
  2. Resilient - Auto-retry, circuit breaking, error logging built-in
  3. Testable - 770+ unit tests for utilities
  4. Extensible - Add new providers by implementing IAIProvider
  5. Cost Aware - Every interaction tracks tokens and cost
  6. Production Ready - Handles rate limits, failures, and monitoring

  ---
  Looking at Your Code

  I noticed in message.service.ts:712 there's likely integration with this provider system. The file structure shows:
  - ✅ Claude provider fully implemented and tested
  - ✅ Provider abstraction layer complete (VBT-42)
  - ✅ WebSocket integration for streaming (VBT-39)