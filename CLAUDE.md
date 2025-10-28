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

This is an **early-stage project** currently in the planning phase. The codebase contains documentation but no implementation yet. See `development_tasks.md` for the planned development sequence.

## Planned Architecture

### Tech Stack (Planned)
- **Backend**: Node.js/TypeScript with Express or similar
- **Frontend**: React with shadcn/ui components
- **Database**: PostgreSQL with Prisma or TypeORM
- **Real-time**: WebSocket for streaming AI responses
- **Containerization**: Docker for deployment

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

Since the codebase is not yet initialized, when implementing:

1. Start with backend infrastructure (VBT-21: Node.js/TypeScript setup)
2. Set up database schema early (VBT-23)
3. Implement authentication before feature development
4. Build backend APIs before corresponding frontend components
5. Test incrementally after each story/component
6. Commit frequently with clear messages referencing story IDs (e.g., "VBT-21: Initialize backend project")

## Important Context

- This is a **solo developer project** - prioritize MVP features over nice-to-haves
- The development sequence in `development_tasks.md` is optimized for getting to a working product quickly
- MCP (Model Context Protocol) support is a core differentiator - prioritize this in Phase 6
- Users bring their own API keys - the app doesn't proxy or pay for API calls
