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

Remaining Phase 3 Tasks:
- ⏳ Conversation management API
- ⏳ Message processing and routing
- ⏳ OpenAI provider implementation

See `development_tasks.md` for the complete development sequence.

---

## 📍 Where to Pick Up

**Last Completed**: VBT-173 - Comprehensive Unit Testing (✅ COMPLETE!)

**Next Task**: Check Jira for next Phase 3 story (Conversation Management API or OpenAI Provider)

**To Resume Work:**
1. Check Jira for the next Phase 3 story
2. VBT-39 (WebSocket Server) is complete with all 10 sub-tasks ✅
3. VBT-40 (Claude API Integration) is complete with all 10 sub-tasks ✅
4. VBT-42 (AI Provider Abstraction Layer) is complete with all 12 tasks ✅
5. VBT-171 (Provider Selection Logic) is complete ✅
6. VBT-172 (Provider Capabilities and Metadata) is complete ✅
7. VBT-173 (Comprehensive Unit Testing) is complete ✅
8. Remaining Phase 3 work: Conversation management API, OpenAI provider implementation

**Test Commands:**
```bash
npm run test:ai-integration      # Run 42 integration tests (all passing)
npm run test:provider-factory    # Run 8 factory unit tests (23 assertions)
npm run test:provider-fallback   # Run 5 fallback unit tests (9 assertions)
npm run test:provider-unit       # Run all provider unit tests (32 assertions)
```

**Test Coverage:**
- ✅ 42 integration tests passing (VBT-172 capabilities included)
- ✅ 23 factory unit test assertions passing
- ✅ 9 fallback unit test assertions passing
- ✅ **Total: 74 test assertions passing (100% pass rate)**

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

- 🚧 **Phase 3 (Core Chat Backend)** - IN PROGRESS (VBT-39, VBT-40, VBT-42, VBT-171, VBT-172, VBT-173 complete!)
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
  - ⏳ Conversation management API (upcoming)
  - ⏳ Message processing and routing (upcoming)
  - ⏳ OpenAI provider implementation (upcoming)

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
