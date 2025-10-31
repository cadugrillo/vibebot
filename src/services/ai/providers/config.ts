/**
 * Provider Configuration Manager
 * VBT-170: Centralized configuration management for AI providers
 *
 * Handles loading, validation, and management of provider configurations
 * from environment variables with default presets.
 */

import { ProviderType, ProviderConfig } from './types';
import { ProviderError, ProviderErrorType } from './errors';
import { ClaudeModel } from './claude';

/**
 * Configuration source
 */
export enum ConfigSource {
  ENVIRONMENT = 'ENVIRONMENT',
  FILE = 'FILE',
  MANUAL = 'MANUAL',
}

/**
 * Provider configuration with metadata
 */
export interface ProviderConfigWithMetadata extends ProviderConfig {
  source: ConfigSource;
  loadedAt: Date;
  validated: boolean;
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Environment variable mapping for a provider
 */
interface ProviderEnvMapping {
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
  maxTokens: string;
  timeout: string;
  maxRetries: string;
  organizationId?: string;
}

/**
 * Default configurations for each provider
 */
const DEFAULT_CONFIGS: Record<ProviderType, Partial<ProviderConfig>> = {
  [ProviderType.CLAUDE]: {
    provider: ProviderType.CLAUDE,
    defaultModel: ClaudeModel.SONNET_4_5,
    maxTokens: 4096,
    timeout: 600000, // 10 minutes
    maxRetries: 2,
  },
  [ProviderType.OPENAI]: {
    provider: ProviderType.OPENAI,
    defaultModel: 'gpt-4-turbo',
    maxTokens: 4096,
    timeout: 600000, // 10 minutes
    maxRetries: 2,
  },
};

/**
 * Environment variable mappings for each provider
 */
const ENV_MAPPINGS: Record<ProviderType, ProviderEnvMapping> = {
  [ProviderType.CLAUDE]: {
    apiKey: 'ANTHROPIC_API_KEY',
    baseUrl: 'ANTHROPIC_BASE_URL',
    defaultModel: 'CLAUDE_DEFAULT_MODEL',
    maxTokens: 'CLAUDE_MAX_TOKENS',
    timeout: 'CLAUDE_TIMEOUT',
    maxRetries: 'CLAUDE_MAX_RETRIES',
  },
  [ProviderType.OPENAI]: {
    apiKey: 'OPENAI_API_KEY',
    baseUrl: 'OPENAI_BASE_URL',
    defaultModel: 'OPENAI_DEFAULT_MODEL',
    maxTokens: 'OPENAI_MAX_TOKENS',
    timeout: 'OPENAI_TIMEOUT',
    maxRetries: 'OPENAI_MAX_RETRIES',
    organizationId: 'OPENAI_ORG_ID',
  },
};

/**
 * Provider Configuration Manager
 *
 * Centralized configuration management for all AI providers.
 * Loads configurations from environment variables, validates them,
 * and provides default presets.
 */
export class ProviderConfigManager {
  private static instance: ProviderConfigManager | null = null;
  private configs: Map<ProviderType, ProviderConfigWithMetadata> = new Map();

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    console.log('ProviderConfigManager initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ProviderConfigManager {
    if (!ProviderConfigManager.instance) {
      ProviderConfigManager.instance = new ProviderConfigManager();
    }
    return ProviderConfigManager.instance;
  }

  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    ProviderConfigManager.instance = null;
  }

  /**
   * Load configuration for a provider from environment variables
   *
   * @param providerType - Provider to load config for
   * @returns Loaded configuration
   * @throws ProviderError if required environment variables are missing
   */
  public loadFromEnv(providerType: ProviderType): ProviderConfig {
    const mapping = ENV_MAPPINGS[providerType];
    const defaults = DEFAULT_CONFIGS[providerType];

    if (!mapping) {
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        `No environment mapping defined for provider: ${providerType}`,
        { retryable: false }
      );
    }

    // Load API key (required)
    const apiKey = process.env[mapping.apiKey];
    if (!apiKey || apiKey.trim() === '') {
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        `Missing required environment variable: ${mapping.apiKey}`,
        { retryable: false }
      );
    }

    // Build configuration
    const config: ProviderConfig = {
      provider: providerType,
      apiKey: apiKey.trim(),
      defaultModel: this.getEnvValue(mapping.defaultModel, defaults.defaultModel!),
      maxTokens: this.getEnvNumber(mapping.maxTokens, defaults.maxTokens!),
      timeout: this.getEnvNumber(mapping.timeout, defaults.timeout!),
      maxRetries: this.getEnvNumber(mapping.maxRetries, defaults.maxRetries!),
    };

    // Add optional fields
    if (mapping.baseUrl) {
      const baseUrl = process.env[mapping.baseUrl];
      if (baseUrl) {
        config.baseUrl = baseUrl.trim();
      }
    }

    if (mapping.organizationId) {
      const orgId = process.env[mapping.organizationId];
      if (orgId) {
        config.organizationId = orgId.trim();
      }
    }

    // Validate configuration
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        `Invalid configuration for ${providerType}: ${validation.errors.join(', ')}`,
        { retryable: false }
      );
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn(`Configuration warnings for ${providerType}:`);
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    // Store configuration with metadata
    const configWithMetadata: ProviderConfigWithMetadata = {
      ...config,
      source: ConfigSource.ENVIRONMENT,
      loadedAt: new Date(),
      validated: true,
    };

    this.configs.set(providerType, configWithMetadata);

    console.log(`Configuration loaded for ${providerType} from environment variables`);

    return config;
  }

  /**
   * Get configuration for a provider
   *
   * Loads from cache if available, otherwise loads from environment
   *
   * @param providerType - Provider type
   * @param forceReload - Force reload from environment
   * @returns Provider configuration
   */
  public getConfig(providerType: ProviderType, forceReload: boolean = false): ProviderConfig {
    if (!forceReload && this.configs.has(providerType)) {
      const cached = this.configs.get(providerType)!;
      console.log(`Returning cached configuration for ${providerType}`);
      return cached;
    }

    return this.loadFromEnv(providerType);
  }

  /**
   * Set configuration manually
   *
   * @param providerType - Provider type
   * @param config - Configuration to set
   */
  public setConfig(providerType: ProviderType, config: ProviderConfig): void {
    // Validate configuration
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new ProviderError(
        ProviderErrorType.VALIDATION,
        `Invalid configuration: ${validation.errors.join(', ')}`,
        { retryable: false }
      );
    }

    // Store configuration with metadata
    const configWithMetadata: ProviderConfigWithMetadata = {
      ...config,
      source: ConfigSource.MANUAL,
      loadedAt: new Date(),
      validated: true,
    };

    this.configs.set(providerType, configWithMetadata);

    console.log(`Configuration set manually for ${providerType}`);
  }

  /**
   * Check if configuration is loaded for a provider
   */
  public hasConfig(providerType: ProviderType): boolean {
    return this.configs.has(providerType);
  }

  /**
   * Get all loaded configurations
   */
  public getAllConfigs(): Map<ProviderType, ProviderConfigWithMetadata> {
    return new Map(this.configs);
  }

  /**
   * Clear configuration for a provider
   */
  public clearConfig(providerType: ProviderType): void {
    this.configs.delete(providerType);
    console.log(`Configuration cleared for ${providerType}`);
  }

  /**
   * Clear all configurations
   */
  public clearAll(): void {
    this.configs.clear();
    console.log('All configurations cleared');
  }

  /**
   * Get default configuration for a provider
   */
  public getDefaultConfig(providerType: ProviderType): Partial<ProviderConfig> {
    return { ...DEFAULT_CONFIGS[providerType] };
  }

  /**
   * Validate configuration
   *
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfig(config: ProviderConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate provider type
    if (!config.provider) {
      errors.push('provider is required');
    } else if (!Object.values(ProviderType).includes(config.provider)) {
      errors.push(`invalid provider type: ${config.provider}`);
    }

    // Validate API key
    if (!config.apiKey || config.apiKey.trim() === '') {
      errors.push('apiKey is required');
    } else if (config.apiKey.length < 10) {
      warnings.push('apiKey seems unusually short');
    }

    // Provider-specific API key format validation
    if (config.provider === ProviderType.CLAUDE) {
      if (!config.apiKey.startsWith('sk-ant-')) {
        warnings.push('Claude API key should start with "sk-ant-"');
      }
    } else if (config.provider === ProviderType.OPENAI) {
      if (!config.apiKey.startsWith('sk-')) {
        warnings.push('OpenAI API key should start with "sk-"');
      }
    }

    // Validate default model
    if (!config.defaultModel || config.defaultModel.trim() === '') {
      errors.push('defaultModel is required');
    }

    // Validate maxTokens
    if (config.maxTokens === undefined || config.maxTokens === null) {
      errors.push('maxTokens is required');
    } else if (config.maxTokens <= 0) {
      errors.push('maxTokens must be greater than 0');
    } else if (config.maxTokens > 200000) {
      warnings.push('maxTokens exceeds typical model limits');
    }

    // Validate timeout
    if (config.timeout === undefined || config.timeout === null) {
      errors.push('timeout is required');
    } else if (config.timeout <= 0) {
      errors.push('timeout must be greater than 0');
    } else if (config.timeout < 1000) {
      warnings.push('timeout is less than 1 second, which may be too short');
    } else if (config.timeout > 3600000) {
      warnings.push('timeout exceeds 1 hour, which may be too long');
    }

    // Validate maxRetries
    if (config.maxRetries === undefined || config.maxRetries === null) {
      errors.push('maxRetries is required');
    } else if (config.maxRetries < 0) {
      errors.push('maxRetries must be 0 or greater');
    } else if (config.maxRetries > 10) {
      warnings.push('maxRetries exceeds 10, which may cause long delays');
    }

    // Validate baseUrl (if provided)
    if (config.baseUrl) {
      try {
        new URL(config.baseUrl);
      } catch {
        errors.push('baseUrl is not a valid URL');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get environment variable value with fallback to default
   */
  private getEnvValue(envVar: string, defaultValue: string): string {
    const value = process.env[envVar];
    return value && value.trim() !== '' ? value.trim() : defaultValue;
  }

  /**
   * Get environment variable as number with fallback to default
   */
  private getEnvNumber(envVar: string, defaultValue: number): number {
    const value = process.env[envVar];
    if (!value || value.trim() === '') {
      return defaultValue;
    }

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      console.warn(`Invalid number in environment variable ${envVar}: ${value}, using default: ${defaultValue}`);
      return defaultValue;
    }

    return parsed;
  }

  /**
   * Get configuration summary for logging/debugging
   */
  public getConfigSummary(providerType: ProviderType): string | null {
    const config = this.configs.get(providerType);
    if (!config) {
      return null;
    }

    const maskedApiKey = this.maskApiKey(config.apiKey);

    return `${providerType} Configuration:
  Source: ${config.source}
  Loaded: ${config.loadedAt.toISOString()}
  API Key: ${maskedApiKey}
  Model: ${config.defaultModel}
  Max Tokens: ${config.maxTokens}
  Timeout: ${config.timeout}ms
  Max Retries: ${config.maxRetries}
  ${config.baseUrl ? `Base URL: ${config.baseUrl}` : ''}
  ${config.organizationId ? `Org ID: ${config.organizationId}` : ''}`;
  }

  /**
   * Mask API key for display
   */
  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return '***';
    }
    return `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`;
  }
}

/**
 * Get singleton instance of ProviderConfigManager
 */
export function getConfigManager(): ProviderConfigManager {
  return ProviderConfigManager.getInstance();
}

/**
 * Reset config manager (for testing)
 */
export function resetConfigManager(): void {
  ProviderConfigManager.resetInstance();
}
