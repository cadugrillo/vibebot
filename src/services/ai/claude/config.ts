/**
 * Claude API Configuration
 * Manages environment variables and configuration for Claude SDK
 */

/**
 * Claude configuration interface
 */
export interface ClaudeConfig {
  apiKey: string;
  defaultModel: string;
  maxTokens: number;
  timeout: number;
  maxRetries: number;
}

/**
 * Load and validate Claude configuration from environment variables
 * @throws Error if required configuration is missing
 */
export function loadClaudeConfig(): ClaudeConfig {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set in environment variables. ' +
      'Please add your Claude API key to .env file.'
    );
  }

  // Validate API key format (basic check)
  if (!apiKey.startsWith('sk-ant-')) {
    console.warn(
      'WARNING: ANTHROPIC_API_KEY does not appear to be in the correct format. ' +
      'Expected format: sk-ant-...'
    );
  }

  return {
    apiKey,
    defaultModel: process.env.CLAUDE_DEFAULT_MODEL || 'claude-sonnet-4-5-20250929',
    maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4096', 10),
    timeout: parseInt(process.env.CLAUDE_TIMEOUT || '600000', 10), // 10 minutes
    maxRetries: parseInt(process.env.CLAUDE_MAX_RETRIES || '2', 10),
  };
}

/**
 * Validate configuration values
 */
export function validateClaudeConfig(config: ClaudeConfig): boolean {
  if (!config.apiKey) {
    throw new Error('Claude API key is required');
  }

  if (config.maxTokens < 1 || config.maxTokens > 200000) {
    throw new Error('maxTokens must be between 1 and 200000');
  }

  if (config.timeout < 1000 || config.timeout > 3600000) {
    throw new Error('timeout must be between 1000ms (1s) and 3600000ms (1h)');
  }

  if (config.maxRetries < 0 || config.maxRetries > 10) {
    throw new Error('maxRetries must be between 0 and 10');
  }

  return true;
}

/**
 * Get Claude configuration with validation
 */
export function getClaudeConfig(): ClaudeConfig {
  const config = loadClaudeConfig();
  validateClaudeConfig(config);
  return config;
}
