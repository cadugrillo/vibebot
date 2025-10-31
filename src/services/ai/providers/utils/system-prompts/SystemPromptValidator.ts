/**
 * System Prompt Validator
 * Validation logic for system prompts
 */

import {
  SystemPromptValidation,
  SystemPromptConfig,
  DEFAULT_SYSTEM_PROMPT_CONFIG,
} from './SystemPromptTypes';

/**
 * Estimate token count from text
 * Rough estimation: ~4 characters per token on average
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  // AI models use tokenizers similar to GPT, roughly 4 chars per token
  // This is a conservative estimate
  return Math.ceil(text.length / 4);
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
 * Validate system prompt
 * Checks length, format, and content
 *
 * @param prompt - System prompt to validate
 * @param config - Optional custom configuration
 * @returns Validation result
 */
export function validateSystemPrompt(
  prompt: string | null | undefined,
  config: SystemPromptConfig = DEFAULT_SYSTEM_PROMPT_CONFIG
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
    errors.push(
      `System prompt must be at least ${config.minLength} characters (current: ${characterCount})`
    );
  }

  // Check maximum length
  if (characterCount > config.maxLength) {
    errors.push(
      `System prompt exceeds maximum length of ${config.maxLength} characters (current: ${characterCount})`
    );
  }

  // Check estimated tokens
  if (estimatedTokens > config.maxTokens) {
    errors.push(
      `System prompt exceeds estimated token limit of ${config.maxTokens} tokens (estimated: ${estimatedTokens})`
    );
  }

  // Warning for very long prompts
  if (estimatedTokens > config.maxTokens * 0.8) {
    warnings.push(
      `System prompt is approaching token limit (${estimatedTokens}/${config.maxTokens} estimated tokens)`
    );
  }

  // Warning for very short prompts
  if (characterCount < 50 && characterCount >= config.minLength) {
    warnings.push(
      'System prompt is very short. Consider providing more context for better results.'
    );
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
    'override',
    'bypass',
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
 * Print system prompt information
 * Utility for console output
 *
 * @param prompt - System prompt to print info about
 * @param config - Optional configuration
 */
export function printSystemPromptInfo(
  prompt: string,
  config?: SystemPromptConfig
): void {
  const validation = validateSystemPrompt(prompt, config);

  console.log('\n' + '='.repeat(70));
  console.log('System Prompt Information');
  console.log('='.repeat(70));
  console.log(`Character Count: ${validation.characterCount}`);
  console.log(`Estimated Tokens: ${validation.estimatedTokens}`);
  console.log(`Valid: ${validation.isValid ? '✅ Yes' : '❌ No'}`);

  if (validation.errors.length > 0) {
    console.log('\n❌ Errors:');
    validation.errors.forEach((err) => console.log(`  - ${err}`));
  }

  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    validation.warnings.forEach((warn) => console.log(`  - ${warn}`));
  }

  console.log('\nPrompt Preview (first 200 chars):');
  console.log(prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''));
  console.log('='.repeat(70) + '\n');
}
