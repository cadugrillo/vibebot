/**
 * System Prompt Utilities
 * Provider-agnostic system prompt management
 *
 * @example
 * ```typescript
 * import { SystemPromptManager } from './utils/system-prompts';
 *
 * const promptManager = new SystemPromptManager();
 *
 * // Select system prompt
 * const prompt = promptManager.selectSystemPrompt(
 *   conversationPrompt,  // Custom prompt (if any)
 *   'coding',            // Or use coding preset
 *   true                 // Fallback to default if nothing provided
 * );
 *
 * // Create custom preset
 * const customPreset = promptManager.createCustomPreset({
 *   name: 'My Custom Assistant',
 *   description: 'Specialized for my use case',
 *   prompt: 'You are...',
 *   category: 'custom',
 * });
 * ```
 */

// Main class
export { SystemPromptManager } from './SystemPromptManager';

// Types
export {
  SystemPromptPreset,
  SystemPromptValidation,
  SystemPromptConfig,
  SystemPromptCategory,
  DEFAULT_SYSTEM_PROMPT_CONFIG,
} from './SystemPromptTypes';

// Presets
export {
  SYSTEM_PROMPT_PRESETS,
  DEFAULT_SYSTEM_PROMPT,
  getAllPresets,
  getPresetsByCategory,
  getPreset,
  getDefaultPreset,
} from './SystemPromptPresets';

// Validation utilities
export {
  validateSystemPrompt,
  sanitizeSystemPrompt,
  estimateTokenCount,
  printSystemPromptInfo,
} from './SystemPromptValidator';
