/**
 * Claude Models Configuration
 * VBT-156: Multi-Model Support (Sonnet, Opus, Haiku)
 *
 * Defines available models, their capabilities, limits, and pricing
 */

/**
 * Claude model identifiers
 * These are the exact model strings used in API calls
 */
export enum ClaudeModel {
  // Claude 4.5 Sonnet (Latest - Balanced performance and cost)
  SONNET_4_5 = 'claude-sonnet-4-5-20250929',

  // Claude 3.5 Sonnet (Previous generation)
  SONNET_3_5 = 'claude-3-5-sonnet-20241022',

  // Claude 4 Opus (Highest intelligence, slower, most expensive)
  OPUS_4 = 'claude-opus-4-20250514',

  // Claude 4 Haiku (Fastest, cheapest, good for simple tasks)
  HAIKU_4 = 'claude-haiku-4-20250228',
}

/**
 * Model family for grouping
 */
export enum ModelFamily {
  SONNET = 'SONNET',
  OPUS = 'OPUS',
  HAIKU = 'HAIKU',
}

/**
 * Model tier for UI/UX purposes
 */
export enum ModelTier {
  STANDARD = 'STANDARD',   // Balanced
  PREMIUM = 'PREMIUM',     // High performance
  ECONOMY = 'ECONOMY',     // Cost-effective
}

/**
 * Model configuration interface
 */
export interface ModelConfig {
  id: ClaudeModel;
  name: string;
  family: ModelFamily;
  tier: ModelTier;
  description: string;

  // Capabilities
  maxTokens: number;           // Maximum output tokens
  contextWindow: number;       // Maximum context window
  supportsVision: boolean;     // Image input support
  supportsTools: boolean;      // Function calling support
  supportsCaching: boolean;    // Prompt caching support

  // Pricing (USD per 1M tokens)
  pricing: {
    input: number;            // Cost per 1M input tokens
    output: number;           // Cost per 1M output tokens
    cachedInput?: number;     // Cost per 1M cached input tokens
  };

  // Metadata
  releaseDate: string;
  deprecated: boolean;
  recommended: boolean;        // Is this a recommended model?
}

/**
 * All available Claude models with their configurations
 * Pricing as of January 2025 (verify at https://www.anthropic.com/pricing)
 */
export const CLAUDE_MODELS: Record<ClaudeModel, ModelConfig> = {
  [ClaudeModel.SONNET_4_5]: {
    id: ClaudeModel.SONNET_4_5,
    name: 'Claude 4.5 Sonnet',
    family: ModelFamily.SONNET,
    tier: ModelTier.STANDARD,
    description: 'Latest balanced model with excellent performance and cost efficiency',

    maxTokens: 8192,
    contextWindow: 200000,      // 200k tokens
    supportsVision: true,
    supportsTools: true,
    supportsCaching: true,

    pricing: {
      input: 3.00,              // $3 per 1M input tokens
      output: 15.00,            // $15 per 1M output tokens
      cachedInput: 0.30,        // $0.30 per 1M cached tokens
    },

    releaseDate: '2025-09-29',
    deprecated: false,
    recommended: true,
  },

  [ClaudeModel.SONNET_3_5]: {
    id: ClaudeModel.SONNET_3_5,
    name: 'Claude 3.5 Sonnet',
    family: ModelFamily.SONNET,
    tier: ModelTier.STANDARD,
    description: 'Previous generation Sonnet model, still highly capable',

    maxTokens: 8192,
    contextWindow: 200000,
    supportsVision: true,
    supportsTools: true,
    supportsCaching: true,

    pricing: {
      input: 3.00,
      output: 15.00,
      cachedInput: 0.30,
    },

    releaseDate: '2024-10-22',
    deprecated: false,
    recommended: false,
  },

  [ClaudeModel.OPUS_4]: {
    id: ClaudeModel.OPUS_4,
    name: 'Claude 4 Opus',
    family: ModelFamily.OPUS,
    tier: ModelTier.PREMIUM,
    description: 'Most intelligent model for complex tasks requiring deep reasoning',

    maxTokens: 8192,
    contextWindow: 200000,
    supportsVision: true,
    supportsTools: true,
    supportsCaching: true,

    pricing: {
      input: 15.00,             // $15 per 1M input tokens
      output: 75.00,            // $75 per 1M output tokens
      cachedInput: 1.50,        // $1.50 per 1M cached tokens
    },

    releaseDate: '2025-05-14',
    deprecated: false,
    recommended: false,
  },

  [ClaudeModel.HAIKU_4]: {
    id: ClaudeModel.HAIKU_4,
    name: 'Claude 4 Haiku',
    family: ModelFamily.HAIKU,
    tier: ModelTier.ECONOMY,
    description: 'Fastest and most cost-effective model for simple tasks',

    maxTokens: 8192,
    contextWindow: 200000,
    supportsVision: true,
    supportsTools: true,
    supportsCaching: true,

    pricing: {
      input: 0.80,              // $0.80 per 1M input tokens
      output: 4.00,             // $4 per 1M output tokens
      cachedInput: 0.08,        // $0.08 per 1M cached tokens
    },

    releaseDate: '2025-02-28',
    deprecated: false,
    recommended: false,
  },
};

/**
 * Get model configuration by ID
 * @param modelId - Claude model identifier
 * @returns Model configuration or undefined if not found
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return CLAUDE_MODELS[modelId as ClaudeModel];
}

/**
 * Check if a model ID is valid
 * @param modelId - Model identifier to validate
 * @returns True if model exists and is not deprecated
 */
export function isValidModel(modelId: string): boolean {
  const config = getModelConfig(modelId);
  return config !== undefined && !config.deprecated;
}

/**
 * Get all available (non-deprecated) models
 * @returns Array of available model configurations
 */
export function getAvailableModels(): ModelConfig[] {
  return Object.values(CLAUDE_MODELS).filter(model => !model.deprecated);
}

/**
 * Get recommended model
 * @returns The recommended model configuration
 */
export function getRecommendedModel(): ModelConfig {
  const recommended = Object.values(CLAUDE_MODELS).find(model => model.recommended);
  return recommended || CLAUDE_MODELS[ClaudeModel.SONNET_4_5];
}

/**
 * Get models by family
 * @param family - Model family (SONNET, OPUS, HAIKU)
 * @returns Array of models in the specified family
 */
export function getModelsByFamily(family: ModelFamily): ModelConfig[] {
  return Object.values(CLAUDE_MODELS).filter(model =>
    model.family === family && !model.deprecated
  );
}

/**
 * Get models by tier
 * @param tier - Model tier (STANDARD, PREMIUM, ECONOMY)
 * @returns Array of models in the specified tier
 */
export function getModelsByTier(tier: ModelTier): ModelConfig[] {
  return Object.values(CLAUDE_MODELS).filter(model =>
    model.tier === tier && !model.deprecated
  );
}

/**
 * Calculate cost for a given token usage
 * @param modelId - Claude model identifier
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param cachedInputTokens - Number of cached input tokens (optional)
 * @returns Cost in USD or null if model not found
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number = 0
): number | null {
  const config = getModelConfig(modelId);
  if (!config) return null;

  const inputCost = (inputTokens / 1_000_000) * config.pricing.input;
  const outputCost = (outputTokens / 1_000_000) * config.pricing.output;
  const cachedCost = config.pricing.cachedInput
    ? (cachedInputTokens / 1_000_000) * config.pricing.cachedInput
    : 0;

  return inputCost + outputCost + cachedCost;
}

/**
 * Validate model and get configuration with error handling
 * @param modelId - Model identifier to validate
 * @throws Error if model is invalid or deprecated
 * @returns Model configuration
 */
export function validateAndGetModel(modelId: string): ModelConfig {
  const config = getModelConfig(modelId);

  if (!config) {
    throw new Error(
      `Invalid model: ${modelId}. ` +
      `Available models: ${Object.values(ClaudeModel).join(', ')}`
    );
  }

  if (config.deprecated) {
    throw new Error(
      `Model ${config.name} (${modelId}) is deprecated. ` +
      `Please use a current model.`
    );
  }

  return config;
}

/**
 * Get model display name for UI
 * @param modelId - Claude model identifier
 * @returns Human-readable model name or the ID if not found
 */
export function getModelDisplayName(modelId: string): string {
  const config = getModelConfig(modelId);
  return config ? config.name : modelId;
}
