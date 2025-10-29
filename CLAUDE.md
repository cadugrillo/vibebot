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

**Phase 2 Complete!** Ready for Phase 3 (Core Chat Backend)

See `development_tasks.md` for the complete development sequence.

---

## 📍 Where to Pick Up

**Last Completed**: VBT-31 - Frontend Authentication State Management (Phase 2 complete!)

**Next Phase**: Phase 3 - Core Chat Backend (WebSocket, Claude API, message routing)

**To Resume Work:**
1. Check Jira for Phase 3 stories or read development_tasks.md
2. First story in Phase 3 should be WebSocket server setup

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

- ⏭️ **Phase 3 (Core Chat Backend)** - READY TO START
  - WebSocket server setup
  - Claude API integration
  - Message routing and streaming
  - Conversation management

## Architecture

### Tech Stack
- **Backend**: Node.js 20 / TypeScript 5.9 with Express.js
- **Frontend**: React 19 with Vite 7 and shadcn/ui components
- **Database**: PostgreSQL 16 with Prisma ORM
- **Cache**: Redis 7 for sessions and caching
- **Containerization**: Docker Compose with multi-stage builds
- **Real-time**: WebSocket for streaming AI responses (planned for Phase 3)

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

5. **Real-time Communication**
   - WebSocket server for message streaming
   - Typing indicators
   - Connection management

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
