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

**Phase 1 (Foundation) - In Progress**

Completed:
- ✅ VBT-21: Backend Node.js/TypeScript project initialized
- ✅ VBT-22: Frontend React + shadcn/ui project initialized
- ✅ VBT-23: Database setup with PostgreSQL and Prisma ORM

Next: VBT-24 (Docker Configuration), VBT-25 (Setup Documentation)

See `development_tasks.md` for the complete development sequence.

## Planned Architecture

### Tech Stack
- **Backend**: Node.js/TypeScript with Express
- **Frontend**: React with Vite and shadcn/ui components
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: WebSocket for streaming AI responses (planned)
- **Containerization**: Docker for deployment (planned)

### Key System Components

1. **Authentication Layer**
   - JWT-based authentication
   - User registration/login
   - Role-based access control (admin, user, guest)
   - Per-user API key management (users bring their own Claude/OpenAI keys)

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
