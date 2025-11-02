/**
 * AI Provider Abstraction Layer - Public API
 * VBT-164: Export all public types and interfaces
 * VBT-165: Export factory pattern
 * VBT-166: Export error handling
 * VBT-167: Export unified streaming interface
 * VBT-168: Export Claude provider implementation
 * VBT-170: Export configuration management
 *
 * This file provides the main entry point for the AI provider abstraction layer.
 * Import from this file to access all core types, interfaces, and utilities.
 *
 * @example
 * ```typescript
 * import { IAIProvider, ProviderType, AIMessage, getProviderFactory } from './providers';
 * import { ClaudeProvider } from './providers';
 * import { getConfigManager } from './providers';
 * ```
 */

// Core interface
export { IAIProvider, ProviderInitOptions } from './IAIProvider';

// Claude Provider (VBT-168)
export {
  ClaudeProvider,
  ClaudeStreamHandler,
  ClaudeErrorMapper,
  getClaudeErrorMapper,
  ClaudeModel,
  ClaudeModelFamily,
  CLAUDE_MODELS,
  getClaudeModelConfig,
  getAllClaudeModels,
  getRecommendedClaudeModel,
  isValidClaudeModel,
  getClaudeModelsByFamily,
  getClaudeModelsByTier,
  calculateClaudeCost,
} from './claude';

// Factory pattern (VBT-165)
export {
  AIProviderFactory,
  ProviderConstructor,
  ProviderFactoryError,
  getProviderFactory,
  resetProviderFactory,
} from './factory';

// Configuration Management (VBT-170)
export {
  ProviderConfigManager,
  ConfigSource,
  ProviderConfigWithMetadata,
  ValidationResult,
  getConfigManager,
  resetConfigManager,
} from './config';

// Error handling (VBT-166)
export {
  ProviderError,
  ProviderErrorType,
  ErrorSeverity,
  ErrorContext,
  ErrorMapper,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  mapHttpStatusToErrorType,
  createErrorFromStatus,
  enrichErrorContext,
  isProviderError,
  wrapError,
} from './errors';

// Streaming interface (VBT-167)
export {
  BaseStreamHandler,
  StreamState,
  StreamMetrics,
  StreamOptions,
  DEFAULT_STREAM_OPTIONS,
  StreamBuffer,
  StreamRateLimiter,
  debounceCallback,
  batchCallback,
} from './streaming';

// Core types
export {
  // Provider types
  ProviderType,
  ProviderConfig,
  ProviderMetadata,

  // Message types
  AIMessage,
  AIResponse,
  SendMessageParams,
  StreamMessageParams,

  // Streaming types
  StreamEvent,
  StreamCallback,

  // Token and cost types
  TokenUsage,
  CostInfo,
  RateLimitInfo,

  // Model types
  ModelConfig,
  ModelCapabilities,
  ModelTier,
  ModelPricing,

  // Database types
  MessageMetadata,
  ConversationHistoryEntry,

  // VBT-171: Provider Selection Types
  SelectionStrategyType,
  SelectionContext,
  ModelCapability,
  ProviderPreference,

  // VBT-172: Provider Capabilities and Metadata Types
  ProviderStatus,
  ProviderRateLimits,
  ModelAvailability,

  // Utility functions
  toAIMessageRole,
  buildAIMessages,
  calculateCostFromUsage,
} from './types';

// VBT-171: Provider Selection Logic
export {
  ProviderSelector,
  ProviderSelectorError,
  getProviderSelector,
  resetProviderSelector,
} from './selector';

export {
  ModelRegistry,
  ModelRegistryError,
  getModelRegistry,
  resetModelRegistry,
} from './model-registry';

export {
  FallbackChainManager,
  FallbackOptions,
  getFallbackManager,
  resetFallbackManager,
} from './fallback';

export {
  ProviderPreferenceManager,
  getPreferenceManager,
  resetPreferenceManager,
} from './preferences';

// VBT-171: Selection Strategies
export {
  ISelectionStrategy,
  BaseSelectionStrategy,
  SelectByNameStrategy,
  SelectByCapabilityStrategy,
  SelectByCostStrategy,
  SelectByAvailabilityStrategy,
} from './strategies';
