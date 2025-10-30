# Claude Service

AI service integration for Anthropic's Claude API.

## Overview

The Claude Service provides a clean abstraction layer for interacting with Anthropic's Claude API. It handles initialization, configuration, error handling, and will support streaming responses, token tracking, and cost calculation.

## Directory Structure

```
claude/
├── ClaudeService.ts      # Main service class with SDK initialization
├── config.ts             # Configuration loading and validation
├── types.ts              # TypeScript interfaces and types
├── models.ts             # Model definitions, pricing, and utilities (VBT-156)
├── index.ts              # Module exports
├── test-connection.ts    # Connection test script
├── test-models.ts        # Multi-model support test script (VBT-156)
└── README.md            # This file
```

## Setup

### 1. Install Dependencies

The `@anthropic-ai/sdk` package is already installed in the project.

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Claude API Configuration
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-api-key-here
CLAUDE_DEFAULT_MODEL=claude-sonnet-4-5-20250929
CLAUDE_MAX_TOKENS=4096
CLAUDE_TIMEOUT=600000
CLAUDE_MAX_RETRIES=2
```

**Get your API key from**: https://console.anthropic.com/

### 3. Test Connection

Run the connection test to verify your setup:

```bash
npm run test:claude
```

This will:
- Initialize the Claude service
- Load and validate configuration
- Make a test API call
- Display results and troubleshooting tips if needed

## Usage

### Basic Initialization

```typescript
import { getClaudeService } from './services/ai/claude';

// Get singleton instance
const claudeService = getClaudeService();

// Check if initialized
if (claudeService.isInitialized()) {
  console.log('Claude service ready!');
}
```

### Test Connection

```typescript
try {
  const success = await claudeService.testConnection();
  console.log('Connection successful!');
} catch (error) {
  if (error instanceof ClaudeServiceError) {
    console.error('Error type:', error.type);
    console.error('Message:', error.message);
  }
}
```

### Configuration

```typescript
// Get current configuration
const config = claudeService.getConfig();
console.log('Default model:', config.defaultModel);
console.log('Max tokens:', config.maxTokens);

// Update configuration (if needed)
claudeService.updateConfig({
  maxTokens: 8192,
  temperature: 0.7
});
```

### Multi-Model Support (VBT-156) ✅

```typescript
import { ClaudeModel } from './services/ai/claude';

// Get available models
const models = claudeService.getAvailableModels();
models.forEach(model => {
  console.log(`${model.name}: ${model.description}`);
});

// Get current default model
const currentModel = claudeService.getDefaultModel();
console.log('Current model:', currentModel);

// Switch to a different model
claudeService.setDefaultModel(ClaudeModel.HAIKU_4);
console.log('Switched to Haiku 4');

// Validate a model
const isValid = claudeService.isModelValid(ClaudeModel.OPUS_4);
console.log('Opus 4 valid:', isValid);

// Get model information
const modelInfo = claudeService.getModelInfo(ClaudeModel.SONNET_4_5);
console.log('Max tokens:', modelInfo?.maxTokens);
console.log('Context window:', modelInfo?.contextWindow);
console.log('Input cost:', modelInfo?.pricing.input);

// Select model for a specific request
const model = claudeService.selectModel(ClaudeModel.HAIKU_4); // or use default
console.log('Using model:', model);
```

### Cost Calculation (VBT-156) ✅

```typescript
import { calculateCost, ClaudeModel } from './services/ai/claude';

// Calculate cost for a request
const inputTokens = 10000;
const outputTokens = 5000;

const cost = calculateCost(
  ClaudeModel.SONNET_4_5,
  inputTokens,
  outputTokens
);

console.log(`Cost: $${cost?.toFixed(4)}`);

// Compare costs across models
[ClaudeModel.HAIKU_4, ClaudeModel.SONNET_4_5, ClaudeModel.OPUS_4].forEach(model => {
  const cost = calculateCost(model, inputTokens, outputTokens);
  console.log(`${model}: $${cost?.toFixed(4)}`);
});
```

## Development Status

### VBT-154: Install and Setup Claude TypeScript SDK ✅ COMPLETE
- [x] Install @anthropic-ai/sdk package
- [x] Add Claude API key to environment variables
- [x] Create configuration file for SDK settings
- [x] Verify SDK installation and connection

### VBT-155: Create Claude Service Layer and Configuration ✅ COMPLETE
- [x] ClaudeService class structure
- [x] Service initialization
- [x] Configuration management (timeouts, retries, etc.)
- [x] TypeScript interfaces for requests/responses
- [x] Service singleton pattern

### VBT-156: Implement Multi-Model Support ✅ COMPLETE
- [x] Define model enum/constants (Sonnet, Opus, Haiku)
- [x] Implement model selection logic
- [x] Add model-specific configuration (token limits, costs)
- [x] Create model validation
- [x] Add model switching capability
- [x] Cost calculation utilities

### Upcoming Tasks

- **VBT-157**: Implement Streaming Response Handler
- **VBT-158**: Add Token Counting and Usage Tracking
- **VBT-159**: Implement Rate Limit Detection and Handling
- **VBT-160**: Add Comprehensive Error Handling and Retry Logic
- **VBT-161**: Implement Cost Tracking System
- **VBT-162**: Add System Prompt Support
- **VBT-163**: Integration Testing with WebSocket Server

## Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | *required* | Your Claude API key (starts with sk-ant-) |
| `CLAUDE_DEFAULT_MODEL` | `claude-sonnet-4-5-20250929` | Default Claude model to use |
| `CLAUDE_MAX_TOKENS` | `4096` | Maximum tokens to generate |
| `CLAUDE_TIMEOUT` | `600000` | Request timeout in milliseconds (10 min) |
| `CLAUDE_MAX_RETRIES` | `2` | Maximum number of retry attempts |

## Available Models (VBT-156) ✅

### Claude 4.5 Sonnet ⭐ RECOMMENDED
- **ID**: `claude-sonnet-4-5-20250929`
- **Tier**: Standard (Balanced)
- **Context**: 200,000 tokens
- **Max Output**: 8,192 tokens
- **Pricing**: $3/1M input, $15/1M output
- **Features**: Vision ✅ | Tools ✅ | Caching ✅
- **Best for**: General-purpose, production workloads

### Claude 3.5 Sonnet
- **ID**: `claude-3-5-sonnet-20241022`
- **Tier**: Standard
- **Context**: 200,000 tokens
- **Max Output**: 8,192 tokens
- **Pricing**: $3/1M input, $15/1M output
- **Features**: Vision ✅ | Tools ✅ | Caching ✅
- **Best for**: Previous generation, still capable

### Claude 4 Opus
- **ID**: `claude-opus-4-20250514`
- **Tier**: Premium (High Performance)
- **Context**: 200,000 tokens
- **Max Output**: 8,192 tokens
- **Pricing**: $15/1M input, $75/1M output
- **Features**: Vision ✅ | Tools ✅ | Caching ✅
- **Best for**: Complex tasks requiring deep reasoning

### Claude 4 Haiku
- **ID**: `claude-haiku-4-20250228`
- **Tier**: Economy (Cost-Effective)
- **Context**: 200,000 tokens
- **Max Output**: 8,192 tokens
- **Pricing**: $0.80/1M input, $4/1M output
- **Features**: Vision ✅ | Tools ✅ | Caching ✅
- **Best for**: Simple tasks, high-volume, speed-critical

## Error Handling

The service uses typed errors with `ClaudeServiceError`:

```typescript
enum ClaudeErrorType {
  AUTHENTICATION,    // Invalid API key
  INVALID_REQUEST,   // Bad request parameters
  RATE_LIMIT,       // Rate limit exceeded
  BILLING,          // Billing/payment issues
  OVERLOADED,       // Service overloaded
  TIMEOUT,          // Request timeout
  NETWORK,          // Network connectivity
  INTERNAL,         // Internal API error
  UNKNOWN           // Unknown error
}
```

## Testing

### Connection Test

Test the Claude API connection:
```bash
npm run test:claude
```

### Multi-Model Support Test (VBT-156)

Test model selection, validation, and cost calculation:
```bash
npm run test:claude:models
```

This test verifies:
- ✅ All 4 models are available (Sonnet 4.5/3.5, Opus 4, Haiku 4)
- ✅ Model information retrieval
- ✅ Model validation (valid and invalid cases)
- ✅ Model switching capability
- ✅ Cost calculation for different models
- ✅ Per-request model selection

Expected output:
```
============================================================
Claude Multi-Model Support Test - VBT-156
============================================================

Step 1: Initializing Claude Service...
✅ Service initialized

Step 2: Available Models
------------------------------------------------------------

📦 Claude 4.5 Sonnet
   ID: claude-sonnet-4-5-20250929
   Family: SONNET | Tier: STANDARD
   Description: Latest balanced model with excellent performance and cost efficiency
   Context Window: 200,000 tokens
   Max Output: 8,192 tokens
   Pricing:
     - Input: $3 per 1M tokens
     - Output: $15 per 1M tokens
     - Cached: $0.3 per 1M tokens
   Features:
     - Vision: ✅
     - Tools: ✅
     - Caching: ✅
   ⭐ RECOMMENDED

[... additional models ...]

============================================================
✅ ALL TESTS PASSED!
Multi-model support is working correctly:
  - ✅ 4 models available (Sonnet 4.5/3.5, Opus 4, Haiku 4)
  - ✅ Model validation working
  - ✅ Model switching working
  - ✅ Cost calculation working
  - ✅ Per-request model selection working
============================================================
```

## Troubleshooting

### Authentication Error
- Verify `ANTHROPIC_API_KEY` is set in `.env`
- Ensure API key format: `sk-ant-api03-...`
- Get your key from: https://console.anthropic.com/

### Rate Limit Error
- Wait a few minutes and retry
- Check your API usage limits
- Consider upgrading your API plan

### Network Error
- Check internet connection
- Verify firewall/proxy settings
- Try again after a moment

## Links

- [Anthropic Console](https://console.anthropic.com/)
- [Claude API Documentation](https://docs.anthropic.com/)
- [TypeScript SDK GitHub](https://github.com/anthropics/anthropic-sdk-typescript)
- [API Pricing](https://www.anthropic.com/pricing)

## License

ISC © Carlos Grillo
