/**
 * System Prompt Manager
 * Provider-agnostic system prompt management
 *
 * Features:
 * - Built-in preset library
 * - Custom preset creation
 * - Validation with errors/warnings
 * - Token estimation
 * - Sanitization
 */

import { ProviderError, ProviderErrorType } from '../../errors';
import {
  SystemPromptPreset,
  SystemPromptConfig,
  DEFAULT_SYSTEM_PROMPT_CONFIG,
} from './SystemPromptTypes';
import {
  SYSTEM_PROMPT_PRESETS,
  DEFAULT_SYSTEM_PROMPT,
  getAllPresets,
  getPresetsByCategory,
  getPreset,
  getDefaultPreset,
} from './SystemPromptPresets';
import {
  validateSystemPrompt,
  sanitizeSystemPrompt,
  estimateTokenCount,
  printSystemPromptInfo,
} from './SystemPromptValidator';

/**
 * System Prompt Manager
 * Manages system prompts with validation, presets, and customization
 */
export class SystemPromptManager {
  private config: SystemPromptConfig;
  private customPresets: Map<string, SystemPromptPreset> = new Map();

  /**
   * Create a new SystemPromptManager
   *
   * @param config - Optional custom configuration
   */
  constructor(config?: Partial<SystemPromptConfig>) {
    this.config = { ...DEFAULT_SYSTEM_PROMPT_CONFIG, ...config };
    console.log('SystemPromptManager initialized');
    console.log(`  Max length: ${this.config.maxLength} chars`);
    console.log(`  Max tokens: ${this.config.maxTokens} tokens`);
  }

  /**
   * Get default system prompt
   */
  public getDefaultPrompt(): string {
    return DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Get all available presets (built-in + custom)
   */
  public getAllPresets(): SystemPromptPreset[] {
    const builtIn = getAllPresets();
    const custom = Array.from(this.customPresets.values());
    return [...builtIn, ...custom];
  }

  /**
   * Get presets by category
   */
  public getPresetsByCategory(
    category: SystemPromptPreset['category']
  ): SystemPromptPreset[] {
    const builtIn = getPresetsByCategory(category);
    const custom = Array.from(this.customPresets.values()).filter(
      (p) => p.category === category
    );
    return [...builtIn, ...custom];
  }

  /**
   * Get a specific preset by ID
   * Checks custom presets first, then built-in
   */
  public getPreset(presetId: string): SystemPromptPreset | undefined {
    return this.customPresets.get(presetId) || getPreset(presetId);
  }

  /**
   * Get the default preset
   */
  public getDefaultPreset(): SystemPromptPreset {
    return getDefaultPreset();
  }

  /**
   * Validate a system prompt
   */
  public validate(prompt: string | null | undefined) {
    return validateSystemPrompt(prompt, this.config);
  }

  /**
   * Sanitize a system prompt
   */
  public sanitize(prompt: string): string {
    return sanitizeSystemPrompt(prompt);
  }

  /**
   * Estimate token count for a prompt
   */
  public estimateTokens(prompt: string): number {
    return estimateTokenCount(prompt);
  }

  /**
   * Print system prompt information
   */
  public printInfo(prompt: string): void {
    printSystemPromptInfo(prompt, this.config);
  }

  /**
   * Select system prompt for a conversation
   * Returns the appropriate prompt based on conversation settings
   *
   * Priority:
   * 1. Custom conversation prompt (if provided)
   * 2. Preset (if presetId provided)
   * 3. Default prompt (if fallbackToDefault is true)
   * 4. null (if no fallback)
   *
   * @param conversationPrompt - Custom prompt from conversation (if any)
   * @param presetId - Preset ID to use (if no custom prompt)
   * @param fallbackToDefault - Whether to fall back to default if nothing provided
   * @returns System prompt to use
   * @throws ProviderError if validation fails
   */
  public selectSystemPrompt(
    conversationPrompt?: string | null,
    presetId?: string,
    fallbackToDefault: boolean = true
  ): string | null {
    // Use custom conversation prompt if provided
    if (conversationPrompt) {
      const validation = this.validate(conversationPrompt);
      if (!validation.isValid) {
        throw new ProviderError(
          ProviderErrorType.VALIDATION,
          `Invalid system prompt: ${validation.errors.join(', ')}`,
          {
            retryable: false,
            statusCode: 400,
            context: { validationErrors: validation.errors },
          }
        );
      }
      return this.sanitize(conversationPrompt);
    }

    // Use preset if specified
    if (presetId) {
      const preset = this.getPreset(presetId);
      if (!preset) {
        throw new ProviderError(
          ProviderErrorType.VALIDATION,
          `System prompt preset not found: ${presetId}`,
          {
            retryable: false,
            statusCode: 404,
          }
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
   * Create a custom system prompt preset
   * Allows users to create their own presets
   *
   * @param preset - Preset to create (id is optional, will be generated if not provided)
   * @returns Created preset with validation
   * @throws ProviderError if validation fails
   */
  public createCustomPreset(
    preset: Omit<SystemPromptPreset, 'id'> & { id?: string }
  ): SystemPromptPreset {
    // Validate the prompt
    const validation = this.validate(preset.prompt);
    if (!validation.isValid) {
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        `Invalid preset prompt: ${validation.errors.join(', ')}`,
        {
          retryable: false,
          statusCode: 400,
          context: { validationErrors: validation.errors },
        }
      );
    }

    // Generate ID if not provided
    const id = preset.id || `custom-${Date.now()}`;

    // Check if ID already exists
    if (this.customPresets.has(id) || SYSTEM_PROMPT_PRESETS[id]) {
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        `Preset with ID "${id}" already exists`,
        {
          retryable: false,
          statusCode: 409,
        }
      );
    }

    // Sanitize prompt
    const sanitizedPrompt = this.sanitize(preset.prompt);

    // Create preset
    const newPreset: SystemPromptPreset = {
      ...preset,
      id,
      prompt: sanitizedPrompt,
      category: preset.category || 'custom',
    };

    // Store in custom presets
    this.customPresets.set(id, newPreset);

    console.log(`Custom preset "${id}" created`);

    return newPreset;
  }

  /**
   * Update a custom preset
   * Can only update custom presets, not built-in ones
   *
   * @param presetId - ID of preset to update
   * @param updates - Partial preset data to update
   * @throws ProviderError if preset not found or is built-in
   */
  public updateCustomPreset(
    presetId: string,
    updates: Partial<Omit<SystemPromptPreset, 'id'>>
  ): SystemPromptPreset {
    // Check if it's a custom preset
    const existing = this.customPresets.get(presetId);
    if (!existing) {
      if (SYSTEM_PROMPT_PRESETS[presetId]) {
        throw new ProviderError(
          ProviderErrorType.VALIDATION,
          `Cannot update built-in preset "${presetId}"`,
          {
            retryable: false,
            statusCode: 403,
          }
        );
      }
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        `Custom preset not found: ${presetId}`,
        {
          retryable: false,
          statusCode: 404,
        }
      );
    }

    // Merge updates
    const updated = { ...existing, ...updates };

    // Validate prompt if it was updated
    if (updates.prompt) {
      const validation = this.validate(updates.prompt);
      if (!validation.isValid) {
        throw new ProviderError(
          ProviderErrorType.VALIDATION,
          `Invalid preset prompt: ${validation.errors.join(', ')}`,
          {
            retryable: false,
            statusCode: 400,
            context: { validationErrors: validation.errors },
          }
        );
      }
      updated.prompt = this.sanitize(updates.prompt);
    }

    // Update in map
    this.customPresets.set(presetId, updated);

    console.log(`Custom preset "${presetId}" updated`);

    return updated;
  }

  /**
   * Delete a custom preset
   * Can only delete custom presets, not built-in ones
   *
   * @param presetId - ID of preset to delete
   * @returns True if deleted, false if not found
   * @throws ProviderError if trying to delete built-in preset
   */
  public deleteCustomPreset(presetId: string): boolean {
    // Check if it's a built-in preset
    if (SYSTEM_PROMPT_PRESETS[presetId]) {
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        `Cannot delete built-in preset "${presetId}"`,
        {
          retryable: false,
          statusCode: 403,
        }
      );
    }

    const deleted = this.customPresets.delete(presetId);
    if (deleted) {
      console.log(`Custom preset "${presetId}" deleted`);
    }
    return deleted;
  }

  /**
   * Get all custom presets
   */
  public getCustomPresets(): SystemPromptPreset[] {
    return Array.from(this.customPresets.values());
  }

  /**
   * Clear all custom presets
   */
  public clearCustomPresets(): void {
    this.customPresets.clear();
    console.log('All custom presets cleared');
  }

  /**
   * Get configuration
   */
  public getConfig(): SystemPromptConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<SystemPromptConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('SystemPromptManager configuration updated');
  }

  /**
   * Print all available presets
   */
  public printAvailablePresets(): void {
    const presets = this.getAllPresets();

    console.log('\n' + '='.repeat(70));
    console.log('Available System Prompt Presets');
    console.log('='.repeat(70));

    const categories: Record<string, SystemPromptPreset[]> = {};
    for (const preset of presets) {
      if (!categories[preset.category]) {
        categories[preset.category] = [];
      }
      categories[preset.category]!.push(preset);
    }

    for (const [category, categoryPresets] of Object.entries(categories)) {
      console.log(`\n📁 ${category.toUpperCase()}:`);
      for (const preset of categoryPresets) {
        const isCustom = this.customPresets.has(preset.id);
        const icon = preset.isDefault ? '⭐' : isCustom ? '🔧' : '•';
        console.log(`\n  ${icon} ${preset.name} (${preset.id})`);
        console.log(`    ${preset.description}`);
        const validation = this.validate(preset.prompt);
        console.log(
          `    Length: ${validation.characterCount} chars (~${validation.estimatedTokens} tokens)`
        );
      }
    }

    console.log('\n' + '='.repeat(70) + '\n');
  }
}
