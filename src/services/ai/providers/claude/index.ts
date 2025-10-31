/**
 * Claude Provider - Public API
 * VBT-168: Export Claude provider implementation
 *
 * Exports all Claude-specific components for the provider abstraction layer.
 */

// Main provider class
export { ClaudeProvider, ClaudeProviderOptions } from './ClaudeProvider';

// Stream handler
export { ClaudeStreamHandler } from './ClaudeStreamHandler';

// Error mapper
export { ClaudeErrorMapper, getClaudeErrorMapper } from './ClaudeErrorMapper';

// Models
export {
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
} from './models';
