# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VibeBot** is a self-hosted multi-user AI Agent application built with TypeScript. The project aims to provide:
- Modern web interface for AI chat interactions
- Multi-user support with authentication and role-based access control
- Support for both Claude and OpenAI API models
- MCP (Model Context Protocol) server integration for tools
- Conversation history, branching, and search capabilities

## Current Status

**Phase 1 (Foundation) - ✅ COMPLETE**

Completed:
- ✅ VBT-21: Backend Node.js/TypeScript project initialized
- ✅ VBT-22: Frontend React + shadcn/ui project initialized
- ✅ VBT-23: Database setup with PostgreSQL and Prisma ORM
- ✅ VBT-24: Docker configuration for self-hosted deployment
- ✅ VBT-25: Setup documentation and installation guide

**Phase 2 (Authentication) - ✅ COMPLETE**

Completed:
- ✅ VBT-26: JWT Authentication System
  - JWT token generation and verification (access + refresh tokens)
  - Password hashing with bcrypt (12 salt rounds)
  - HTTP-only secure cookies for token storage
  - Rate limiting for brute force protection
  - Authentication middleware for protected routes
  - RefreshToken model added to database
- ✅ VBT-27: User Registration API
  - Zod schema validation with password strength requirements
  - Email format validation and unique constraint
  - Generic validation middleware
  - Registration endpoint with comprehensive error handling
  - End-to-end testing completed
- ✅ VBT-28: User Login API
  - Account lockout after 5 failed attempts (15-minute lock)
  - Failed login attempt tracking per user
  - Admin unlock endpoint for support (`POST /api/admin/users/:userId/unlock`)
  - Enhanced error messages with remaining lock time
  - Role-based access control (admin middleware)
  - Comprehensive testing completed
- ✅ VBT-29: User Login Page UI
- ✅ VBT-30: User Registration Page UI
  - Registration form with email, password, confirm password fields
  - Password strength indicator with visual feedback
  - Client-side validation matching backend rules
  - Terms of Service and Privacy Policy pages
  - Fully integrated with backend registration API
  - Comprehensive testing completed
- ✅ VBT-31: Frontend Authentication State Management
  - React Context for global auth state
  - Token storage utilities (localStorage with security notes)
  - API client with automatic token refresh on 401
  - Automatic token refresh 2 minutes before expiry
  - useAuth hook for easy component access
  - Protected route component with loading states
  - Login/Register pages integrated with auth context
  - jwt-decode package for token expiry calculation
  - Comprehensive end-to-end testing

**Phase 2 Complete!**

**Phase 3 (Core Chat Backend) - 🚧 IN PROGRESS**

Completed:
- ✅ VBT-39: WebSocket Server for Real-time Communication (10/10 sub-tasks complete - ✅ DONE!)
  - ✅ VBT-144: Setup WebSocket Server Infrastructure (ws package, server integration)
  - ✅ VBT-145: Implement WebSocket Authentication Middleware (JWT verification)
  - ✅ VBT-146: Create WebSocket Connection Manager (user/conversation tracking, multi-tab support)
  - ✅ VBT-147: Implement Message Event Handlers (send/receive/stream with rate limiting: 10 msg/min)
  - ✅ VBT-148: Add Typing Indicators (typing:start/stop with 5s auto-timeout and spam prevention)
  - ✅ VBT-149: Implement Connection Status Events (lifecycle tracking: established/authenticated/disconnected/error)
  - ✅ VBT-150: Add Error Handling and Reconnection Logic (exponential backoff, max 5 retries, message queue)
  - ✅ VBT-151: Implement Cleanup on Disconnect (6-step cleanup: notification, typing, timers, listeners, connection, logging)
  - ✅ VBT-152: Create WebSocket Client Utility (Frontend) (599 lines, event emitter, auto-reconnect, full TypeScript)
  - ✅ VBT-153: Test WebSocket End-to-End (comprehensive test plan + interactive test client)

- ✅ VBT-40: Claude API Integration (10/10 sub-tasks complete - ✅ DONE!)
  - ✅ VBT-154: Install and Setup Claude TypeScript SDK (@anthropic-ai/sdk v0.68.0)
  - ✅ VBT-155: Create Claude Service Layer (ClaudeService singleton, config, types)
  - ✅ VBT-156: Multi-Model Support (Sonnet 4.5, Haiku 4.5, Opus 4.1, cost calculation)
  - ✅ VBT-157: Streaming Response Handler (StreamHandler class, real-time deltas, token tracking)
  - ✅ VBT-158: Token Counting and Usage Tracking (MessageMetadata storage, aggregation)
  - ✅ VBT-159: Rate Limit Detection and Handling (429 errors, exponential backoff, retry logic)
  - ✅ VBT-160: Comprehensive Error Handling (9 error types, circuit breaker, severity levels)
  - ✅ VBT-161: Cost Tracking System (per-model pricing, aggregation, reporting utilities)
  - ✅ VBT-162: System Prompt Support (6 presets, validation, custom prompts)
  - ✅ VBT-163: Integration Testing with WebSocket Server (9 tests, all passing, $0.0031 total cost)

- ✅ VBT-42: AI Provider Abstraction Layer (12/12 tasks complete - ✅ DONE!)
  - ✅ Provider-agnostic architecture design
  - ✅ RateLimitManager utility (provider-agnostic, exponential backoff, retry logic)
  - ✅ CircuitBreakerManager utility (prevents cascading failures, auto-recovery)
  - ✅ ErrorLogger utility (structured logging, statistics, 1000-entry buffer)
  - ✅ SystemPromptManager utility (6 presets, validation, custom prompts)
  - ✅ ClaudeProvider refactored to use new utilities
  - ✅ IAIProvider interface and factory pattern implementation
  - ✅ ClaudeService updated for backward compatibility
  - ✅ Comprehensive test suite (770+ tests for utilities)
  - ✅ WebSocket handlers integrated with AI provider
  - ✅ Migration guide and documentation (450+ lines)
  - ✅ Old implementation deprecated with notices
  - ✅ AI Integration testing (17 tests, all passing)

- ✅ VBT-171: Provider Selection Logic (✅ COMPLETE!)
  - ✅ ProviderSelector with 4 selection strategies (AUTO, COST, SPEED, QUALITY)
  - ✅ Strategy-based provider selection with fallback logic
  - ✅ ProviderPreferenceManager for user/conversation preferences
  - ✅ ModelRegistry with 3 Claude models (Sonnet 4.5, Opus 4, Haiku 4.5)
  - ✅ FallbackChainManager for automatic failover
  - ✅ AIProviderFactory with singleton pattern and caching
  - ✅ Full integration with AIIntegrationHandler

- ✅ VBT-172: Provider Capabilities and Metadata (✅ COMPLETE!)
  - ✅ ProviderStatus interface (circuit breaker state, error rates, availability)
  - ✅ ProviderRateLimits interface (requests/tokens per minute/day, retry timing)
  - ✅ ModelAvailability interface (deprecated status, availability checks)
  - ✅ IAIProvider methods: getProviderStatus(), getRateLimitInfo(), checkModelAvailability()
  - ✅ ClaudeProvider implementation with circuit breaker integration
  - ✅ 4 integration tests added (42 total tests passing)

- ✅ VBT-173: Comprehensive Unit Testing (✅ COMPLETE!)
  - ✅ MockProvider implementation (380 lines, full IAIProvider with configurable behavior)
  - ✅ Factory unit tests (8 tests, 23 assertions: singleton, registration, creation, caching, reset)
  - ✅ Fallback unit tests (5 tests, 9 assertions: basic fallback, exhaustion, custom chains, statistics)
  - ✅ Test scripts added to package.json (test:provider-factory, test:provider-fallback, test:provider-unit)
  - ✅ 74 total test assertions passing (100% pass rate)
  - ✅ Test files: MockProvider.ts, test-factory.ts, test-fallback.ts

- ✅ VBT-38: Conversation Management API (10/10 sub-tasks complete - ✅ DONE!)
  - ✅ VBT-174: TypeScript types and interfaces (DTOs, pagination, sorting)
  - ✅ VBT-175: Zod validation schemas (create, update, query params, ID validation)
  - ✅ VBT-176: Pagination utility (normalize params, generate metadata, defaults: page=1, pageSize=20, max=100)
  - ✅ VBT-177: Sorting utility (whitelist fields, Prisma orderBy conversion, defaults: createdAt DESC)
  - ✅ VBT-178: Create & List controllers (POST, GET with pagination/sorting)
  - ✅ VBT-179: Get, Update, Delete controllers (GET/:id, PUT/:id, DELETE/:id with cascade)
  - ✅ VBT-180: Authorization middleware (ownership verification, 403/404 handling)
  - ✅ VBT-181: Routes setup (5 endpoints, rate limiting: 10/min create, 30/min read)
  - ✅ VBT-182: Integration tests (16 tests: CRUD, pagination, sorting, authorization, validation)
  - ✅ VBT-183: Documentation (API_CONVERSATION.md with examples, test guide)

- ✅ VBT-43: Message Processing and Routing API (10/10 sub-tasks complete - ✅ DONE!)
  - ✅ VBT-184: Message types and DTOs (MessageMetadata, CreateMessageDTO, MessageResponseDTO, AIContextMessage)
  - ✅ VBT-185: Message validation schemas (createMessageSchema, listMessagesQuerySchema, messageIdSchema)
  - ✅ VBT-186: Enhanced message database service (createUserMessage, createAssistantMessage, pagination support)
  - ✅ VBT-187: Message history context builder (buildMessageContext with token estimation and message limits)
  - ✅ VBT-188: Message controller implementation (create, list, get with 202 Accepted pattern)
  - ✅ VBT-189: AI response processing integration (AIMessageProcessorService with WebSocket streaming)
  - ✅ VBT-190: Message routes and middleware (rate limiting: 20/min send, 60/min read)
  - ✅ VBT-191: Error handling (already implemented via AI provider layer)
  - ✅ VBT-192: Token tracking (already implemented via MessageMetadata)
  - ✅ VBT-193: Integration tests (10 tests: create, list, get, validation, authorization, pagination)

Remaining Phase 3 Tasks:
- ⏳ OpenAI provider implementation (VBT-41 - deferred to Phase 7)

**Phase 3 Backend Complete!** Moving to Phase 4 (Core Chat Frontend)

**Phase 4 (Core Chat Frontend) - 🚧 IN PROGRESS**

Completed:
- ✅ VBT-34: Main Chat Interface Layout
  - Responsive layout with collapsible sidebar
  - Header with conversation title display
  - Conversation list with active state highlighting
  - Mobile-optimized navigation
  - Settings and profile integration points

- ✅ VBT-35: Message Display Component (10/10 sub-tasks complete - ✅ DONE!)
  - ✅ VBT-211: Component Structure and Message Bubbles (user/AI differentiation, alignment)
  - ✅ VBT-212: Install and Configure Markdown Renderer (react-markdown, remark-gfm, custom components)
  - ✅ VBT-213: Code Block Syntax Highlighting (react-syntax-highlighter, VS Code Dark+, copy button, line numbers)
  - ✅ VBT-214: Timestamp Display (date-fns, relative time with hover tooltip)
  - ✅ VBT-215: Copy Message Button (clipboard API, toast notifications via sonner)
  - ✅ VBT-216: Avatar Display (lucide-react Bot/User icons)
  - ✅ VBT-217: Message Loading Animation (TypingIndicator with animated dots, MessageSkeleton)
  - ✅ VBT-218: Error State for Failed Messages (error display with retry button)
  - ✅ VBT-219: Message List Container (auto-scroll, scroll-to-bottom button, message grouping)
  - ✅ VBT-220: Integration and Testing (MessageList integrated in ChatPage, mock messages, production build passing)

- ✅ VBT-36: Message Input Component (10/10 sub-tasks complete - ✅ DONE!)
  - ✅ VBT-201: Install shadcn/ui Textarea and create MessageInput structure
  - ✅ VBT-202: Auto-expanding textarea (60px min, 200px max with scroll)
  - ✅ VBT-203: Send button with enabled/disabled state and loading spinner
  - ✅ VBT-204: Keyboard shortcuts (Enter, Shift+Enter, Ctrl/Cmd+Enter)
  - ✅ VBT-205: Character count with color-coded warnings (gray/yellow/red)
  - ✅ VBT-206: File upload button with image paste support (validation, previews)
  - ✅ VBT-207: Loading state (disabled input, spinner, opacity, wait cursor)
  - ✅ VBT-208: Clear input after send (content, files, errors, height reset, focus)
  - ✅ VBT-209: ChatPage integration (sticky bottom, handleSendMessage, message state)
  - ✅ VBT-210: Testing and verification (comprehensive test plan, production build)

Remaining Phase 4 Tasks:
- ⏳ VBT-37: Real-time Message Streaming UI (deferred - moved to Phase 5)

**Phase 4 Complete!**

- ✅ **Phase 5 (Chat History)** - COMPLETE! 🎉
  - ✅ VBT-38: Conversation Management API - Already complete from Phase 3
  - ✅ **VBT-50: Backend Conversation Search API (10/10 sub-tasks complete - ✅ DONE!)**
    - ✅ VBT-232: Search Types and DTOs (210 lines)
    - ✅ VBT-233: Search Validation Schemas (170 lines)
    - ✅ VBT-234: Full-text Search Service (347 lines)
    - ✅ VBT-235: Search Filters Implementation (date range, model, user)
    - ✅ VBT-236: Relevance Scoring Algorithm (multi-factor with recency)
    - ✅ VBT-237: Match Context Highlighting (snippet extraction)
    - ✅ VBT-238: Search Controller Implementation (3 endpoints)
    - ✅ VBT-239: Search Routes and Rate Limiting (30 req/min)
    - ✅ VBT-240: Performance Optimization (database indexes)
    - ✅ VBT-241: Integration Tests (12 tests, 36 assertions, all passing)
  - ✅ **VBT-49: Frontend Conversation Search UI (10/10 sub-tasks complete - ✅ DONE!)**
    - ✅ VBT-242: Search UI Components Structure (SearchBar, SearchResults, SearchFilters, types)
    - ✅ VBT-243: Search API Client Integration (searchConversations, searchInConversation, getSearchStats)
    - ✅ VBT-244: Real-time Search with Debouncing (useSearch hook, SearchContainer, 300ms debounce)
    - ✅ VBT-245: Search Results Display with Highlighting (enhanced highlighting, relevance scores, hover effects)
    - ✅ VBT-246: Date Range Filter Component (DateRangeFilter with presets, calendar picker)
    - ✅ VBT-247: Model Filter Component (ModelFilter with dropdown, 3 AI models)
    - ✅ VBT-248: Conversation-Specific Search Mode (SearchModeToggle, all vs conversation)
    - ✅ VBT-249: Search History Management (useSearchHistory hook, localStorage, recent searches)
    - ✅ VBT-250: Clear and Reset Functionality (clearAll method, ESC shortcut)
    - ✅ VBT-251: Integration Testing and Polish (all components integrated, production ready)

**Phase 5 Complete!**

See `development_tasks.md` for the complete development sequence.

---

## 📍 Where to Pick Up

**Last Session (2025-11-09)**: Frontend Search Implementation - VBT-49 COMPLETE! (10/10 sub-tasks ✅ DONE!)

**Session Summary:**
Completed the final 6 sub-tasks of VBT-49 (Frontend Conversation Search UI). **Phase 5 (Chat History) is now 100% complete!** All search filters, modes, history management, and polish features are implemented and tested.

**Completed Today (2025-11-09):**

5. **✅ VBT-246: Date Range Filter Component**
   - Created `DateRangeFilter.tsx` (268 lines) with shadcn/ui Calendar and Popover
   - Date range presets: Today, Last 7 days, Last 30 days, Custom
   - Dual calendar picker (from date + to date) with validation
   - ISO 8601 date format with date-fns (startOfDay/endOfDay)
   - Clear button with visual chip display

6. **✅ VBT-247: Model Filter Component**
   - Created `ModelFilter.tsx` (145 lines) with shadcn/ui DropdownMenu
   - 3 AI models: Claude Sonnet 4.5, Opus 4, Haiku 4.5
   - Single-select model filtering with checkmarks
   - Visual chip with clear button when model selected

7. **✅ VBT-248: Conversation-Specific Search Mode**
   - Created `SearchModeToggle.tsx` (96 lines) with shadcn/ui ToggleGroup
   - Two modes: "All Conversations" 🌍 and "Current Conversation" 💬
   - Conversation context display when in conversation mode
   - Automatic API endpoint switching based on mode
   - Added SearchMode type to types.ts

8. **✅ VBT-249: Search History Management**
   - Created `useSearchHistory.ts` hook (175 lines) with localStorage
   - Created `SearchHistory.tsx` component (126 lines)
   - Stores last 10 queries with timestamps and result counts
   - Click to re-execute, remove individual items, clear all
   - Auto-adds to history when search completes successfully

9. **✅ VBT-250: Clear and Reset Functionality**
   - Enhanced useSearch hook with `clearAll()` method
   - "Clear All" button (clears query + all filters)
   - ESC keyboard shortcut to clear everything
   - Proper state cleanup (cancels in-flight requests)

10. **✅ VBT-251: Integration Testing and Polish**
    - All components working together seamlessly
    - SearchTestPage with 3 comprehensive tabs (630+ lines)
    - Production build passing (no TypeScript errors)
    - All functionality tested and verified

**Files Created Today:**
- `client/src/components/search/DateRangeFilter.tsx` - Date range picker (268 lines)
- `client/src/components/search/ModelFilter.tsx` - Model dropdown (145 lines)
- `client/src/components/search/SearchModeToggle.tsx` - Mode toggle (96 lines)
- `client/src/components/search/SearchHistory.tsx` - History dropdown (126 lines)
- `client/src/hooks/useSearchHistory.ts` - History hook (175 lines)
- `docs/SESSION_2025-11-09_SUMMARY.md` - Session summary

**Files Modified Today:**
- `client/src/components/search/index.ts` - Added new component exports
- `client/src/components/search/types.ts` - Added SearchMode type
- `client/src/hooks/useSearch.ts` - Added clearAll() method
- `client/src/pages/SearchTestPage.tsx` - Enhanced with all new features, ESC handler

**Previous Session Files (2025-11-08):**
- `client/src/lib/api/search.ts` - Search API client (270 lines)
- `client/src/hooks/useSearch.ts` - Debounced search hook (380+ lines)
- `client/src/components/search/SearchContainer.tsx` - Integration component
- `client/src/components/search/SearchResults.tsx` - Results with highlighting
- `docs/SEARCH_TESTING_GUIDE.md` - Testing guide
- `docs/SESSION_2025-11-08_SUMMARY.md` - Previous session summary

**Current Application Status:**
- ✅ **Phase 5 (Chat History) - 100% COMPLETE!** 🎉
  - ✅ VBT-50: Backend Conversation Search API (10/10 sub-tasks)
  - ✅ VBT-49: Frontend Conversation Search UI (10/10 sub-tasks)
- ✅ All search features working and tested
- ✅ All filters functional (date range, model)
- ✅ Search mode toggle working (all vs conversation)
- ✅ Search history persisting to localStorage
- ✅ Clear all functionality with ESC shortcut
- ✅ Production builds passing (no TypeScript errors)

**Next Phase**: Phase 6 - MCP Integration

**To Resume Work:**
1. **Phase 5 is COMPLETE!** Ready to move to Phase 6
2. Check `development_tasks.md` for Phase 6 tasks
3. Phase 6 likely includes:
   - VBT-51: MCP Client Implementation
   - VBT-52: Tool Discovery and Selection
   - VBT-53: Tool Execution and Routing
   - VBT-54: Permission Management
4. **Phases Complete**: 1, 2, 3, 4, 5
5. **Overall MVP Progress**: ~85% complete
6. **Test Page Available**: http://localhost:5173/search-test

**Quick Start for Tomorrow:**
```bash
# Terminal 1 - Backend Server
cd /Users/cadugrillo/Typescript/vibebot
npm run dev

# Terminal 2 - Frontend Dev Server
cd /Users/cadugrillo/Typescript/vibebot/client
npm run dev

# Open browser: http://localhost:5173
# Backend runs on: http://localhost:5000
# Database: PostgreSQL on localhost:5432
```

**Important Technical Notes:**

1. **Search Debouncing Pattern**
   - useSearch hook implements 300ms debouncing using `use-debounce`
   - Raw `query` updates immediately, `debouncedQuery` updates 300ms after user stops typing
   - Search executes when `debouncedQuery` changes (not `query`)
   - Min 2 characters required before search triggers
   - Pattern: `const [debouncedQuery] = useDebounce(query, 300);`

2. **Request Cancellation**
   - useSearch maintains AbortController ref to cancel in-flight requests
   - When new search starts, old request is cancelled automatically
   - Prevents race conditions and unnecessary API calls
   - Cleanup on unmount: `abortControllerRef.current?.abort()`
   - Ignore AbortError in catch blocks (normal cancellation)

3. **Search Highlighting Implementation**
   - Backend provides highlight positions: `{ start: number, end: number, text: string }`
   - Frontend HighlightedText component splits text into segments
   - Highlights get `<mark>` tags with yellow background
   - Sort highlights by start position before rendering
   - Dark mode uses yellow-500/30 with transparency

4. **useSearch Hook State Management**
   - Returns 11 values: query, debouncedQuery, results, pagination, isLoading, error, filters, executionTime
   - Returns 4 functions: setQuery, clearSearch, setFilters, loadPage, executeSearch
   - Auto-search mode (default): searches automatically on query change
   - Manual mode: requires calling executeSearch()
   - Clears results immediately when query is empty (no debounce)

5. **SearchContainer Integration Pattern**
   - Combines SearchBar + SearchResults + useSearch in one component
   - Pass `showRelevanceScore={true}` to display search scores (debugging)
   - Handles all state internally - only needs `onSelectResult` callback
   - Example: `<SearchContainer mode="all" onSelectResult={(convId, msgId) => {...}} />`

**Test Commands:**
```bash
npm run test:ai-integration      # Run 42 integration tests (all passing)
npm run test:provider-factory    # Run 8 factory unit tests (23 assertions)
npm run test:provider-fallback   # Run 5 fallback unit tests (9 assertions)
npm run test:provider-unit       # Run all provider unit tests (32 assertions)
npm run test:conversation-api    # Run 16 conversation API integration tests
npm run test:message-api         # Run 10 message API integration tests
npm run test:search-api          # Run 12 search API integration tests (36 assertions)
```

**Test Coverage:**
- ✅ 42 AI integration tests passing (VBT-172 capabilities included)
- ✅ 23 factory unit test assertions passing
- ✅ 9 fallback unit test assertions passing
- ✅ 41 conversation API test assertions passing in 16 tests (VBT-182)
- ✅ 20 message API test assertions passing in 10 tests (VBT-193)
- ✅ 36 search API test assertions passing in 12 tests (VBT-241)
- ✅ **Total: 171 test assertions passing (100% pass rate)**

**Current Project State:**
- ✅ **Phase 1 (Foundation)** - COMPLETE
  - Backend infrastructure (Express, TypeScript, Prisma)
  - Frontend infrastructure (React, Vite, shadcn/ui)
  - Database (User, ApiKey, Conversation, Message, RefreshToken models)
  - Docker deployment (docker-compose.yml)
  - Documentation (README, DOCKER.md, DATABASE.md)

- ✅ **Phase 2 (Authentication)** - COMPLETE
  - JWT Authentication System (access/refresh tokens)
  - User Registration API & UI
  - User Login API & UI
  - Admin Unlock Endpoint
  - Account Lockout Protection
  - Frontend Auth Context & State Management
  - Protected Routes Component
  - Automatic Token Refresh
  - Security: HTTP-only cookies, bcrypt, rate limiting

- 🚧 **Phase 3 (Core Chat Backend)** - IN PROGRESS (VBT-39, VBT-40, VBT-42, VBT-171, VBT-172, VBT-173, VBT-38, VBT-43 complete!)
  - ✅ **WebSocket Server (VBT-39)** - COMPLETE (10/10 sub-tasks)
    - ✅ WebSocket server setup and infrastructure (ws package integrated with HTTP server)
    - ✅ WebSocket authentication with JWT (query parameter token verification)
    - ✅ Connection management (multi-tab support, user/conversation tracking)
    - ✅ Message event handlers (send/receive/stream with rate limiting: 10 msg/min)
    - ✅ Typing indicators (5-second auto-timeout, spam prevention)
    - ✅ Connection status events (established, authenticated, disconnected, error)
    - ✅ Error handling and reconnection logic (exponential backoff, max 5 retries)
    - ✅ Cleanup on disconnect (6-step comprehensive cleanup)
    - ✅ WebSocket client utility (frontend event emitter with auto-reconnect)
    - ✅ End-to-end testing (comprehensive test plan + interactive test client)
  - ✅ **Claude API Integration (VBT-40)** - COMPLETE (10/10 sub-tasks)
    - ✅ Claude TypeScript SDK setup (@anthropic-ai/sdk v0.68.0)
    - ✅ ClaudeService singleton with configuration management
    - ✅ Multi-model support (Sonnet 4.5, Haiku 4.5, Opus 4.1)
    - ✅ Streaming response handler with real-time callbacks
    - ✅ Token counting and usage tracking (database storage)
    - ✅ Rate limit detection and automatic retry (exponential backoff)
    - ✅ Comprehensive error handling (9 types, circuit breaker, severity levels)
    - ✅ Cost tracking system (per-model pricing, aggregation, reporting)
    - ✅ System prompt support (6 presets, validation, custom prompts)
    - ✅ Integration testing (9 tests, WebSocket simulation, all passing)
  - ✅ **AI Provider Abstraction Layer (VBT-42)** - COMPLETE (12/12 tasks)
    - ✅ Provider-agnostic architecture (IAIProvider interface, factory pattern)
    - ✅ RateLimitManager with exponential backoff and retry logic (170+ tests)
    - ✅ CircuitBreakerManager for preventing cascading failures (150+ tests)
    - ✅ ErrorLogger for structured logging and statistics (140+ tests)
    - ✅ SystemPromptManager with 6 presets and validation (180+ tests)
    - ✅ ProviderUtilities integration wrapper (130+ tests)
    - ✅ ClaudeProvider refactored to use new utilities
    - ✅ WebSocket handlers integrated with AI provider (AIIntegrationHandler)
    - ✅ Comprehensive testing (770+ utility tests, 17 integration tests passing)
    - ✅ Migration guide (300+ lines) and documentation (450+ lines README)
    - ✅ Old implementation deprecated with runtime warnings
    - ✅ Test suite: `npm run test:ai-integration` (all 17 tests passing)
  - ✅ **Provider Selection Logic (VBT-171)** - COMPLETE
    - ✅ ProviderSelector with 4 strategies (AUTO, COST, SPEED, QUALITY)
    - ✅ ProviderPreferenceManager for user/conversation preferences
    - ✅ ModelRegistry with 3 Claude models
    - ✅ FallbackChainManager for automatic failover
    - ✅ AIProviderFactory with singleton pattern and caching
    - ✅ Full integration with AIIntegrationHandler
  - ✅ **Provider Capabilities and Metadata (VBT-172)** - COMPLETE
    - ✅ ProviderStatus, ProviderRateLimits, ModelAvailability interfaces
    - ✅ IAIProvider methods for status, rate limits, availability
    - ✅ ClaudeProvider implementation with circuit breaker integration
    - ✅ 4 integration tests added (42 total integration tests passing)
  - ✅ **Comprehensive Unit Testing (VBT-173)** - COMPLETE
    - ✅ MockProvider (380 lines, full IAIProvider mock)
    - ✅ Factory unit tests (8 tests, 23 assertions)
    - ✅ Fallback unit tests (5 tests, 9 assertions)
    - ✅ Test scripts: test:provider-factory, test:provider-fallback, test:provider-unit
    - ✅ 74 total test assertions passing (100% pass rate)
  - ✅ **Conversation Management API (VBT-38)** - COMPLETE (10/10 sub-tasks)
    - ✅ TypeScript types/interfaces for DTOs, pagination, sorting (conversation.types.ts)
    - ✅ Zod validators for create, update, list queries, ID params (conversation.validators.ts)
    - ✅ Pagination utility with defaults and metadata generation (pagination.utils.ts)
    - ✅ Sorting utility with field whitelist and Prisma conversion (sorting.utils.ts)
    - ✅ Complete CRUD controllers (create, list, get, update, delete)
    - ✅ Authorization middleware for conversation ownership (conversation.middleware.ts)
    - ✅ Routes with rate limiting (10/min create, 30/min read) at /api/conversations
    - ✅ 16 integration tests covering all endpoints and edge cases
    - ✅ Comprehensive API documentation (docs/API_CONVERSATION.md)
    - ✅ Test script: npm run test:conversation-api
  - ✅ **Message Processing and Routing API (VBT-43)** - COMPLETE (10/10 sub-tasks)
    - ✅ Message types and DTOs (MessageMetadata, CreateMessageDTO, MessageResponseDTO, AIContextMessage)
    - ✅ Message validation schemas (createMessageSchema, listMessagesQuerySchema, messageIdSchema)
    - ✅ Enhanced message database service (createUserMessage, createAssistantMessage, pagination support)
    - ✅ Message history context builder (buildMessageContext with token estimation and message limits)
    - ✅ Message controller implementation (create, list, get with 202 Accepted pattern)
    - ✅ AI response processing integration (AIMessageProcessorService with WebSocket streaming)
    - ✅ Message routes and middleware (rate limiting: 20/min send, 60/min read)
    - ✅ Error handling (implemented via AI provider layer)
    - ✅ Token tracking (implemented via MessageMetadata)
    - ✅ 10 integration tests covering all endpoints and edge cases
  - ⏳ OpenAI provider implementation (VBT-41 - deferred to Phase 7)

**Phase 3 Complete!**

- 🚧 **Phase 4 (Core Chat Frontend)** - IN PROGRESS
  - ✅ **Main Chat Interface Layout (VBT-34)** - COMPLETE
    - ✅ Responsive layout with collapsible sidebar
    - ✅ Header with conversation title display
    - ✅ Conversation list with active state highlighting
    - ✅ Mobile-optimized navigation (hamburger menu)
    - ✅ Settings and profile integration points
  - ✅ **Message Display Component (VBT-35)** - COMPLETE (10/10 sub-tasks)
    - ✅ Component structure with message bubbles (Message.tsx, types.ts)
    - ✅ Markdown rendering with react-markdown and remark-gfm
    - ✅ Code syntax highlighting with react-syntax-highlighter (VS Code Dark+)
    - ✅ Timestamp display with date-fns (relative time + hover tooltip)
    - ✅ Copy message button with clipboard API and toast notifications (sonner)
    - ✅ Avatar display with lucide-react Bot/User icons
    - ✅ Loading animations (TypingIndicator with animated dots, MessageSkeleton)
    - ✅ Error states with retry button functionality
    - ✅ Message list container with auto-scroll and message grouping
    - ✅ Integration in ChatPage with mock messages, production build passing
  - ✅ **Message Input Component (VBT-36)** - COMPLETE (10/10 sub-tasks: VBT-201-210)
    - ✅ shadcn/ui Textarea with auto-expanding (60px-200px)
    - ✅ Send button with loading state and keyboard shortcuts
    - ✅ Character count with color-coded warnings
    - ✅ File upload with image paste support
    - ✅ Loading state with disabled input
    - ✅ Clear input after send with state reset
    - ✅ ChatPage integration with sticky bottom positioning
    - ✅ Testing and production build verification

**Phase 4 Complete!**

- ✅ **Phase 5 (Chat History)** - COMPLETE! 🎉
  - ✅ **Backend Conversation Search API (VBT-50)** - COMPLETE (10/10 sub-tasks: VBT-232-241)
    - ✅ Search Types and DTOs (SearchMatch, MatchHighlight, SearchFilters, SearchPaginationMeta)
    - ✅ Search Validation Schemas (Zod validators with query sanitization)
    - ✅ Full-text Search Service (Prisma-based, case-insensitive, deduplication)
    - ✅ Search Filters (date range, model, user - combined with AND logic)
    - ✅ Relevance Scoring (multi-factor: match type, frequency, exact match, recency)
    - ✅ Match Highlighting (context extraction, highlight positions)
    - ✅ Search Controller (3 endpoints: global search, conversation search, stats)
    - ✅ Search Routes and Rate Limiting (30 requests/minute)
    - ✅ Performance Optimization (B-tree indexes on title and model fields)
    - ✅ Integration Tests (12 tests, 36 assertions, 100% passing)
  - ✅ **Frontend Conversation Search UI (VBT-49)** - COMPLETE (10/10 sub-tasks: VBT-242-251)
    - ✅ Search UI Components Structure (SearchBar, SearchResults, SearchFilters, types)
    - ✅ Search API Client (searchConversations, searchInConversation, getSearchStats)
    - ✅ Real-time Search with Debouncing (useSearch hook, 300ms, request cancellation)
    - ✅ Search Results with Highlighting (enhanced visual design, relevance scores)
    - ✅ Date Range Filter (DateRangeFilter with presets, calendar picker)
    - ✅ Model Filter (ModelFilter with dropdown, 3 AI models)
    - ✅ Search Mode Toggle (SearchModeToggle, all vs conversation)
    - ✅ Search History (useSearchHistory hook, localStorage, recent searches)
    - ✅ Clear and Reset (clearAll method, ESC shortcut)
    - ✅ Integration Testing and Polish (SearchTestPage, production ready)

**Phase 5 Complete!**

## Architecture

### Tech Stack
- **Backend**: Node.js 20 / TypeScript 5.9 with Express.js
- **Frontend**: React 19 with Vite 7 and shadcn/ui components
- **Database**: PostgreSQL 16 with Prisma ORM
- **Cache**: Redis 7 for sessions and caching
- **Containerization**: Docker Compose with multi-stage builds
- **Real-time**: WebSocket (ws package) integrated with HTTP server for streaming and real-time features

### Key System Components

1. **Authentication Layer** ✅ **FULLY IMPLEMENTED**
   - ✅ JWT-based authentication (access tokens: 15min, refresh tokens: 7 days)
   - ✅ User registration API with email/password validation
   - ✅ User registration UI with password strength indicator and terms/privacy pages
   - ✅ User login API with account lockout protection (5 attempts, 15min lock)
   - ✅ User login UI with responsive design
   - ✅ Role-based access control (ADMIN, USER, GUEST)
   - ✅ HTTP-only secure cookies for token storage
   - ✅ Rate limiting for brute force protection (5 req/15min)
   - ✅ Admin unlock endpoint for account management
   - ✅ Auth context and protected routes with automatic token refresh
   - ✅ Token storage utilities (localStorage with documented security trade-offs)
   - ✅ API client with automatic 401 handling and token refresh
   - ⏳ Per-user API key management UI (database ready, UI in Phase 7)

2. **Conversation Management**
   - Conversation CRUD operations
   - Message history storage
   - Conversation branching from any point
   - Search across chat history
   - Export functionality (PDF, Markdown, JSON)

3. **AI Provider Abstraction**
   - Unified interface for Claude and OpenAI APIs
   - Model switching mid-conversation
   - Streaming response handling
   - Cost tracking per user/conversation

4. **MCP Integration**
   - MCP client implementation for tool connectivity
   - Tool discovery and selection
   - Tool execution and routing
   - Permission management

5. **Real-time Communication** ✅ **FULLY IMPLEMENTED (VBT-39 COMPLETE)**
   - ✅ **Backend WebSocket Server:**
     - WebSocket server infrastructure (ws package integrated with Express HTTP server)
     - JWT authentication for connections (token via query parameter)
     - Connection manager with multi-tab support (track by userId and conversationId)
     - Message event handlers with rate limiting (10 msg/min):
       - message:send - User sends message
       - message:receive - Broadcast to conversation participants
       - message:stream - AI response streaming with completion flag
       - message:ack - Delivery acknowledgment (success/error)
     - Typing indicators with 5-second auto-stop and spam prevention (1s min interval)
     - Connection status events (established, authenticated, disconnected, error)
     - Heartbeat mechanism (30-second intervals) for connection health
     - Conversation-based broadcasting (send to all participants)
     - User-based messaging (all user tabs receive messages)
   - ✅ **Error Handling & Recovery:**
     - Comprehensive error categorization (AUTH, CONNECTION, MESSAGE, RATE_LIMIT, VALIDATION, INTERNAL, NETWORK)
     - Error severity levels (LOW, MEDIUM, HIGH, CRITICAL)
     - Automatic reconnection with exponential backoff (1s to 30s with jitter)
     - Max 5 retry attempts before giving up
     - Message queue during disconnection (max 100 messages)
   - ✅ **Cleanup System:**
     - 6-step cleanup on disconnect: notification, typing state, timers, listeners, connection removal, logging
     - Disconnect type categorization (GRACEFUL, FORCED, TIMEOUT, ERROR, SHUTDOWN)
     - Error-tolerant cleanup (continues even if steps fail)
   - ✅ **Frontend WebSocket Client:**
     - Full-featured WebSocket client utility (599 lines)
     - Event emitter pattern (on/off/offAll subscription methods)
     - Automatic reconnection using ReconnectionManager
     - Message queuing with MessageQueue (FIFO, max 100)
     - Connection state management (6 states)
     - 15+ event types with full TypeScript definitions
     - Singleton pattern with factory function
   - ✅ **Testing:**
     - Comprehensive test plan (WEBSOCKET_TEST_PLAN.md) with 10 test scenarios
     - Interactive test client (websocket-test.html) for manual verification
     - All 10 acceptance criteria verified and passing

## Development Phases

The project follows an 8-week MVP development plan (see `development_tasks.md`):

1. **Phase 1 (Weeks 1-2)**: Foundation - Project structure, database, Docker
2. **Phase 2 (Weeks 2-3)**: Authentication - User registration/login
3. **Phase 3 (Weeks 3-4)**: Core Chat Backend - WebSocket, Claude API, message routing
4. **Phase 4 (Weeks 4-5)**: Core Chat Frontend - UI for chat interface
5. **Phase 5 (Weeks 5-6)**: Chat History - Persistence and search
6. **Phase 6 (Weeks 6-7)**: MCP Integration - Tool capabilities
7. **Phase 7 (Weeks 7-8)**: Polish MVP - User profiles, settings, OpenAI support

## Key Design Principles

- **Security First**: User API keys stored securely, rate limiting, sandboxed tool execution
- **User-Centric**: Each user manages their own API keys (no shared account billing)
- **Real-time Experience**: Streaming responses via WebSocket, not polling
- **Extensibility**: Plugin/extension system, MCP server marketplace support
- **Privacy**: Self-hosted deployment, optional end-to-end encryption

## Development Workflow

### Backend Commands
```bash
npm run dev           # Start development server with auto-reload
npm run build         # Compile TypeScript to dist/
npm run start         # Run compiled server
npm run lint          # Check for linting errors
npm run lint:fix      # Auto-fix linting errors
npm run format        # Format code with Prettier
npm run format:check  # Check if code is formatted
```

### Database Commands
```bash
npm run db:migrate    # Run database migrations
npm run db:seed       # Populate database with test data
npm run db:studio     # Open Prisma Studio UI
npm run db:reset      # Reset database and re-run migrations
```

### Frontend Commands
```bash
cd client
npm run dev           # Start frontend development server
npm run build         # Build for production
npm run lint          # Check for linting errors
npm run format        # Format code with Prettier
```

### Development Guidelines

1. Test incrementally after each story/component
2. Build backend APIs before corresponding frontend components
3. Commit frequently with clear messages referencing story IDs (e.g., "VBT-21: Initialize backend project")
4. Use database migrations for schema changes (never modify the database directly)

## Important Context

- This is a **solo developer project** - prioritize MVP features over nice-to-haves
- The development sequence in `development_tasks.md` is optimized for getting to a working product quickly
- MCP (Model Context Protocol) support is a core differentiator - prioritize this in Phase 6
- Users bring their own API keys - the app doesn't proxy or pay for API calls
