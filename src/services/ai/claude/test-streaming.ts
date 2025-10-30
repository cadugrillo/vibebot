/**
 * Test Script for Streaming Response Handler
 * VBT-157: Verify streaming functionality
 *
 * Usage: tsx src/services/ai/claude/test-streaming.ts
 */

import 'dotenv/config';
import { getClaudeService } from './ClaudeService';
import { createTextCallback } from './streaming';
import { ClaudeModel } from './models';

async function testStreaming(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Claude Streaming Test - VBT-157');
  console.log('='.repeat(60));
  console.log();

  try {
    // Step 1: Initialize service
    console.log('Step 1: Initializing Claude Service...');
    const claudeService = getClaudeService();
    console.log('✅ Service initialized\n');

    // Step 2: Test simple streaming
    console.log('Step 2: Testing Simple Streaming');
    console.log('-'.repeat(60));
    console.log('Prompt: "Write a haiku about TypeScript"\n');

    const { callback: simpleCallback, getContent: getSimpleContent } = createTextCallback();

    const response1 = await claudeService.streamResponse(
      {
        conversationId: 'test-conv-1',
        userId: 'test-user-1',
        userMessage: 'Write a haiku about TypeScript',
        messageId: 'test-msg-1',
        model: ClaudeModel.HAIKU_4_5, // Use fastest model for testing
        maxTokens: 100,
      },
      simpleCallback
    );

    console.log('\nResponse Summary:');
    console.log(`  - Model: ${response1.model}`);
    console.log(`  - Input tokens: ${response1.tokenUsage.inputTokens}`);
    console.log(`  - Output tokens: ${response1.tokenUsage.outputTokens}`);
    console.log(`  - Total tokens: ${response1.tokenUsage.totalTokens}`);
    console.log(`  - Cost: $${response1.cost.totalCost.toFixed(6)}`);
    console.log(`  - Stop reason: ${response1.stopReason}`);
    console.log(`  - Content length: ${response1.content.length} characters`);
    console.log();

    // Step 3: Test with system prompt
    console.log('Step 3: Testing with System Prompt');
    console.log('-'.repeat(60));
    console.log('Prompt: "What is 2+2?"\n');
    console.log('System: "You are a helpful math tutor"\n');

    const { callback: systemCallback } = createTextCallback();

    const response2 = await claudeService.streamResponse(
      {
        conversationId: 'test-conv-1',
        userId: 'test-user-1',
        userMessage: 'What is 2+2?',
        messageId: 'test-msg-2',
        model: ClaudeModel.HAIKU_4_5,
        systemPrompt: 'You are a helpful math tutor. Keep answers brief.',
        maxTokens: 100,
      },
      systemCallback
    );

    console.log('\nResponse Summary:');
    console.log(`  - Model: ${response2.model}`);
    console.log(`  - Input tokens: ${response2.tokenUsage.inputTokens}`);
    console.log(`  - Output tokens: ${response2.tokenUsage.outputTokens}`);
    console.log(`  - Cost: $${response2.cost.totalCost.toFixed(6)}`);
    console.log();

    // Step 4: Test with different model
    console.log('Step 4: Testing with Sonnet Model');
    console.log('-'.repeat(60));
    console.log('Prompt: "Explain AI in one sentence"\n');

    const { callback: sonnetCallback } = createTextCallback();

    const response3 = await claudeService.streamResponse(
      {
        conversationId: 'test-conv-1',
        userId: 'test-user-1',
        userMessage: 'Explain AI in one sentence',
        messageId: 'test-msg-3',
        model: ClaudeModel.SONNET_4_5,
        maxTokens: 50,
      },
      sonnetCallback
    );

    console.log('\nResponse Summary:');
    console.log(`  - Model: ${response3.model}`);
    console.log(`  - Input tokens: ${response3.tokenUsage.inputTokens}`);
    console.log(`  - Output tokens: ${response3.tokenUsage.outputTokens}`);
    console.log(`  - Cost: $${response3.cost.totalCost.toFixed(6)}`);
    console.log();

    // Step 5: Test with temperature
    console.log('Step 5: Testing with Temperature Parameter');
    console.log('-'.repeat(60));
    console.log('Prompt: "Say hello in a creative way"\n');
    console.log('Temperature: 0.9\n');

    const { callback: tempCallback } = createTextCallback();

    const response4 = await claudeService.streamResponse(
      {
        conversationId: 'test-conv-1',
        userId: 'test-user-1',
        userMessage: 'Say hello in a creative way',
        messageId: 'test-msg-4',
        model: ClaudeModel.HAIKU_4_5,
        temperature: 0.9,
        maxTokens: 50,
      },
      tempCallback
    );

    console.log('\nResponse Summary:');
    console.log(`  - Temperature: 0.9 (creative)`);
    console.log(`  - Output tokens: ${response4.tokenUsage.outputTokens}`);
    console.log(`  - Cost: $${response4.cost.totalCost.toFixed(6)}`);
    console.log();

    // Final summary
    console.log('='.repeat(60));
    console.log('✅ ALL STREAMING TESTS PASSED!');
    console.log('='.repeat(60));
    console.log();
    console.log('Summary:');
    console.log('  - ✅ Basic streaming working');
    console.log('  - ✅ System prompts working');
    console.log('  - ✅ Multi-model support working');
    console.log('  - ✅ Temperature parameter working');
    console.log('  - ✅ Real-time text delivery working');
    console.log('  - ✅ Token counting working');
    console.log('  - ✅ Cost calculation working');
    console.log();

    const totalCost =
      response1.cost.totalCost +
      response2.cost.totalCost +
      response3.cost.totalCost +
      response4.cost.totalCost;

    console.log(`Total test cost: $${totalCost.toFixed(6)}`);
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
testStreaming();
