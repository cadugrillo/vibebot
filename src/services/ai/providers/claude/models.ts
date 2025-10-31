/**
 * Claude Models Configuration
 * VBT-168: Unified model configuration for Claude provider
 *
 * Maps Claude-specific model configurations to unified ModelConfig format.
 */

import {
  ModelConfig,
  ModelTier,
  ProviderType,
  ModelCapabilities,
  ModelPricing,
} from '../types';

/**
 * Claude model identifiers
 */
export enum ClaudeModel {
  SONNET_4_5 = 'claude-sonnet-4-5-20250929',
  HAIKU_4_5 = 'claude-haiku-4-5-20251001',
  OPUS_4_1 = 'claude-opus-4-1-20250805',
}

/**
 * Claude model family
 */
export enum ClaudeModelFamily {
  SONNET = 'SONNET',
  OPUS = 'OPUS',
  HAIKU = 'HAIKU',
}

/**
 * Claude-specific model metadata
 */
interface ClaudeModelMetadata {
  family: ClaudeModelFamily;
}

/**
 * All available Claude models with unified configuration
 */
export const CLAUDE_MODELS: Record<ClaudeModel, ModelConfig> = {
  [ClaudeModel.SONNET_4_5]: {
    id: ClaudeModel.SONNET_4_5,
    name: 'Claude 4.5 Sonnet',
    provider: ProviderType.CLAUDE,
    tier: ModelTier.STANDARD,
    description: 'Latest balanced model with excellent performance and cost efficiency. Supports extended thinking.',
    capabilities: {
      streaming: true,
      vision: true,
      functionCalling: true,
      promptCaching: true,
      jsonMode: false,
      contextWindow: 200000,
      maxOutputTokens: 64000,
    },
    pricing: {
      input: 3.00,
      output: 15.00,
      cachedInput: 0.30,
    },
    releaseDate: '2025-09-29',
    deprecated: false,
    recommended: true,
    metadata: {
      family: ClaudeModelFamily.SONNET,
    },
  },

  [ClaudeModel.HAIKU_4_5]: {
    id: ClaudeModel.HAIKU_4_5,
    name: 'Claude 4.5 Haiku',
    provider: ProviderType.CLAUDE,
    tier: ModelTier.ECONOMY,
    description: 'Fastest and most cost-effective model with extended thinking support',
    capabilities: {
      streaming: true,
      vision: true,
      functionCalling: true,
      promptCaching: true,
      jsonMode: false,
      contextWindow: 200000,
      maxOutputTokens: 64000,
    },
    pricing: {
      input: 1.00,
      output: 5.00,
      cachedInput: 0.10,
    },
    releaseDate: '2025-10-01',
    deprecated: false,
    recommended: false,
    metadata: {
      family: ClaudeModelFamily.HAIKU,
    },
  },

  [ClaudeModel.OPUS_4_1]: {
    id: ClaudeModel.OPUS_4_1,
    name: 'Claude 4.1 Opus',
    provider: ProviderType.CLAUDE,
    tier: ModelTier.PREMIUM,
    description: 'Most intelligent model for complex tasks requiring deep reasoning and extended thinking',
    capabilities: {
      streaming: true,
      vision: true,
      functionCalling: true,
      promptCaching: true,
      jsonMode: false,
      contextWindow: 200000,
      maxOutputTokens: 32000,
    },
    pricing: {
      input: 15.00,
      output: 75.00,
      cachedInput: 1.50,
    },
    releaseDate: '2025-08-05',
    deprecated: false,
    recommended: false,
    metadata: {
      family: ClaudeModelFamily.OPUS,
    },
  },
};

/**
 * Get Claude model configuration by ID
 */
export function getClaudeModelConfig(modelId: string): ModelConfig | undefined {
  return CLAUDE_MODELS[modelId as ClaudeModel];
}

/**
 * Get all available Claude models
 */
export function getAllClaudeModels(): ModelConfig[] {
  return Object.values(CLAUDE_MODELS).filter(model => !model.deprecated);
}

/**
 * Get recommended Claude model
 */
export function getRecommendedClaudeModel(): ModelConfig {
  const recommended = Object.values(CLAUDE_MODELS).find(model => model.recommended);
  return recommended || CLAUDE_MODELS[ClaudeModel.SONNET_4_5];
}

/**
 * Validate if a model is a valid Claude model
 */
export function isValidClaudeModel(modelId: string): boolean {
  const config = getClaudeModelConfig(modelId);
  return config !== undefined && !config.deprecated;
}

/**
 * Get models by family
 */
export function getClaudeModelsByFamily(family: ClaudeModelFamily): ModelConfig[] {
  return Object.values(CLAUDE_MODELS).filter(
    model => !model.deprecated && (model.metadata as ClaudeModelMetadata)?.family === family
  );
}

/**
 * Get models by tier
 */
export function getClaudeModelsByTier(tier: ModelTier): ModelConfig[] {
  return Object.values(CLAUDE_MODELS).filter(
    model => !model.deprecated && model.tier === tier
  );
}

/**
 * Calculate cost for token usage
 */
export function calculateClaudeCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number = 0
): number | null {
  const config = getClaudeModelConfig(modelId);
  if (!config) return null;

  const inputCost = (inputTokens / 1_000_000) * config.pricing.input;
  const outputCost = (outputTokens / 1_000_000) * config.pricing.output;
  const cachedCost = config.pricing.cachedInput
    ? (cachedInputTokens / 1_000_000) * config.pricing.cachedInput
    : 0;

  return inputCost + outputCost + cachedCost;
}
