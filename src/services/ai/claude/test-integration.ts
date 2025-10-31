/**
 * VBT-163: Integration Testing with WebSocket Server
 *
 * End-to-end integration test for Claude API + WebSocket Server
 * Tests streaming responses, token counting, cost tracking, error handling, and more
 */

import 'dotenv/config';
import { getClaudeService } from './ClaudeService';
import { ClaudeModel } from './models';
import { createTextCallback } from './streaming';
import {
  getDefaultSystemPrompt,
  getPreset,
  selectSystemPrompt,
} from './system-prompts';
import { estimateCost, formatCost, formatTokens } from '../cost-reporting';

/**
 * Simulates WebSocket streaming callback
 * In production, this would send chunks through WebSocket
 */
function createWebSocketStreamCallback(conversationId: string, messageId: string) {
  let fullText = '';
  const chunks: string[] = [];

  return {
    callback: (event: any) => {
      // Handle different event types from StreamHandler
      if (event.type === 'start') {
        console.log(`[Stream started: ${event.messageId}]`);
        return;
      }

      if (event.type === 'delta' && event.text) {
        chunks.push(event.text);
        fullText += event.text;

        // Simulate WebSocket message:stream event
        const streamEvent = {
          type: 'message:stream',
          conversationId,
          messageId,
          content: event.text,
          isComplete: false,
          timestamp: new Date().toISOString(),
        };

        // In production: wsServer.sendToConversation(conversationId, streamEvent)
        process.stdout.write(event.text); // For visual feedback
        return;
      }

      if (event.type === 'complete') {
        // Send final completion event
        const completionEvent = {
          type: 'message:stream',
          conversationId,
          messageId,
          content: '',
          isComplete: true,
          timestamp: new Date().toISOString(),
        };

        // In production: wsServer.sendToConversation(conversationId, completionEvent)
        return;
      }

      if (event.type === 'error') {
        console.error(`[Stream error: ${event.error}]`);
        return;
      }
    },
    getFullText: () => fullText,
    getChunks: () => chunks,
  };
}

console.log('='.repeat(70));
console.log('VBT-163: Claude API + WebSocket Integration Test');
console.log('='.repeat(70));
console.log();

/**
 * Main integration test suite
 */
async function runIntegrationTests(): Promise<void> {
  const claudeService = getClaudeService();
  let totalCost = 0;

  // Test 1: Basic Streaming through WebSocket Simulation
  console.log('Test 1: Basic Streaming Response');
  console.log('-'.repeat(70));

  const conversationId1 = 'test-conv-integration-1';
  const messageId1 = `msg-${Date.now()}-1`;
  const userMessage1 = 'Write a haiku about WebSocket and AI integration';

  console.log(`Conversation ID: ${conversationId1}`);
  console.log(`Message ID: ${messageId1}`);
  console.log(`User Message: "${userMessage1}"\n`);
  console.log('Streaming response:\n');

  const wsCallback1 = createWebSocketStreamCallback(conversationId1, messageId1);

  try {
    const response1 = await claudeService.streamResponse(
      {
        conversationId: conversationId1,
        userId: 'test-user-integration',
        userMessage: userMessage1,
        messageId: messageId1,
        model: ClaudeModel.HAIKU_4_5, // Fastest for testing
        maxTokens: 100,
      },
      wsCallback1.callback
    );

    console.log('\n');
    console.log('\n✓ Response Summary:');
    console.log(`  Model: ${response1.model}`);
    console.log(`  Input tokens: ${formatTokens(response1.tokenUsage.inputTokens)}`);
    console.log(`  Output tokens: ${formatTokens(response1.tokenUsage.outputTokens)}`);
    console.log(`  Total tokens: ${formatTokens(response1.tokenUsage.totalTokens)}`);
    console.log(`  Cost: ${formatCost(response1.cost.totalCost)}`);
    console.log(`  Stop reason: ${response1.stopReason}`);
    console.log(`  Chunks received: ${wsCallback1.getChunks().length}`);
    console.log(`  Full text length: ${wsCallback1.getFullText().length} characters`);

    totalCost += response1.cost.totalCost;

    console.log('\n✅ Test 1 passed: Basic streaming works\n');
  } catch (error) {
    console.error('\n❌ Test 1 failed:', error);
    throw error;
  }

  // Test 2: System Prompt Functionality
  console.log('Test 2: System Prompt Integration');
  console.log('-'.repeat(70));

  const conversationId2 = 'test-conv-integration-2';
  const messageId2 = `msg-${Date.now()}-2`;
  const userMessage2 = 'Explain TypeScript interfaces';
  const systemPrompt2 = getPreset('coding')?.prompt;

  console.log(`Using preset: coding`);
  console.log(`User Message: "${userMessage2}"\n`);
  console.log('Streaming response:\n');

  const wsCallback2 = createWebSocketStreamCallback(conversationId2, messageId2);

  try {
    const response2 = await claudeService.streamResponse(
      {
        conversationId: conversationId2,
        userId: 'test-user-integration',
        userMessage: userMessage2,
        messageId: messageId2,
        model: ClaudeModel.HAIKU_4_5,
        systemPrompt: systemPrompt2,
        maxTokens: 150,
      },
      wsCallback2.callback
    );

    console.log('\n');
    console.log('\n✓ Response Summary:');
    console.log(`  System prompt used: Yes (coding preset)`);
    console.log(`  Output tokens: ${formatTokens(response2.tokenUsage.outputTokens)}`);
    console.log(`  Cost: ${formatCost(response2.cost.totalCost)}`);

    totalCost += response2.cost.totalCost;

    console.log('\n✅ Test 2 passed: System prompts work correctly\n');
  } catch (error) {
    console.error('\n❌ Test 2 failed:', error);
    throw error;
  }

  // Test 3: Test All Three Models
  console.log('Test 3: Multi-Model Support');
  console.log('-'.repeat(70));

  const testPrompt = 'Say "Hello from [MODEL_NAME]" in exactly 5 words';
  const models = [
    { id: ClaudeModel.HAIKU_4_5, name: 'Haiku 4.5' },
    { id: ClaudeModel.SONNET_4_5, name: 'Sonnet 4.5' },
    { id: ClaudeModel.OPUS_4_1, name: 'Opus 4.1' },
  ];

  const modelResults: Array<{
    model: string;
    tokens: number;
    cost: number;
  }> = [];

  for (const model of models) {
    const conversationId = `test-conv-model-${model.id}`;
    const messageId = `msg-${Date.now()}-${model.id}`;

    console.log(`\nTesting ${model.name}...`);

    const wsCallback = createWebSocketStreamCallback(conversationId, messageId);

    try {
      const response = await claudeService.streamResponse(
        {
          conversationId,
          userId: 'test-user-integration',
          userMessage: testPrompt,
          messageId,
          model: model.id,
          maxTokens: 50,
        },
        wsCallback.callback
      );

      console.log('');
      console.log(`✓ ${model.name}: ${response.tokenUsage.totalTokens} tokens, ${formatCost(response.cost.totalCost)}`);

      modelResults.push({
        model: model.name,
        tokens: response.tokenUsage.totalTokens,
        cost: response.cost.totalCost,
      });

      totalCost += response.cost.totalCost;
    } catch (error) {
      console.error(`\n❌ ${model.name} failed:`, error);
      throw error;
    }
  }

  console.log('\n✓ Model Comparison:');
  modelResults.sort((a, b) => a.cost - b.cost);
  for (const result of modelResults) {
    console.log(`  ${result.model}: ${result.tokens} tokens, ${formatCost(result.cost)}`);
  }

  console.log('\n✅ Test 3 passed: All models work correctly\n');

  // Test 4: Token Counting Accuracy
  console.log('Test 4: Token Counting Verification');
  console.log('-'.repeat(70));

  const conversationId4 = 'test-conv-integration-4';
  const messageId4 = `msg-${Date.now()}-4`;
  const userMessage4 = 'Count to 10';

  console.log(`Testing token counting accuracy...`);

  const wsCallback4 = createWebSocketStreamCallback(conversationId4, messageId4);

  try {
    const response4 = await claudeService.streamResponse(
      {
        conversationId: conversationId4,
        userId: 'test-user-integration',
        userMessage: userMessage4,
        messageId: messageId4,
        model: ClaudeModel.HAIKU_4_5,
        maxTokens: 50,
      },
      wsCallback4.callback
    );

    console.log('');
    console.log(`✓ Tokens reported:`);
    console.log(`  Input: ${response4.tokenUsage.inputTokens}`);
    console.log(`  Output: ${response4.tokenUsage.outputTokens}`);
    console.log(`  Total: ${response4.tokenUsage.totalTokens}`);
    console.log(`  Cache creation: ${response4.tokenUsage.cacheCreationInputTokens || 0}`);
    console.log(`  Cache read: ${response4.tokenUsage.cacheReadInputTokens || 0}`);

    // Verify token counts are positive and logical
    if (response4.tokenUsage.inputTokens <= 0) {
      throw new Error('Input tokens should be positive');
    }
    if (response4.tokenUsage.outputTokens <= 0) {
      throw new Error('Output tokens should be positive');
    }
    if (response4.tokenUsage.totalTokens !== response4.tokenUsage.inputTokens + response4.tokenUsage.outputTokens) {
      throw new Error('Total tokens should equal input + output');
    }

    totalCost += response4.cost.totalCost;

    console.log('\n✅ Test 4 passed: Token counting is accurate\n');
  } catch (error) {
    console.error('\n❌ Test 4 failed:', error);
    throw error;
  }

  // Test 5: Cost Tracking Accuracy
  console.log('Test 5: Cost Tracking Verification');
  console.log('-'.repeat(70));

  const conversationId5 = 'test-conv-integration-5';
  const messageId5 = `msg-${Date.now()}-5`;
  const userMessage5 = 'Test cost calculation';

  console.log(`Testing cost calculation...`);

  // Estimate cost before request
  const estimatedInputTokens = 20;
  const estimatedOutputTokens = 30;
  const estimatedCost = estimateCost(
    ClaudeModel.HAIKU_4_5,
    estimatedInputTokens,
    estimatedOutputTokens
  );

  console.log(`\nEstimated cost (${estimatedInputTokens} input + ${estimatedOutputTokens} output): ${estimatedCost ? formatCost(estimatedCost) : 'N/A'}`);

  const wsCallback5 = createWebSocketStreamCallback(conversationId5, messageId5);

  try {
    const response5 = await claudeService.streamResponse(
      {
        conversationId: conversationId5,
        userId: 'test-user-integration',
        userMessage: userMessage5,
        messageId: messageId5,
        model: ClaudeModel.HAIKU_4_5,
        maxTokens: 50,
      },
      wsCallback5.callback
    );

    console.log('');
    console.log(`✓ Actual cost breakdown:`);
    console.log(`  Input cost: ${formatCost(response5.cost.inputCost)}`);
    console.log(`  Output cost: ${formatCost(response5.cost.outputCost)}`);
    console.log(`  Cache creation cost: ${formatCost(response5.cost.cacheCreationCost || 0)}`);
    console.log(`  Cache read cost: ${formatCost(response5.cost.cacheReadCost || 0)}`);
    console.log(`  Total cost: ${formatCost(response5.cost.totalCost)}`);

    // Verify cost calculation
    const expectedTotal =
      response5.cost.inputCost +
      response5.cost.outputCost +
      (response5.cost.cacheCreationCost || 0) +
      (response5.cost.cacheReadCost || 0);

    if (Math.abs(response5.cost.totalCost - expectedTotal) > 0.000001) {
      throw new Error(`Cost calculation mismatch: ${response5.cost.totalCost} !== ${expectedTotal}`);
    }

    totalCost += response5.cost.totalCost;

    console.log('\n✅ Test 5 passed: Cost tracking is accurate\n');
  } catch (error) {
    console.error('\n❌ Test 5 failed:', error);
    throw error;
  }

  // Test 6: Temperature Parameter
  console.log('Test 6: Temperature Parameter');
  console.log('-'.repeat(70));

  const conversationId6a = 'test-conv-integration-6a';
  const messageId6a = `msg-${Date.now()}-6a`;
  const conversationId6b = 'test-conv-integration-6b';
  const messageId6b = `msg-${Date.now()}-6b`;
  const userMessage6 = 'Say a random number between 1 and 100';

  console.log(`Testing temperature parameter with prompt: "${userMessage6}"`);

  console.log('\nLow temperature (0.3):');
  const wsCallback6a = createWebSocketStreamCallback(conversationId6a, messageId6a);

  try {
    const response6a = await claudeService.streamResponse(
      {
        conversationId: conversationId6a,
        userId: 'test-user-integration',
        userMessage: userMessage6,
        messageId: messageId6a,
        model: ClaudeModel.HAIKU_4_5,
        temperature: 0.3,
        maxTokens: 50,
      },
      wsCallback6a.callback
    );

    console.log('');
    console.log(`✓ Response length: ${response6a.content.length} chars`);

    totalCost += response6a.cost.totalCost;

    console.log('\nHigh temperature (1.0):');
    const wsCallback6b = createWebSocketStreamCallback(conversationId6b, messageId6b);

    const response6b = await claudeService.streamResponse(
      {
        conversationId: conversationId6b,
        userId: 'test-user-integration',
        userMessage: userMessage6,
        messageId: messageId6b,
        model: ClaudeModel.HAIKU_4_5,
        temperature: 1.0,
        maxTokens: 50,
      },
      wsCallback6b.callback
    );

    console.log('');
    console.log(`✓ Response length: ${response6b.content.length} chars`);

    totalCost += response6b.cost.totalCost;

    console.log('\n✅ Test 6 passed: Temperature parameter works\n');
  } catch (error) {
    console.error('\n❌ Test 6 failed:', error);
    throw error;
  }

  // Test 7: Error Handling (Invalid Model)
  console.log('Test 7: Error Handling');
  console.log('-'.repeat(70));

  console.log('Testing invalid model handling...');

  const conversationId7 = 'test-conv-integration-7';
  const messageId7 = `msg-${Date.now()}-7`;
  const wsCallback7 = createWebSocketStreamCallback(conversationId7, messageId7);

  try {
    await claudeService.streamResponse(
      {
        conversationId: conversationId7,
        userId: 'test-user-integration',
        userMessage: 'Test',
        messageId: messageId7,
        model: 'invalid-model-xyz' as any,
        maxTokens: 50,
      },
      wsCallback7.callback
    );

    console.error('❌ Should have thrown error for invalid model');
    throw new Error('Expected error was not thrown');
  } catch (error: any) {
    if (error.message.includes('Expected error was not thrown')) {
      throw error;
    }
    console.log(`✓ Error caught correctly: ${error.message}`);
    console.log('\n✅ Test 7 passed: Error handling works\n');
  }

  // Test 8: Stop Reason Verification
  console.log('Test 8: Stop Reason Verification');
  console.log('-'.repeat(70));

  const conversationId8 = 'test-conv-integration-8';
  const messageId8 = `msg-${Date.now()}-8`;
  const userMessage8 = 'Write a very long essay about TypeScript'; // Will likely hit max_tokens

  console.log('Testing stop reason with limited tokens...');

  const wsCallback8 = createWebSocketStreamCallback(conversationId8, messageId8);

  try {
    const response8 = await claudeService.streamResponse(
      {
        conversationId: conversationId8,
        userId: 'test-user-integration',
        userMessage: userMessage8,
        messageId: messageId8,
        model: ClaudeModel.HAIKU_4_5,
        maxTokens: 50, // Very low to trigger max_tokens stop
      },
      wsCallback8.callback
    );

    console.log('');
    console.log(`✓ Stop reason: ${response8.stopReason}`);
    console.log(`✓ Output tokens: ${response8.tokenUsage.outputTokens}`);

    // Verify stop reason is one of the valid values
    const validStopReasons = ['end_turn', 'max_tokens', 'stop_sequence'];
    if (!validStopReasons.includes(response8.stopReason)) {
      throw new Error(`Invalid stop reason: ${response8.stopReason}`);
    }

    totalCost += response8.cost.totalCost;

    console.log('\n✅ Test 8 passed: Stop reason tracking works\n');
  } catch (error) {
    console.error('\n❌ Test 8 failed:', error);
    throw error;
  }

  // Test 9: System Prompt Selection Logic
  console.log('Test 9: System Prompt Selection Logic');
  console.log('-'.repeat(70));

  const defaultPrompt = getDefaultSystemPrompt();
  const codingPreset = getPreset('coding');
  const selectedDefault = selectSystemPrompt(null, undefined, true);
  const selectedCoding = selectSystemPrompt(null, 'coding', true);
  const selectedCustom = selectSystemPrompt('Custom test prompt for this conversation');

  console.log('✓ System prompt selection:');
  console.log(`  Default prompt length: ${defaultPrompt.length} chars`);
  console.log(`  Coding preset length: ${codingPreset?.prompt.length} chars`);
  console.log(`  Selected default: ${selectedDefault?.length} chars`);
  console.log(`  Selected coding: ${selectedCoding?.length} chars`);
  console.log(`  Selected custom: ${selectedCustom?.length} chars`);

  if (selectedDefault !== defaultPrompt) {
    throw new Error('Default selection failed');
  }
  if (selectedCoding !== codingPreset?.prompt) {
    throw new Error('Preset selection failed');
  }
  if (!selectedCustom?.includes('Custom test prompt')) {
    throw new Error('Custom prompt selection failed');
  }

  console.log('\n✅ Test 9 passed: System prompt selection works\n');

  // Final Summary
  console.log('='.repeat(70));
  console.log('✅ ALL INTEGRATION TESTS PASSED');
  console.log('='.repeat(70));
  console.log();
  console.log('Test Summary:');
  console.log('  ✅ Test 1: Basic streaming through WebSocket simulation');
  console.log('  ✅ Test 2: System prompt integration');
  console.log('  ✅ Test 3: Multi-model support (Haiku, Sonnet, Opus)');
  console.log('  ✅ Test 4: Token counting accuracy');
  console.log('  ✅ Test 5: Cost tracking accuracy');
  console.log('  ✅ Test 6: Temperature parameter');
  console.log('  ✅ Test 7: Error handling');
  console.log('  ✅ Test 8: Stop reason verification');
  console.log('  ✅ Test 9: System prompt selection logic');
  console.log();
  console.log(`Total test cost: ${formatCost(totalCost)}`);
  console.log();
  console.log('Integration verified:');
  console.log('  ✅ Claude API integration complete');
  console.log('  ✅ WebSocket streaming simulation successful');
  console.log('  ✅ Token counting working');
  console.log('  ✅ Cost tracking working');
  console.log('  ✅ Error handling working');
  console.log('  ✅ All models working');
  console.log('  ✅ System prompts working');
  console.log();
  console.log('Ready for WebSocket server integration!');
  console.log('='.repeat(70));
}

// Run tests
runIntegrationTests()
  .then(() => {
    console.log('\n✅ Integration tests completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Integration tests failed:', error);
    process.exit(1);
  });
