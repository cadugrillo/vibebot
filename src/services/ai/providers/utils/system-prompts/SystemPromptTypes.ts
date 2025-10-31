/**
 * System Prompt Types
 * Provider-agnostic system prompt data structures
 */

/**
 * System prompt category
 */
export type SystemPromptCategory = 'general' | 'coding' | 'writing' | 'analysis' | 'custom';

/**
 * System prompt preset/template
 */
export interface SystemPromptPreset {
  /**
   * Unique identifier for this preset
   */
  id: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Description of what this preset does
   */
  description: string;

  /**
   * The actual system prompt text
   */
  prompt: string;

  /**
   * Category for organization
   */
  category: SystemPromptCategory;

  /**
   * Whether this is the default preset
   */
  isDefault?: boolean;

  /**
   * Recommended max tokens for this preset
   */
  maxTokens?: number;

  /**
   * Recommended temperature for this preset
   */
  temperature?: number;
}

/**
 * System prompt validation result
 */
export interface SystemPromptValidation {
  /**
   * Whether the prompt is valid
   */
  isValid: boolean;

  /**
   * Validation errors (empty if valid)
   */
  errors: string[];

  /**
   * Validation warnings (non-blocking)
   */
  warnings: string[];

  /**
   * Character count
   */
  characterCount: number;

  /**
   * Estimated token count
   */
  estimatedTokens: number;
}

/**
 * System prompt configuration
 */
export interface SystemPromptConfig {
  /**
   * Maximum character length
   * @default 10000
   */
  maxLength: number;

  /**
   * Maximum estimated tokens
   * @default 4000
   */
  maxTokens: number;

  /**
   * Minimum character length (if prompt is provided)
   * @default 10
   */
  minLength: number;

  /**
   * Whether empty prompts are allowed
   * @default true
   */
  allowEmpty: boolean;
}

/**
 * Default system prompt configuration
 */
export const DEFAULT_SYSTEM_PROMPT_CONFIG: SystemPromptConfig = {
  maxLength: 10000,  // 10k characters max
  maxTokens: 4000,   // ~4k tokens max (conservative estimate)
  minLength: 10,     // At least 10 characters if provided
  allowEmpty: true,  // Empty prompts are allowed (will use default)
};
