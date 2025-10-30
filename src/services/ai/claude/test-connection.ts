/**
 * Test Script for Claude API Connection
 * VBT-154: Verify SDK installation and connection
 *
 * Usage: tsx src/services/ai/claude/test-connection.ts
 */

import 'dotenv/config';
import { getClaudeService } from './ClaudeService';
import { ClaudeServiceError } from './types';

async function testClaudeConnection(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Claude API Connection Test - VBT-154');
  console.log('='.repeat(60));
  console.log();

  try {
    // Initialize service
    console.log('Step 1: Initializing Claude Service...');
    const claudeService = getClaudeService();
    console.log('✅ Service initialized\n');

    // Display configuration
    console.log('Step 2: Configuration loaded:');
    const config = claudeService.getConfig();
    console.log(`  - Default Model: ${config.defaultModel}`);
    console.log(`  - Max Tokens: ${config.maxTokens}`);
    console.log(`  - Timeout: ${config.timeout}ms`);
    console.log(`  - Max Retries: ${config.maxRetries}`);
    console.log(`  - API Key: ${config.apiKey.substring(0, 15)}...`);
    console.log();

    // Test connection
    console.log('Step 3: Testing API connection...');
    const success = await claudeService.testConnection();

    if (success) {
      console.log();
      console.log('='.repeat(60));
      console.log('✅ ALL TESTS PASSED!');
      console.log('Claude API is properly configured and accessible.');
      console.log('='.repeat(60));
      process.exit(0);
    }
  } catch (error) {
    console.log();
    console.log('='.repeat(60));
    console.log('❌ TEST FAILED');
    console.log('='.repeat(60));
    console.log();

    if (error instanceof ClaudeServiceError) {
      console.error('Error Type:', error.type);
      console.error('Message:', error.message);
      console.error('Status Code:', error.statusCode || 'N/A');
      console.error('Retryable:', error.retryable ? 'Yes' : 'No');
      console.log();

      // Provide helpful troubleshooting tips
      switch (error.type) {
        case 'AUTHENTICATION':
          console.log('💡 Troubleshooting:');
          console.log('   1. Check that ANTHROPIC_API_KEY is set in your .env file');
          console.log('   2. Verify the API key is correct (starts with sk-ant-)');
          console.log('   3. Ensure the API key has not expired');
          console.log('   4. Get your API key from: https://console.anthropic.com/');
          break;

        case 'RATE_LIMIT':
          console.log('💡 Troubleshooting:');
          console.log('   1. Wait a few minutes and try again');
          console.log('   2. Check your API usage limits');
          console.log('   3. Consider upgrading your API plan');
          break;

        case 'NETWORK':
          console.log('💡 Troubleshooting:');
          console.log('   1. Check your internet connection');
          console.log('   2. Verify firewall/proxy settings');
          console.log('   3. Try again in a few moments');
          break;

        default:
          console.log('💡 Check the error message above for details');
      }
    } else {
      console.error('Unexpected error:', error);
    }

    console.log();
    process.exit(1);
  }
}

// Run the test
testClaudeConnection();
