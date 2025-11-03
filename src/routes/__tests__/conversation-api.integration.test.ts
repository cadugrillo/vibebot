/**
 * Conversation API Integration Tests
 * VBT-182: Comprehensive tests for conversation management endpoints
 *
 * Prerequisites:
 * - Server must be running (npm run dev)
 * - Database must be accessible
 * - Test user must exist (will be created if not exists)
 *
 * Run with: npm run test:conversation-api
 */

import prisma from '../../config/database';
import { hash } from 'bcrypt';

// Test configuration
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'Test1234!',
};

// Test state
let testsPassed = 0;
let testsFailed = 0;
let accessToken: string;
let testUserId: string;
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
 * Setup: Create test user and get access token
 */
async function setup() {
  console.log('=== Setup: Creating test user ===\n');

  // Create test user directly in database
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

  // Create another user for authorization tests
  const otherUser = await prisma.user.create({
    data: {
      email: `other-${Date.now()}@example.com`,
      password: hashedPassword,
      role: 'USER',
    },
  });

  otherUserId = otherUser.id;

  // Create a conversation for the other user
  const otherUserConversation = await prisma.conversation.create({
    data: {
      userId: otherUserId,
      title: 'Other User Conversation',
    },
  });

  otherUserConversationId = otherUserConversation.id;
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
 * Test 1: Create conversation (success)
 */
async function testCreateConversation() {
  console.log('Test 1: Create Conversation (Success)');

  const response = await makeRequest('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({
      title: 'My Test Conversation',
      model: 'claude-sonnet-4',
      systemPrompt: 'You are a helpful assistant',
    }),
  });

  const data = (await response.json()) as any;

  assertEquals(response.status, 201, 'Should return 201');
  assert(data.data.id, 'Should return conversation ID');
  assertEquals(data.data.title, 'My Test Conversation', 'Title should match');
  assertEquals(data.data.model, 'claude-sonnet-4', 'Model should match');
  assertEquals(data.data.userId, testUserId, 'UserId should match');

  console.log('✅ Create conversation test passed\n');
}

/**
 * Test 2: Create conversation with defaults
 */
async function testCreateConversationDefaults() {
  console.log('Test 2: Create Conversation (Defaults)');

  const response = await makeRequest('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  const data = (await response.json()) as any;

  assertEquals(response.status, 201, 'Should return 201');
  assertEquals(
    data.data.title,
    'New Conversation',
    'Should use default title'
  );
  assertEquals(data.data.model, null, 'Model should be null');

  console.log('✅ Create conversation with defaults test passed\n');
}

/**
 * Test 3: Create conversation (validation error)
 */
async function testCreateConversationValidation() {
  console.log('Test 3: Create Conversation (Validation Error)');

  const response = await makeRequest('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({
      title: 'a'.repeat(201), // Too long
    }),
  });

  assertEquals(response.status, 400, 'Should return 400 for validation error');

  console.log('✅ Create conversation validation test passed\n');
}

/**
 * Test 4: List conversations (empty)
 */
async function testListConversationsEmpty() {
  console.log('Test 4: List Conversations (Empty)');

  // Clean up all conversations first
  await prisma.conversation.deleteMany({
    where: { userId: testUserId },
  });

  const response = await makeRequest('/api/conversations');
  const data = (await response.json()) as any;

  assertEquals(response.status, 200, 'Should return 200');
  assertEquals(data.data.length, 0, 'Should return empty array');
  assertEquals(data.pagination.totalItems, 0, 'Total should be 0');

  console.log('✅ List conversations (empty) test passed\n');
}

/**
 * Test 5: List conversations (pagination)
 */
async function testListConversationsPagination() {
  console.log('Test 5: List Conversations (Pagination)');

  // Create 5 conversations
  for (let i = 0; i < 5; i++) {
    await prisma.conversation.create({
      data: {
        userId: testUserId,
        title: `Conversation ${i + 1}`,
      },
    });
  }

  // Get first page (2 items)
  const response = await makeRequest(
    '/api/conversations?page=1&pageSize=2'
  );
  const data = (await response.json()) as any;

  assertEquals(response.status, 200, 'Should return 200');
  assertEquals(data.data.length, 2, 'Should return 2 items');
  assertEquals(data.pagination.totalItems, 5, 'Total should be 5');
  assertEquals(data.pagination.totalPages, 3, 'Total pages should be 3');
  assertEquals(data.pagination.hasNext, true, 'Should have next page');
  assertEquals(data.pagination.hasPrevious, false, 'Should not have previous');

  // Get second page
  const response2 = await makeRequest(
    '/api/conversations?page=2&pageSize=2'
  );
  const data2 = (await response2.json()) as any;

  assertEquals(data2.pagination.hasNext, true, 'Page 2 should have next');
  assertEquals(data2.pagination.hasPrevious, true, 'Page 2 should have previous');

  console.log('✅ List conversations pagination test passed\n');
}

/**
 * Test 6: List conversations (sorting)
 */
async function testListConversationsSorting() {
  console.log('Test 6: List Conversations (Sorting)');

  // Clean up and create conversations with different titles
  await prisma.conversation.deleteMany({
    where: { userId: testUserId },
  });

  await prisma.conversation.create({
    data: { userId: testUserId, title: 'Zebra' },
  });
  await prisma.conversation.create({
    data: { userId: testUserId, title: 'Apple' },
  });
  await prisma.conversation.create({
    data: { userId: testUserId, title: 'Banana' },
  });

  // Sort by title ascending
  const response = await makeRequest(
    '/api/conversations?sortBy=title&sortOrder=asc'
  );
  const data = (await response.json()) as any;

  assertEquals(response.status, 200, 'Should return 200');
  assertEquals(data.data[0].title, 'Apple', 'First should be Apple');
  assertEquals(data.data[1].title, 'Banana', 'Second should be Banana');
  assertEquals(data.data[2].title, 'Zebra', 'Third should be Zebra');

  console.log('✅ List conversations sorting test passed\n');
}

/**
 * Test 7: Get single conversation (success)
 */
async function testGetConversation() {
  console.log('Test 7: Get Single Conversation (Success)');

  // Clean up and create a conversation
  await prisma.conversation.deleteMany({
    where: { userId: testUserId },
  });

  const conversation = await prisma.conversation.create({
    data: {
      userId: testUserId,
      title: 'Get Test Conversation',
    },
  });

  const response = await makeRequest(`/api/conversations/${conversation.id}`);
  const data = (await response.json()) as any;

  assertEquals(response.status, 200, 'Should return 200');
  assertEquals(data.data.id, conversation.id, 'ID should match');
  assertEquals(data.data.title, 'Get Test Conversation', 'Title should match');

  console.log('✅ Get conversation test passed\n');
}

/**
 * Test 8: Get conversation (not found)
 */
async function testGetConversationNotFound() {
  console.log('Test 8: Get Conversation (Not Found)');

  const fakeId = 'clxxxxxxxxxxxxxxxxx'; // Valid CUID format
  const response = await makeRequest(`/api/conversations/${fakeId}`);

  assertEquals(response.status, 404, 'Should return 404');

  console.log('✅ Get conversation not found test passed\n');
}

/**
 * Test 9: Get conversation (forbidden - other user's conversation)
 */
async function testGetConversationForbidden() {
  console.log('Test 9: Get Conversation (Forbidden)');

  const response = await makeRequest(
    `/api/conversations/${otherUserConversationId}`
  );

  assertEquals(response.status, 403, 'Should return 403');

  console.log('✅ Get conversation forbidden test passed\n');
}

/**
 * Test 10: Update conversation (success)
 */
async function testUpdateConversation() {
  console.log('Test 10: Update Conversation (Success)');

  // Create a conversation
  const conversation = await prisma.conversation.create({
    data: {
      userId: testUserId,
      title: 'Original Title',
      model: 'claude-sonnet-4',
    },
  });

  const response = await makeRequest(`/api/conversations/${conversation.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: 'Updated Title',
      systemPrompt: 'New prompt',
    }),
  });

  const data = (await response.json()) as any;

  assertEquals(response.status, 200, 'Should return 200');
  assertEquals(data.data.title, 'Updated Title', 'Title should be updated');
  assertEquals(data.data.systemPrompt, 'New prompt', 'Prompt should be updated');
  assertEquals(
    data.data.model,
    'claude-sonnet-4',
    'Model should remain unchanged'
  );

  console.log('✅ Update conversation test passed\n');
}

/**
 * Test 11: Update conversation (validation error)
 */
async function testUpdateConversationValidation() {
  console.log('Test 11: Update Conversation (Validation Error)');

  const conversation = await prisma.conversation.create({
    data: {
      userId: testUserId,
      title: 'Test',
    },
  });

  const response = await makeRequest(`/api/conversations/${conversation.id}`, {
    method: 'PUT',
    body: JSON.stringify({}), // No fields provided
  });

  assertEquals(response.status, 400, 'Should return 400 for validation error');

  console.log('✅ Update conversation validation test passed\n');
}

/**
 * Test 12: Update conversation (forbidden)
 */
async function testUpdateConversationForbidden() {
  console.log('Test 12: Update Conversation (Forbidden)');

  const response = await makeRequest(
    `/api/conversations/${otherUserConversationId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Trying to update',
      }),
    }
  );

  assertEquals(response.status, 403, 'Should return 403');

  console.log('✅ Update conversation forbidden test passed\n');
}

/**
 * Test 13: Delete conversation (success)
 */
async function testDeleteConversation() {
  console.log('Test 13: Delete Conversation (Success)');

  const conversation = await prisma.conversation.create({
    data: {
      userId: testUserId,
      title: 'To Be Deleted',
    },
  });

  const response = await makeRequest(`/api/conversations/${conversation.id}`, {
    method: 'DELETE',
  });

  assertEquals(response.status, 204, 'Should return 204');

  // Verify deletion
  const deleted = await prisma.conversation.findUnique({
    where: { id: conversation.id },
  });

  assertEquals(deleted, null, 'Conversation should be deleted');

  console.log('✅ Delete conversation test passed\n');
}

/**
 * Test 14: Delete conversation (not found)
 */
async function testDeleteConversationNotFound() {
  console.log('Test 14: Delete Conversation (Not Found)');

  const fakeId = 'clxxxxxxxxxxxxxxxxx';
  const response = await makeRequest(`/api/conversations/${fakeId}`, {
    method: 'DELETE',
  });

  assertEquals(response.status, 404, 'Should return 404');

  console.log('✅ Delete conversation not found test passed\n');
}

/**
 * Test 15: Delete conversation (forbidden)
 */
async function testDeleteConversationForbidden() {
  console.log('Test 15: Delete Conversation (Forbidden)');

  const response = await makeRequest(
    `/api/conversations/${otherUserConversationId}`,
    {
      method: 'DELETE',
    }
  );

  assertEquals(response.status, 403, 'Should return 403');

  // Verify it wasn't deleted
  const stillExists = await prisma.conversation.findUnique({
    where: { id: otherUserConversationId },
  });

  assert(stillExists !== null, 'Conversation should still exist');

  console.log('✅ Delete conversation forbidden test passed\n');
}

/**
 * Test 16: Unauthorized access (no token)
 */
async function testUnauthorizedAccess() {
  console.log('Test 16: Unauthorized Access (No Token)');

  const tempToken = accessToken;
  accessToken = ''; // Remove token

  const response = await makeRequest('/api/conversations');

  assertEquals(response.status, 401, 'Should return 401');

  accessToken = tempToken; // Restore token

  console.log('✅ Unauthorized access test passed\n');
}

/**
 * Cleanup: Remove test data
 */
async function cleanup() {
  console.log('\n=== Cleanup: Removing test data ===\n');

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
  console.log('Conversation API Integration Tests');
  console.log('VBT-182');
  console.log('======================================\n');

  try {
    await setup();

    // Run all tests
    await testCreateConversation();
    await testCreateConversationDefaults();
    await testCreateConversationValidation();
    await testListConversationsEmpty();
    await testListConversationsPagination();
    await testListConversationsSorting();
    await testGetConversation();
    await testGetConversationNotFound();
    await testGetConversationForbidden();
    await testUpdateConversation();
    await testUpdateConversationValidation();
    await testUpdateConversationForbidden();
    await testDeleteConversation();
    await testDeleteConversationNotFound();
    await testDeleteConversationForbidden();
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
    console.error('\n❌ Test failed:',error);
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
