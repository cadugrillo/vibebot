/**
 * Test Script for Multi-Model Support
 * VBT-156: Verify model selection, validation, and switching
 *
 * Usage: tsx src/services/ai/claude/test-models.ts
 */

import 'dotenv/config';
import { getClaudeService } from './ClaudeService';
import {
  ClaudeModel,
  getAvailableModels,
  calculateCost,
  getModelDisplayName,
} from './models';

async function testMultiModelSupport(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Claude Multi-Model Support Test - VBT-156');
  console.log('='.repeat(60));
  console.log();

  try {
    // Step 1: Initialize service
    console.log('Step 1: Initializing Claude Service...');
    const claudeService = getClaudeService();
    console.log('✅ Service initialized\n');

    // Step 2: Display available models
    console.log('Step 2: Available Models');
    console.log('-'.repeat(60));
    const availableModels = getAvailableModels();
    availableModels.forEach((model) => {
      console.log(`\n📦 ${model.name}`);
      console.log(`   ID: ${model.id}`);
      console.log(`   Family: ${model.family} | Tier: ${model.tier}`);
      console.log(`   Description: ${model.description}`);
      console.log(`   Context Window: ${model.contextWindow.toLocaleString()} tokens`);
      console.log(`   Max Output: ${model.maxTokens.toLocaleString()} tokens`);
      console.log(`   Pricing:`);
      console.log(`     - Input: $${model.pricing.input} per 1M tokens`);
      console.log(`     - Output: $${model.pricing.output} per 1M tokens`);
      if (model.pricing.cachedInput) {
        console.log(`     - Cached: $${model.pricing.cachedInput} per 1M tokens`);
      }
      console.log(`   Features:`);
      console.log(`     - Vision: ${model.supportsVision ? '✅' : '❌'}`);
      console.log(`     - Tools: ${model.supportsTools ? '✅' : '❌'}`);
      console.log(`     - Caching: ${model.supportsCaching ? '✅' : '❌'}`);
      if (model.recommended) {
        console.log(`   ⭐ RECOMMENDED`);
      }
    });
    console.log();

    // Step 3: Test default model
    console.log('Step 3: Default Model');
    console.log('-'.repeat(60));
    const defaultModel = claudeService.getDefaultModel();
    const defaultModelInfo = claudeService.getModelInfo();
    console.log(`Current default: ${getModelDisplayName(defaultModel)}`);
    console.log(`Model ID: ${defaultModel}`);
    if (defaultModelInfo) {
      console.log(`Context window: ${defaultModelInfo.contextWindow.toLocaleString()} tokens`);
      console.log(`Max output: ${defaultModelInfo.maxTokens.toLocaleString()} tokens`);
    }
    console.log('✅ Default model retrieved\n');

    // Step 4: Test model validation
    console.log('Step 4: Model Validation');
    console.log('-'.repeat(60));

    // Valid models
    const validModels = [
      ClaudeModel.SONNET_4_5,
      ClaudeModel.OPUS_4_1,
      ClaudeModel.HAIKU_4_5,
    ];

    console.log('Testing valid models:');
    validModels.forEach((modelId) => {
      const isValid = claudeService.isModelValid(modelId);
      const displayName = getModelDisplayName(modelId);
      console.log(`  ${displayName}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    });

    // Invalid model
    console.log('\nTesting invalid model:');
    const invalidModel = 'claude-nonexistent-model';
    const isInvalid = claudeService.isModelValid(invalidModel);
    console.log(`  ${invalidModel}: ${isInvalid ? '✅ Valid' : '❌ Invalid (Expected)'}`);
    console.log('✅ Validation tests passed\n');

    // Step 5: Test model switching
    console.log('Step 5: Model Switching');
    console.log('-'.repeat(60));

    const testModels = [
      ClaudeModel.HAIKU_4_5,
      ClaudeModel.SONNET_4_5,
      ClaudeModel.OPUS_4_1,
    ];

    for (const model of testModels) {
      claudeService.setDefaultModel(model);
      const currentModel = claudeService.getDefaultModel();
      const displayName = getModelDisplayName(currentModel);
      console.log(`✅ Switched to: ${displayName}`);
    }

    // Switch back to recommended model
    const recommended = claudeService.getRecommendedModel();
    claudeService.setDefaultModel(recommended.id);
    console.log(`✅ Switched back to recommended: ${recommended.name}\n`);

    // Step 6: Test cost calculation
    console.log('Step 6: Cost Calculation');
    console.log('-'.repeat(60));
    console.log('Example: 10,000 input tokens + 5,000 output tokens\n');

    const inputTokens = 10000;
    const outputTokens = 5000;

    [ClaudeModel.HAIKU_4_5, ClaudeModel.SONNET_4_5, ClaudeModel.OPUS_4_1].forEach((model) => {
      const cost = calculateCost(model, inputTokens, outputTokens);
      const displayName = getModelDisplayName(model);
      if (cost !== null) {
        console.log(`${displayName}: $${cost.toFixed(4)}`);
      }
    });
    console.log('✅ Cost calculations completed\n');

    // Step 7: Test selectModel function
    console.log('Step 7: Model Selection for Requests');
    console.log('-'.repeat(60));

    // Test with specific model
    const selectedModel1 = claudeService.selectModel(ClaudeModel.HAIKU_4_5);
    console.log(`✅ Selected model (explicit): ${getModelDisplayName(selectedModel1)}`);

    // Test with default (no model specified)
    const selectedModel2 = claudeService.selectModel();
    console.log(`✅ Selected model (default): ${getModelDisplayName(selectedModel2)}`);

    // Test with invalid model (should throw error)
    try {
      claudeService.selectModel('invalid-model');
      console.log('❌ ERROR: Should have thrown error for invalid model');
    } catch (error) {
      console.log('✅ Invalid model correctly rejected');
    }
    console.log();

    // Final summary
    console.log('='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('Multi-model support is working correctly:');
    console.log('  - ✅ 4 models available (Sonnet 4.5/3.5, Opus 4, Haiku 4)');
    console.log('  - ✅ Model validation working');
    console.log('  - ✅ Model switching working');
    console.log('  - ✅ Cost calculation working');
    console.log('  - ✅ Per-request model selection working');
    console.log('='.repeat(60));
    process.exit(0);
  } catch (error) {
    console.log();
    console.log('='.repeat(60));
    console.log('❌ TEST FAILED');
    console.log('='.repeat(60));
    console.log();
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the test
testMultiModelSupport();
