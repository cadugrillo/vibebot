/**
 * Search API Integration Tests
 * VBT-241: Integration Tests for Search API
 *
 * Prerequisites:
 * - Server must be running (npm run dev)
 * - Database must be accessible
 *
 * Run with: npm run test:search-api
 */

import prisma from '../../src/config/database';
import { hash } from 'bcrypt';

// Test configuration
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const TEST_USER = {
  email: `test-search-${Date.now()}@example.com`,
  password: 'Test1234!',
};

// Test state
let testsPassed = 0;
let testsFailed = 0;
let accessToken: string;
let testUserId: string;
let conversationId1: string;
let conversationId2: string;

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
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return fetch(url, options);
}

// Test runner
async function runTests() {
  console.log('\n🧪 Starting Search API Integration Tests...\n');

  try {
    // Setup: Create test user
    await setupTestData();

    // Run tests
    await test1_SearchByTitle();
    await test2_SearchByContent();
    await test3_SearchWithModelFilter();
    await test4_SearchWithDateRange();
    await test5_SearchWithPagination();
    await test6_EmptySearchResults();
    await test7_ValidationEmptyQuery();
    await test8_ValidationLongQuery();
    await test9_SearchWithinConversation();
    await test10_UnauthorizedAccess();
    await test11_CaseInsensitiveSearch();
    await test12_VerifyHighlights();

    console.log('\n🧹 Cleaning up test data...');
    await cleanup();

    console.log('\n✅ Search API Integration Tests Complete!\n');
    console.log(`📊 Results: ${testsPassed} passed, ${testsFailed} failed\n`);

    process.exit(testsFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    await cleanup();
    process.exit(1);
  }
}

async function setupTestData() {
  console.log('1️⃣  Setting up test data...');

  // Create test user in database
  const hashedPassword = await hash(TEST_USER.password, 12);
  const user = await prisma.user.create({
    data: {
      email: TEST_USER.email,
      password: hashedPassword,
      name: 'Search Test User',
      role: 'USER',
    },
  });
  testUserId = user.id;

  // Register and login
  const loginResponse = await makeRequest('POST', '/api/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password,
  });

  const loginData = await loginResponse.json();
  accessToken = loginData.accessToken;

  console.log(`   ✅ Test user created: ${TEST_USER.email}`);

  // Create test conversations
  console.log('\n2️⃣  Creating test conversations...');

  const conv1Response = await makeRequest(
    'POST',
    '/api/conversations',
    {
      title: 'React and TypeScript Best Practices',
      model: 'claude-sonnet-4-5',
    },
    { Authorization: `Bearer ${accessToken}` }
  );
  const conv1Data = await conv1Response.json();
  conversationId1 = conv1Data.data.id;

  // Add message to conversation 1
  await makeRequest(
    'POST',
    '/api/messages',
    {
      conversationId: conversationId1,
      content: 'What are the best practices for using React hooks with TypeScript?',
    },
    { Authorization: `Bearer ${accessToken}` }
  );

  console.log(`   ✅ Conversation 1 created: "${conv1Data.data.title}"`);

  const conv2Response = await makeRequest(
    'POST',
    '/api/conversations',
    {
      title: 'Building REST APIs with Express',
      model: 'claude-opus-4',
    },
    { Authorization: `Bearer ${accessToken}` }
  );
  const conv2Data = await conv2Response.json();
  conversationId2 = conv2Data.data.id;

  // Add message to conversation 2
  await makeRequest(
    'POST',
    '/api/messages',
    {
      conversationId: conversationId2,
      content: 'How do I implement middleware in Express for authentication?',
    },
    { Authorization: `Bearer ${accessToken}` }
  );

  console.log(`   ✅ Conversation 2 created: "${conv2Data.data.title}"`);

  // Wait for database writes to complete
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

async function cleanup() {
  try {
    if (conversationId1) {
      await prisma.conversation.delete({ where: { id: conversationId1 } });
    }
    if (conversationId2) {
      await prisma.conversation.delete({ where: { id: conversationId2 } });
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } });
    }
    console.log('   ✅ Test data cleaned up');
  } catch (error) {
    console.error('   ⚠️  Cleanup error:', error);
  }
}

// Test 1: Search by conversation title
async function test1_SearchByTitle() {
  console.log('\n🔍 Test 1: Search by conversation title');

  const response = await makeRequest(
    'GET',
    '/api/conversations/search?q=React',
    undefined,
    { Authorization: `Bearer ${accessToken}` }
  );

  const data = await response.json();

  if (response.status !== 200) {
    console.log('   ❌ Error response:', JSON.stringify(data, null, 2));
  }

  assertEquals(response.status, 200, 'Status should be 200');
  assertEquals(data.query, 'React', 'Query should match');
  assert(Array.isArray(data.matches), 'Matches should be an array');
  assert(data.matches.length > 0, 'Should find at least one match');
  assert(data.pagination !== undefined, 'Should have pagination');
  assert(typeof data.executionTime === 'number', 'Should have execution time');

  console.log(`   ✅ Found ${data.matches.length} match(es), execution time: ${data.executionTime}ms`);
}

// Test 2: Search by message content
async function test2_SearchByContent() {
  console.log('\n🔍 Test 2: Search by message content');

  const response = await makeRequest(
    'GET',
    '/api/conversations/search?q=authentication',
    undefined,
    { Authorization: `Bearer ${accessToken}` }
  );

  const data = await response.json();

  assertEquals(response.status, 200, 'Status should be 200');
  assert(data.matches.length > 0, 'Should find matches');

  const match = data.matches.find((m: any) =>
    m.snippet.toLowerCase().includes('authentication')
  );
  assert(match !== undefined, 'Should find match with authentication');
  assertEquals(match.matchType, 'content', 'Match type should be content');

  console.log(`   ✅ Found ${data.matches.length} match(es)`);
}

// Test 3: Search with model filter
async function test3_SearchWithModelFilter() {
  console.log('\n🔍 Test 3: Search with model filter');

  const response = await makeRequest(
    'GET',
    '/api/conversations/search?q=React&model=claude-sonnet-4-5',
    undefined,
    { Authorization: `Bearer ${accessToken}` }
  );

  const data = await response.json();

  assertEquals(response.status, 200, 'Status should be 200');
  assertEquals(data.filters.model, 'claude-sonnet-4-5', 'Model filter should be applied');

  console.log(`   ✅ Found ${data.matches.length} match(es) with model filter`);
}

// Test 4: Search with date range
async function test4_SearchWithDateRange() {
  console.log('\n🔍 Test 4: Search with date range filter');

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const response = await makeRequest(
    'GET',
    `/api/conversations/search?q=React&from=${yesterday}&to=${tomorrow}`,
    undefined,
    { Authorization: `Bearer ${accessToken}` }
  );

  const data = await response.json();

  assertEquals(response.status, 200, 'Status should be 200');
  assert(data.filters.dateRange !== undefined, 'Date range filter should be applied');

  console.log(`   ✅ Found ${data.matches.length} match(es) within date range`);
}

// Test 5: Search with pagination
async function test5_SearchWithPagination() {
  console.log('\n🔍 Test 5: Search with pagination');

  const response = await makeRequest(
    'GET',
    '/api/conversations/search?q=React&page=1&pageSize=1',
    undefined,
    { Authorization: `Bearer ${accessToken}` }
  );

  const data = await response.json();

  assertEquals(response.status, 200, 'Status should be 200');
  assertEquals(data.pagination.page, 1, 'Page should be 1');
  assertEquals(data.pagination.pageSize, 1, 'Page size should be 1');
  assertEquals(data.pagination.hasPreviousPage, false, 'Should have no previous page');

  console.log(`   ✅ Pagination working: page ${data.pagination.page} of ${data.pagination.totalPages}`);
}

// Test 6: Empty search results
async function test6_EmptySearchResults() {
  console.log('\n🔍 Test 6: Search with no matches');

  const response = await makeRequest(
    'GET',
    '/api/conversations/search?q=ZzZzNonexistentTermZzZz',
    undefined,
    { Authorization: `Bearer ${accessToken}` }
  );

  const data = await response.json();

  assertEquals(response.status, 200, 'Status should be 200');
  assertEquals(data.matches.length, 0, 'Should have no matches');
  assertEquals(data.pagination.totalResults, 0, 'Total results should be 0');

  console.log(`   ✅ Empty search handled correctly`);
}

// Test 7: Validation - empty query
async function test7_ValidationEmptyQuery() {
  console.log('\n🔍 Test 7: Search validation - empty query');

  const response = await makeRequest(
    'GET',
    '/api/conversations/search?q=',
    undefined,
    { Authorization: `Bearer ${accessToken}` }
  );

  assertEquals(response.status, 400, 'Status should be 400 for empty query');

  console.log(`   ✅ Empty query rejected with 400`);
}

// Test 8: Validation - query too long
async function test8_ValidationLongQuery() {
  console.log('\n🔍 Test 8: Search validation - query too long');

  const longQuery = 'a'.repeat(201);
  const response = await makeRequest(
    'GET',
    `/api/conversations/search?q=${longQuery}`,
    undefined,
    { Authorization: `Bearer ${accessToken}` }
  );

  assertEquals(response.status, 400, 'Status should be 400 for long query');

  console.log(`   ✅ Long query rejected with 400`);
}

// Test 9: Search within specific conversation
async function test9_SearchWithinConversation() {
  console.log('\n🔍 Test 9: Search within specific conversation');

  const response = await makeRequest(
    'GET',
    `/api/conversations/${conversationId1}/search?q=TypeScript`,
    undefined,
    { Authorization: `Bearer ${accessToken}` }
  );

  const data = await response.json();

  assertEquals(response.status, 200, 'Status should be 200');
  assertEquals(data.conversationId, conversationId1, 'Conversation ID should match');

  console.log(`   ✅ Found ${data.matches.length} match(es) in conversation`);
}

// Test 10: Unauthorized access
async function test10_UnauthorizedAccess() {
  console.log('\n🔍 Test 10: Unauthorized search');

  const response = await makeRequest('GET', '/api/conversations/search?q=test');

  assertEquals(response.status, 401, 'Status should be 401 for unauthorized');

  console.log(`   ✅ Unauthorized access blocked with 401`);
}

// Test 11: Case-insensitive search
async function test11_CaseInsensitiveSearch() {
  console.log('\n🔍 Test 11: Case-insensitive search');

  const lowerResponse = await makeRequest(
    'GET',
    '/api/conversations/search?q=react',
    undefined,
    { Authorization: `Bearer ${accessToken}` }
  );
  const lowerData = await lowerResponse.json();

  const upperResponse = await makeRequest(
    'GET',
    '/api/conversations/search?q=REACT',
    undefined,
    { Authorization: `Bearer ${accessToken}` }
  );
  const upperData = await upperResponse.json();

  assertEquals(lowerResponse.status, 200, 'Lower case search should succeed');
  assertEquals(upperResponse.status, 200, 'Upper case search should succeed');
  assertEquals(
    lowerData.matches.length,
    upperData.matches.length,
    'Should return same number of results'
  );

  console.log(`   ✅ Case-insensitive search working (${lowerData.matches.length} matches)`);
}

// Test 12: Verify highlights
async function test12_VerifyHighlights() {
  console.log('\n🔍 Test 12: Verify highlights in search results');

  const response = await makeRequest(
    'GET',
    '/api/conversations/search?q=React',
    undefined,
    { Authorization: `Bearer ${accessToken}` }
  );

  const data = await response.json();

  assertEquals(response.status, 200, 'Status should be 200');
  assert(data.matches.length > 0, 'Should have matches');

  const match = data.matches[0];
  assert(Array.isArray(match.highlights), 'Highlights should be an array');

  if (match.highlights.length > 0) {
    const highlight = match.highlights[0];
    assert(typeof highlight.start === 'number', 'Highlight should have start position');
    assert(typeof highlight.end === 'number', 'Highlight should have end position');
    assert(typeof highlight.text === 'string', 'Highlight should have text');
    assert(highlight.end > highlight.start, 'End should be after start');

    console.log(`   ✅ Highlights working: found ${match.highlights.length} highlight(s)`);
    console.log(`   ✅ Sample: "${highlight.text}" at ${highlight.start}-${highlight.end}`);
  }
}

// Run the tests
runTests();
