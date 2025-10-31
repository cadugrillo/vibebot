/**
 * System Prompts Management
 * VBT-162: Add System Prompt Support
 *
 * Provides system prompt templates, validation, and management
 */

import { ClaudeServiceError, ClaudeErrorType } from './types';

/**
 * System prompt preset/template
 */
export interface SystemPromptPreset {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: 'general' | 'coding' | 'writing' | 'analysis' | 'custom';
  isDefault?: boolean;
  maxTokens?: number; // Recommended max tokens for this preset
  temperature?: number; // Recommended temperature
}

/**
 * System prompt validation result
 */
export interface SystemPromptValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  characterCount: number;
  estimatedTokens: number;
}

/**
 * System prompt configuration
 */
export interface SystemPromptConfig {
  maxLength: number; // Maximum character length
  maxTokens: number; // Maximum estimated tokens
  minLength: number; // Minimum character length
  allowEmpty: boolean; // Whether empty prompts are allowed
}

/**
 * Default system prompt configuration
 */
const DEFAULT_CONFIG: SystemPromptConfig = {
  maxLength: 10000, // 10k characters max
  maxTokens: 4000, // ~4k tokens max (conservative estimate)
  minLength: 10, // At least 10 characters if provided
  allowEmpty: true, // Empty prompts are allowed (will use default)
};

/**
 * Default system prompt (used when no custom prompt is provided)
 */
export const DEFAULT_SYSTEM_PROMPT = `You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest.

Key guidelines:
- Provide accurate, thoughtful, and well-reasoned responses
- If you're unsure about something, say so honestly
- Be concise but thorough in your explanations
- Use examples and analogies when helpful
- For code, provide clear explanations and best practices
- Respect user privacy and data security
- Decline requests for harmful, illegal, or unethical content`;

/**
 * Built-in system prompt presets
 */
export const SYSTEM_PROMPT_PRESETS: Record<string, SystemPromptPreset> = {
  default: {
    id: 'default',
    name: 'Default Assistant',
    description: 'General-purpose helpful assistant',
    prompt: DEFAULT_SYSTEM_PROMPT,
    category: 'general',
    isDefault: true,
  },

  coding: {
    id: 'coding',
    name: 'Code Assistant',
    description: 'Specialized for software development and coding tasks',
    prompt: `You are Claude, an expert software development assistant created by Anthropic.

Your expertise includes:
- Writing clean, efficient, and well-documented code
- Explaining complex programming concepts clearly
- Debugging and troubleshooting issues
- Following best practices and design patterns
- Security-conscious coding practices
- Testing and quality assurance

Guidelines:
- Provide code examples with clear comments
- Explain your reasoning and trade-offs
- Suggest multiple approaches when appropriate
- Point out potential bugs or improvements
- Use modern language features and best practices
- Consider performance, security, and maintainability`,
    category: 'coding',
    maxTokens: 4000,
    temperature: 0.7,
  },

  writing: {
    id: 'writing',
    name: 'Writing Assistant',
    description: 'Help with creative and professional writing',
    prompt: `You are Claude, a skilled writing assistant created by Anthropic.

Your capabilities include:
- Creative writing (stories, poetry, scripts)
- Professional writing (emails, reports, proposals)
- Technical writing (documentation, guides)
- Editing and proofreading
- Improving clarity, style, and tone
- Adapting writing for different audiences

Guidelines:
- Match the user's desired tone and style
- Provide constructive feedback
- Suggest improvements with explanations
- Be mindful of grammar, spelling, and punctuation
- Respect creative vision while offering enhancements
- Adapt complexity to the target audience`,
    category: 'writing',
    maxTokens: 8000,
    temperature: 0.9,
  },

  analysis: {
    id: 'analysis',
    name: 'Analysis Expert',
    description: 'Deep analysis and critical thinking',
    prompt: `You are Claude, an analytical expert created by Anthropic.

Your strengths include:
- Critical thinking and logical reasoning
- Data analysis and interpretation
- Problem decomposition and synthesis
- Identifying patterns and insights
- Evaluating evidence and arguments
- Providing balanced perspectives

Guidelines:
- Break down complex problems systematically
- Consider multiple viewpoints and angles
- Support conclusions with clear reasoning
- Identify assumptions and limitations
- Suggest further areas for investigation
- Present findings in a structured, clear manner
- Use data and examples to support analysis`,
    category: 'analysis',
    maxTokens: 4000,
    temperature: 0.5,
  },

  concise: {
    id: 'concise',
    name: 'Concise Assistant',
    description: 'Brief, to-the-point responses',
    prompt: `You are Claude, created by Anthropic. Provide concise, direct responses.

Guidelines:
- Be brief and to the point
- Focus on essential information only
- Use bullet points when appropriate
- Avoid unnecessary elaboration
- Answer the specific question asked
- Provide additional details only if requested`,
    category: 'general',
    maxTokens: 2000,
    temperature: 0.7,
  },

  teaching: {
    id: 'teaching',
    name: 'Teaching Assistant',
    description: 'Educational and explanatory responses',
    prompt: `You are Claude, an educational assistant created by Anthropic.

Your teaching approach:
- Break down complex topics into simple concepts
- Use analogies and examples for clarity
- Encourage critical thinking and questions
- Adapt explanations to the learner's level
- Check for understanding and build progressively
- Provide practice problems or exercises when appropriate

Guidelines:
- Be patient and supportive
- Use the Socratic method when helpful
- Provide step-by-step explanations
- Connect new concepts to prior knowledge
- Highlight common misconceptions
- Encourage learning through discovery`,
    category: 'general',
    maxTokens: 4000,
    temperature: 0.7,
  },
};

/**
 * Get default system prompt
 * @returns Default system prompt string
 */
export function getDefaultSystemPrompt(): string {
  return DEFAULT_SYSTEM_PROMPT;
}

/**
 * Get system prompt configuration
 * @returns System prompt configuration
 */
export function getSystemPromptConfig(): SystemPromptConfig {
  return { ...DEFAULT_CONFIG };
}

/**
 * Get all available system prompt presets
 * @returns Array of system prompt presets
 */
export function getAvailablePresets(): SystemPromptPreset[] {
  return Object.values(SYSTEM_PROMPT_PRESETS);
}

/**
 * Get presets by category
 * @param category - Category to filter by
 * @returns Array of presets in the category
 */
export function getPresetsByCategory(
  category: SystemPromptPreset['category']
): SystemPromptPreset[] {
  return Object.values(SYSTEM_PROMPT_PRESETS).filter(
    preset => preset.category === category
  );
}

/**
 * Get a specific preset by ID
 * @param presetId - Preset ID
 * @returns System prompt preset or undefined
 */
export function getPreset(presetId: string): SystemPromptPreset | undefined {
  return SYSTEM_PROMPT_PRESETS[presetId];
}

/**
 * Get the default preset
 * @returns Default system prompt preset
 */
export function getDefaultPreset(): SystemPromptPreset {
  return SYSTEM_PROMPT_PRESETS['default']!;
}

/**
 * Estimate token count from text
 * Rough estimation: ~4 characters per token on average
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
function estimateTokenCount(text: string): number {
  // Claude uses a tokenizer similar to GPT, roughly 4 chars per token
  // This is a conservative estimate
  return Math.ceil(text.length / 4);
}

/**
 * Validate system prompt
 * Checks length, format, and content
 *
 * @param prompt - System prompt to validate
 * @param config - Optional custom configuration
 * @returns Validation result
 */
export function validateSystemPrompt(
  prompt: string | null | undefined,
  config: SystemPromptConfig = DEFAULT_CONFIG
): SystemPromptValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Handle null/undefined
  if (prompt === null || prompt === undefined) {
    if (!config.allowEmpty) {
      errors.push('System prompt cannot be empty');
    }
    return {
      isValid: config.allowEmpty,
      errors,
      warnings,
      characterCount: 0,
      estimatedTokens: 0,
    };
  }

  const characterCount = prompt.length;
  const estimatedTokens = estimateTokenCount(prompt);

  // Check empty string
  if (characterCount === 0) {
    if (!config.allowEmpty) {
      errors.push('System prompt cannot be empty');
    }
    return {
      isValid: config.allowEmpty,
      errors,
      warnings,
      characterCount: 0,
      estimatedTokens: 0,
    };
  }

  // Check minimum length
  if (characterCount < config.minLength) {
    errors.push(`System prompt must be at least ${config.minLength} characters (current: ${characterCount})`);
  }

  // Check maximum length
  if (characterCount > config.maxLength) {
    errors.push(`System prompt exceeds maximum length of ${config.maxLength} characters (current: ${characterCount})`);
  }

  // Check estimated tokens
  if (estimatedTokens > config.maxTokens) {
    errors.push(`System prompt exceeds estimated token limit of ${config.maxTokens} tokens (estimated: ${estimatedTokens})`);
  }

  // Warning for very long prompts
  if (estimatedTokens > config.maxTokens * 0.8) {
    warnings.push(`System prompt is approaching token limit (${estimatedTokens}/${config.maxTokens} estimated tokens)`);
  }

  // Warning for very short prompts
  if (characterCount < 50 && characterCount >= config.minLength) {
    warnings.push('System prompt is very short. Consider providing more context for better results.');
  }

  // Check for potentially problematic content
  const lowerPrompt = prompt.toLowerCase();

  // Check for jailbreak attempts (basic detection)
  const suspiciousPatterns = [
    'ignore previous instructions',
    'ignore all previous',
    'disregard previous',
    'forget everything',
    'new instructions',
  ];

  for (const pattern of suspiciousPatterns) {
    if (lowerPrompt.includes(pattern)) {
      warnings.push(`Prompt contains potentially problematic phrase: "${pattern}"`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    characterCount,
    estimatedTokens,
  };
}

/**
 * Sanitize system prompt
 * Cleans and normalizes the prompt
 *
 * @param prompt - System prompt to sanitize
 * @returns Sanitized prompt
 */
export function sanitizeSystemPrompt(prompt: string): string {
  if (!prompt) return '';

  return prompt
    .trim() // Remove leading/trailing whitespace
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines
}

/**
 * Select system prompt for a conversation
 * Returns the appropriate prompt based on conversation settings
 *
 * @param conversationPrompt - Custom prompt from conversation (if any)
 * @param presetId - Preset ID to use (if no custom prompt)
 * @param fallbackToDefault - Whether to fall back to default if nothing provided
 * @returns System prompt to use
 * @throws ClaudeServiceError if validation fails
 */
export function selectSystemPrompt(
  conversationPrompt?: string | null,
  presetId?: string,
  fallbackToDefault: boolean = true
): string | null {
  // Use custom conversation prompt if provided
  if (conversationPrompt) {
    const validation = validateSystemPrompt(conversationPrompt);
    if (!validation.isValid) {
      throw new ClaudeServiceError(
        ClaudeErrorType.VALIDATION,
        `Invalid system prompt: ${validation.errors.join(', ')}`,
        400,
        false,
        undefined,
        undefined,
        { validationErrors: validation.errors }
      );
    }
    return sanitizeSystemPrompt(conversationPrompt);
  }

  // Use preset if specified
  if (presetId) {
    const preset = getPreset(presetId);
    if (!preset) {
      throw new ClaudeServiceError(
        ClaudeErrorType.VALIDATION,
        `System prompt preset not found: ${presetId}`,
        404,
        false
      );
    }
    return preset.prompt;
  }

  // Fall back to default if enabled
  if (fallbackToDefault) {
    return DEFAULT_SYSTEM_PROMPT;
  }

  // No prompt
  return null;
}

/**
 * Create custom system prompt preset
 * Allows users to create their own presets
 *
 * @param preset - Preset to create
 * @returns Created preset with validation
 * @throws ClaudeServiceError if validation fails
 */
export function createCustomPreset(
  preset: Omit<SystemPromptPreset, 'id'> & { id?: string }
): SystemPromptPreset {
  // Validate the prompt
  const validation = validateSystemPrompt(preset.prompt);
  if (!validation.isValid) {
    throw new ClaudeServiceError(
      ClaudeErrorType.VALIDATION,
      `Invalid preset prompt: ${validation.errors.join(', ')}`,
      400,
      false,
      undefined,
      undefined,
      { validationErrors: validation.errors }
    );
  }

  // Generate ID if not provided
  const id = preset.id || `custom-${Date.now()}`;

  // Sanitize prompt
  const sanitizedPrompt = sanitizeSystemPrompt(preset.prompt);

  return {
    ...preset,
    id,
    prompt: sanitizedPrompt,
    category: preset.category || 'custom',
  };
}

/**
 * Print system prompt information
 * Utility for console output
 *
 * @param prompt - System prompt to print info about
 */
export function printSystemPromptInfo(prompt: string): void {
  const validation = validateSystemPrompt(prompt);

  console.log('\n' + '='.repeat(70));
  console.log('System Prompt Information');
  console.log('='.repeat(70));
  console.log(`Character Count: ${validation.characterCount}`);
  console.log(`Estimated Tokens: ${validation.estimatedTokens}`);
  console.log(`Valid: ${validation.isValid ? '✅ Yes' : '❌ No'}`);

  if (validation.errors.length > 0) {
    console.log('\n❌ Errors:');
    validation.errors.forEach(err => console.log(`  - ${err}`));
  }

  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    validation.warnings.forEach(warn => console.log(`  - ${warn}`));
  }

  console.log('\nPrompt Preview (first 200 chars):');
  console.log(prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''));
  console.log('='.repeat(70) + '\n');
}

/**
 * Print all available presets
 * Utility for console output
 */
export function printAvailablePresets(): void {
  const presets = getAvailablePresets();

  console.log('\n' + '='.repeat(70));
  console.log('Available System Prompt Presets');
  console.log('='.repeat(70));

  const categories: Record<string, SystemPromptPreset[]> = {};
  for (const preset of presets) {
    if (!categories[preset.category]) {
      categories[preset.category] = [];
    }
    const category = categories[preset.category];
    if (category) {
      category.push(preset);
    }
  }

  for (const [category, categoryPresets] of Object.entries(categories)) {
    console.log(`\n📁 ${category.toUpperCase()}:`);
    for (const preset of categoryPresets) {
      console.log(`\n  ${preset.isDefault ? '⭐' : '•'} ${preset.name} (${preset.id})`);
      console.log(`    ${preset.description}`);
      const validation = validateSystemPrompt(preset.prompt);
      console.log(`    Length: ${validation.characterCount} chars (~${validation.estimatedTokens} tokens)`);
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');
}
