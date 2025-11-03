/**
 * Message API Integration Tests
 * VBT-193: Comprehensive tests for message processing endpoints
 *
 * Prerequisites:
 * - Server must be running (npm run dev)
 * - Database must be accessible
 * - Test user must exist (will be created if not exists)
 *
 * Run with: npm run test:message-api
 */

import prisma from '../../config/database';
import { hash } from 'bcrypt';

// Test configuration
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const TEST_USER = {
  email: `test-msg-${Date.now()}@example.com`,
  password: 'Test1234!',
};

// Test state
let testsPassed = 0;
let testsFailed = 0;
let accessToken: string;
let testUserId: string;
let testConversationId: string;
let otherUserId: string;
let otherUserConversationId: string;

// Helper functions
function assert(condition: boolean, message: string): void {
  if (!condition) {
    testsFailed++;
    throw new Error(`Assertion failed: ${message}`);
  }
  testsPassed++;
}

function assertEquals(actual: any, expected: any, message: string): void {
  if (actual !== expected) {
    testsFailed++;
    throw new Error(
      `Assertion failed: ${message} (expected: ${expected}, actual: ${actual})`
    );
  }
  testsPassed++;
}

async function makeRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (accessToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Setup: Create test user, conversation and get access token
 */
async function setup() {
  console.log('=== Setup: Creating test user and conversation ===\n');

  // Create test user
  const hashedPassword = await hash(TEST_USER.password, 12);
  const user = await prisma.user.create({
    data: {
      email: TEST_USER.email,
      password: hashedPassword,
      role: 'USER',
    },
  });

  testUserId = user.id;
  console.log(`✅ Test user created: ${TEST_USER.email}`);

  // Create test conversation
  const conversation = await prisma.conversation.create({
    data: {
      userId: testUserId,
      title: 'Test Conversation for Messages',
      model: 'claude-sonnet-4',
    },
  });

  testConversationId = conversation.id;
  console.log(`✅ Test conversation created: ${testConversationId}`);

  // Create another user for authorization tests
  const otherUser = await prisma.user.create({
    data: {
      email: `other-msg-${Date.now()}@example.com`,
      password: hashedPassword,
      role: 'USER',
    },
  });

  otherUserId = otherUser.id;

  // Create a conversation for the other user
  const otherConversation = await prisma.conversation.create({
    data: {
      userId: otherUserId,
      title: 'Other User Conversation',
    },
  });

  otherUserConversationId = otherConversation.id;
  console.log(`✅ Other user created for authorization tests`);

  // Login to get access token
  const loginResponse = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
  });

  const loginData = (await loginResponse.json()) as any;
  accessToken = loginData.accessToken;

  console.log('✅ Access token obtained\n');
}

/**
 * Test 1: Create message (success)
 */
async function testCreateMessage() {
  console.log('Test 1: Create Message (Success)');

  const response = await makeRequest('/api/messages', {
    method: 'POST',
    body: JSON.stringify({
      conversationId: testConversationId,
      content: 'Hello, this is a test message!',
    }),
  });

  const data = (await response.json()) as any;

  assertEquals(response.status, 202, 'Should return 202 Accepted');
  assert(data.data.id, 'Should return message ID');
  assertEquals(data.data.content, 'Hello, this is a test message!', 'Content should match');
  assertEquals(data.metadata.status, 'processing', 'Status should be processing');

  console.log('✅ Create message test passed\n');
}

/**
 * Test 2: Create message (validation error - empty content)
 */
async function testCreateMessageValidation() {
  console.log('Test 2: Create Message (Validation Error)');

  const response = await makeRequest('/api/messages', {
    method: 'POST',
    body: JSON.stringify({
      conversationId: testConversationId,
      content: '', // Empty content
    }),
  });

  assertEquals(response.status, 400, 'Should return 400 for validation error');

  console.log('✅ Create message validation test passed\n');
}

/**
 * Test 3: Create message (invalid conversation ID)
 */
async function testCreateMessageInvalidConversation() {
  console.log('Test 3: Create Message (Invalid Conversation)');

  const response = await makeRequest('/api/messages', {
    method: 'POST',
    body: JSON.stringify({
      conversationId: 'c123456789012345678901234', // Valid format but doesn't exist
      content: 'Test message',
    }),
  });

  assertEquals(response.status, 404, 'Should return 404 for invalid conversation');

  console.log('✅ Create message invalid conversation test passed\n');
}

/**
 * Test 4: Create message (forbidden - other user's conversation)
 */
async function testCreateMessageForbidden() {
  console.log('Test 4: Create Message (Forbidden)');

  const response = await makeRequest('/api/messages', {
    method: 'POST',
    body: JSON.stringify({
      conversationId: otherUserConversationId,
      content: 'Trying to send to other user conversation',
    }),
  });

  assertEquals(response.status, 403, 'Should return 403');

  console.log('✅ Create message forbidden test passed\n');
}

/**
 * Test 5: List messages (empty conversation)
 */
async function testListMessagesEmpty() {
  console.log('Test 5: List Messages (Empty Conversation)');

  // Create a new empty conversation
  const emptyConv = await prisma.conversation.create({
    data: {
      userId: testUserId,
      title: 'Empty Conversation',
    },
  });

  const response = await makeRequest(
    `/api/messages?conversationId=${emptyConv.id}`
  );
  const data = (await response.json()) as any;

  assertEquals(response.status, 200, 'Should return 200');
  assertEquals(data.data.length, 0, 'Should return empty array');
  assertEquals(data.pagination.totalItems, 0, 'Total should be 0');

  console.log('✅ List messages (empty) test passed\n');
}

/**
 * Test 6: List messages (with pagination)
 */
async function testListMessagesPagination() {
  console.log('Test 6: List Messages (Pagination)');

  // Create 5 messages in the test conversation
  for (let i = 1; i <= 5; i++) {
    await prisma.message.create({
      data: {
        conversationId: testConversationId,
        userId: testUserId,
        role: 'USER',
        content: `Test message ${i}`,
      },
    });
  }

  // Get first page (2 items)
  const response = await makeRequest(
    `/api/messages?conversationId=${testConversationId}&page=1&pageSize=2`
  );
  const data = (await response.json()) as any;

  assertEquals(response.status, 200, 'Should return 200');
  assertEquals(data.data.length, 2, 'Should return 2 items');
  assert(data.pagination.totalItems >= 5, 'Total should be at least 5');
  assertEquals(data.pagination.hasNext, true, 'Should have next page');

  console.log('✅ List messages pagination test passed\n');
}

/**
 * Test 7: List messages (forbidden - other user's conversation)
 */
async function testListMessagesForbidden() {
  console.log('Test 7: List Messages (Forbidden)');

  const response = await makeRequest(
    `/api/messages?conversationId=${otherUserConversationId}`
  );

  assertEquals(response.status, 403, 'Should return 403');

  console.log('✅ List messages forbidden test passed\n');
}

/**
 * Test 8: Get single message (success)
 */
async function testGetMessage() {
  console.log('Test 8: Get Single Message (Success)');

  // Create a message
  const message = await prisma.message.create({
    data: {
      conversationId: testConversationId,
      userId: testUserId,
      role: 'USER',
      content: 'Get this message',
    },
  });

  const response = await makeRequest(`/api/messages/${message.id}`);
  const data = (await response.json()) as any;

  assertEquals(response.status, 200, 'Should return 200');
  assertEquals(data.data.id, message.id, 'ID should match');
  assertEquals(data.data.content, 'Get this message', 'Content should match');

  console.log('✅ Get message test passed\n');
}

/**
 * Test 9: Get message (not found)
 */
async function testGetMessageNotFound() {
  console.log('Test 9: Get Message (Not Found)');

  const fakeId = 'c123456789012345678901234'; // Valid format but doesn't exist
  const response = await makeRequest(`/api/messages/${fakeId}`);

  assertEquals(response.status, 404, 'Should return 404');

  console.log('✅ Get message not found test passed\n');
}

/**
 * Test 10: Unauthorized access (no token)
 */
async function testUnauthorizedAccess() {
  console.log('Test 10: Unauthorized Access (No Token)');

  const tempToken = accessToken;
  accessToken = ''; // Remove token

  const response = await makeRequest('/api/messages', {
    method: 'POST',
    body: JSON.stringify({
      conversationId: testConversationId,
      content: 'Test',
    }),
  });

  assertEquals(response.status, 401, 'Should return 401');

  accessToken = tempToken; // Restore token

  console.log('✅ Unauthorized access test passed\n');
}

/**
 * Cleanup: Remove test data
 */
async function cleanup() {
  console.log('\n=== Cleanup: Removing test data ===\n');

  await prisma.message.deleteMany({
    where: {
      conversationId: {
        in: [testConversationId, otherUserConversationId],
      },
    },
  });

  await prisma.conversation.deleteMany({
    where: {
      OR: [{ userId: testUserId }, { userId: otherUserId }],
    },
  });

  await prisma.refreshToken.deleteMany({
    where: {
      OR: [{ userId: testUserId }, { userId: otherUserId }],
    },
  });

  await prisma.user.deleteMany({
    where: {
      OR: [{ id: testUserId }, { id: otherUserId }],
    },
  });

  console.log('✅ Test data cleaned up\n');
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('======================================');
  console.log('Message API Integration Tests');
  console.log('VBT-193');
  console.log('======================================\n');

  try {
    await setup();

    // Run all tests
    await testCreateMessage();
    await testCreateMessageValidation();
    await testCreateMessageInvalidConversation();
    await testCreateMessageForbidden();
    await testListMessagesEmpty();
    await testListMessagesPagination();
    await testListMessagesForbidden();
    await testGetMessage();
    await testGetMessageNotFound();
    await testUnauthorizedAccess();

    await cleanup();

    console.log('======================================');
    console.log('✅ All Tests Passed!');
    console.log(`Total Assertions: ${testsPassed + testsFailed}`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log('======================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('\n======================================');
    console.log(`Total Assertions: ${testsPassed + testsFailed}`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log('======================================\n');

    await cleanup().catch(console.error);
    process.exit(1);
  }
}

// Run tests
runTests();
