# VibeBot

**A self-hosted multi-user AI Agent application** with support for Claude and OpenAI APIs, MCP server integration, and comprehensive conversation management.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)

## Features

### Current (MVP - Phase 2 Complete, Phase 3 Partial - VBT-39 & VBT-40 Complete)

- ✅ **Backend Infrastructure**: Node.js/TypeScript with Express
- ✅ **Frontend**: React + Vite + shadcn/ui
- ✅ **Database**: PostgreSQL with Prisma ORM
- ✅ **Docker Support**: Full containerized deployment
- ✅ **JWT Authentication**: Access tokens (15min) and refresh tokens (7 days)
- ✅ **User Registration**: Email/password with validation and role assignment
- ✅ **User Login**: Account lockout protection (5 attempts, 15min lock)
- ✅ **Admin Features**: Account unlock endpoint for user management
- ✅ **Security**: HTTP-only cookies, bcrypt hashing, rate limiting
- ✅ **Frontend Auth**: React Context, protected routes, automatic token refresh
- ✅ **Token Management**: Automatic refresh on 401, proactive refresh before expiry
- ✅ **WebSocket Server**: Real-time communication infrastructure (ws package integrated with HTTP server)
- ✅ **WebSocket Auth**: JWT authentication for WebSocket connections (query parameter)
- ✅ **Connection Manager**: Multi-tab support, user and conversation tracking
- ✅ **Message Handlers**: Send/receive/stream with rate limiting (10 msg/min)
- ✅ **Typing Indicators**: Auto-stop after 5 seconds, spam prevention (1s min interval)
- ✅ **Connection Events**: Full lifecycle tracking (established, authenticated, disconnected, error)
- ✅ **Heartbeat System**: 30-second intervals for connection health monitoring
- ✅ **WebSocket Error Handling**: Exponential backoff reconnection (1s-30s, max 5 retries)
- ✅ **WebSocket Cleanup**: 6-step comprehensive cleanup on disconnect
- ✅ **WebSocket Client**: Frontend utility with event emitter and auto-reconnect (599 lines)
- ✅ **Message Queue**: Queue messages during disconnect (FIFO, max 100)
- ✅ **WebSocket Testing**: Comprehensive test plan + interactive test client
- ✅ **Claude API Integration**: Full support for Anthropic's Claude API (@anthropic-ai/sdk v0.68.0)
- ✅ **Multi-Model Support**: Claude 4.5 Sonnet, Haiku 4.5, Opus 4.1 with automatic model selection
- ✅ **Streaming Responses**: Real-time AI response streaming with event-based callbacks
- ✅ **Token Counting**: Input/output/cache token tracking with database storage
- ✅ **Cost Tracking**: Per-model pricing, cost aggregation, reporting utilities
- ✅ **Rate Limit Handling**: Automatic retry with exponential backoff for 429 errors
- ✅ **Error Handling**: 9 error types, circuit breaker pattern, severity levels
- ✅ **System Prompts**: 6 built-in presets (coding, writing, analysis, etc.) + custom prompts
- ✅ **Integration Testing**: 9 comprehensive tests, all passing, WebSocket compatible
- ⏳ **API Key Management**: Per-user encrypted storage for Claude/OpenAI keys (database ready, UI in Phase 7)
- ⏳ **Conversation System**: Multi-user chat with history (database ready, remaining Phase 3)

### Planned Features

#### 1. Remaining Authentication Features

- API key management UI per user (users can add their own Claude/OpenAI keys)
- User quotas and usage tracking
- Session management dashboard

#### 2. Chat & Conversation Features

- Conversation branching (create alternate versions from any point)
- Search across chat history
- Export conversations (PDF, Markdown, JSON)
- Conversation sharing and collaboration
- Conversation templates/presets
- Chat folders or organization/tagging system

#### 3. Model & Configuration Management

- Model switching mid-conversation
- ✅ Custom system prompts per chat or globally (6 presets + custom)
- Temperature and other parameter controls
- Model comparison mode (run same prompt on different models)
- ✅ Cost tracking per user/conversation (completed)

#### 4. Tool & Integration Features

- Custom tool creation interface
- Tool permissions and sandboxing
- MCP server discovery and marketplace
- Webhook integrations
- File upload and processing capabilities
- Code execution environment

#### 5. Advanced AI Features

- Memory/context management across conversations
- Scheduled agents (cron-like automation)
- Multi-agent collaboration (agents working together)
- Prompt library and versioning
- A/B testing for prompts

#### 6. Developer & Admin Features

- Admin dashboard with usage analytics
- API for programmatic access
- Logging and monitoring
- Backup and restore functionality
- Plugin/extension system
- Rate limiting and abuse prevention

#### 7. UI/UX Enhancements

- Dark/light mode
- Mobile-responsive design
- Keyboard shortcuts
- Real-time typing indicators
- Markdown rendering with code highlighting
- Voice input/output
- Accessibility features (WCAG compliance)

#### 8. Data & Privacy

- Local/on-premise data storage
- End-to-end encryption options
- Data retention policies
- GDPR compliance features
- Audit logs

#### 9. Performance & Scalability

- Caching layer for responses
- Queue system for long-running tasks
- Horizontal scaling support
- Database optimization
- CDN for static assets

---

## Quick Start

### Docker Deployment (Recommended)

The easiest way to get started is with Docker:

```bash
# Clone the repository
git clone https://github.com/cadugrillo/vibebot.git
cd vibebot

# Configure environment
cp .env.docker .env
# Edit .env and set secure passwords and secrets

# Start all services
docker-compose up -d

# Access the application
open http://localhost
```

**See [DOCKER.md](./DOCKER.md) for complete Docker deployment documentation.**

### Local Development

#### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm or yarn

#### Backend Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database connection

# Run database migrations
npm run db:migrate

# Seed database with test data
npm run db:seed

# Start development server
npm run dev
```

#### Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

## Tech Stack

### Backend
- **Runtime**: Node.js 20
- **Language**: TypeScript 5.9
- **Framework**: Express.js
- **Database**: PostgreSQL 16 with Prisma ORM
- **Cache**: Redis 7
- **Authentication**: JWT with bcrypt
- **WebSocket**: ws package (integrated with HTTP server)
- **AI Integration**: @anthropic-ai/sdk v0.68.0 (Claude API)

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 7
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **Routing**: React Router 7
- **Styling**: Tailwind CSS 4

### DevOps
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (for frontend in production)
- **Code Quality**: ESLint, Prettier

## Project Structure

```
vibebot/
├── src/                    # Backend source code
│   ├── config/            # Configuration files
│   ├── controllers/       # Request handlers
│   ├── middleware/        # Express middleware
│   ├── models/           # (Future) Business logic
│   ├── routes/           # API routes
│   ├── services/         # Service layer
│   │   ├── ai/           # AI service integrations
│   │   │   ├── claude/   # Claude API integration
│   │   │   │   ├── ClaudeService.ts
│   │   │   │   ├── models.ts
│   │   │   │   ├── streaming.ts
│   │   │   │   ├── rate-limit.ts
│   │   │   │   ├── error-handler.ts
│   │   │   │   ├── circuit-breaker.ts
│   │   │   │   └── system-prompts.ts
│   │   │   ├── usage-tracking.ts
│   │   │   └── cost-reporting.ts
│   ├── websocket/        # WebSocket server
│   │   ├── server.ts
│   │   ├── connectionManager.ts
│   │   ├── handlers/
│   │   └── errorHandler.ts
│   ├── utils/            # Utility functions
│   └── server.ts         # Main server file
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities (incl. WebSocket client)
│   │   └── types/        # TypeScript types
│   └── public/           # Static assets
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Prisma schema
│   ├── migrations/       # Database migrations
│   ├── seed.ts          # Seed data script
│   └── DATABASE.md      # Database documentation
├── docs/                 # Documentation
│   ├── VBT-163-INTEGRATION-TEST-PLAN.md
│   └── VBT-40-CLAUDE-API-COMPLETE.md
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile           # Backend Docker image
├── DOCKER.md            # Docker deployment guide
└── development_tasks.md # Development roadmap
```

## Database Schema

See [prisma/DATABASE.md](./prisma/DATABASE.md) for complete database documentation.

**Core Models:**
- **User**: Authentication and profile
- **RefreshToken**: JWT refresh token management
- **ApiKey**: Encrypted AI provider API keys (per user)
- **Conversation**: Chat sessions with optional system prompts
- **Message**: Individual messages (USER, ASSISTANT, SYSTEM)
- **MessageMetadata**: Token usage and cost tracking (JSON fields for flexibility)

## Development

### Available Commands

**Backend:**
```bash
npm run dev           # Start development server
npm run build         # Compile TypeScript
npm run start         # Run compiled server
npm run lint          # Check code quality
npm run format        # Format code
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed database
npm run db:studio     # Open Prisma Studio
```

**Frontend:**
```bash
cd client
npm run dev           # Start dev server
npm run build         # Build for production
npm run lint          # Check code quality
npm run format        # Format code
```

**Testing (Backend):**
```bash
# Claude API Integration Tests
npx tsx src/services/ai/claude/test-models.ts         # Test multi-model support
npx tsx src/services/ai/claude/test-streaming.ts      # Test streaming responses
npx tsx src/services/ai/claude/test-error-handling.ts # Test error handling
npx tsx src/services/ai/claude/test-system-prompts.ts # Test system prompts
npx tsx src/services/ai/test-cost-tracking.ts         # Test cost tracking
npx tsx src/services/ai/claude/test-integration.ts    # Full integration test (9 scenarios)
```

## Contributing

This is currently a solo developer project. Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Development Roadmap

See [development_tasks.md](./development_tasks.md) for the complete 8-week MVP development plan.

**Completed Phases**:
- ✅ **Phase 1 - Foundation** (Weeks 1-2): Project structure, database, Docker
- ✅ **Phase 2 - Authentication** (Weeks 2-3): JWT, registration, login, auth context

**Current Phase**: 🚧 **Phase 3 - Core Chat Backend** (40% Complete - 2 of 5 stories done)

**Completed Stories:**

- ✅ **VBT-39: WebSocket Server for Real-time Communication** - COMPLETE (10/10 sub-tasks)
  - ✅ WebSocket Server Infrastructure (VBT-144) - ws package integrated with HTTP server
  - ✅ WebSocket Authentication (VBT-145) - JWT via query parameter
  - ✅ Connection Manager (VBT-146) - Multi-tab support, user/conversation tracking
  - ✅ Message Event Handlers (VBT-147) - Send/receive/stream with rate limiting (10 msg/min)
  - ✅ Typing Indicators (VBT-148) - 5s auto-stop, spam prevention
  - ✅ Connection Status Events (VBT-149) - Full lifecycle tracking
  - ✅ Error Handling & Reconnection (VBT-150) - Exponential backoff, max 5 retries
  - ✅ Cleanup on Disconnect (VBT-151) - 6-step comprehensive cleanup
  - ✅ WebSocket Client Utility (VBT-152) - 599 lines, event emitter, auto-reconnect
  - ✅ End-to-End Testing (VBT-153) - Test plan + interactive test client

- ✅ **VBT-40: Claude API Integration** - COMPLETE (10/10 sub-tasks)
  - ✅ Claude TypeScript SDK Setup (VBT-154) - @anthropic-ai/sdk v0.68.0
  - ✅ Service Layer & Configuration (VBT-155) - ClaudeService singleton
  - ✅ Multi-Model Support (VBT-156) - Sonnet 4.5, Haiku 4.5, Opus 4.1
  - ✅ Streaming Response Handler (VBT-157) - Real-time callbacks, token tracking
  - ✅ Token Counting & Usage Tracking (VBT-158) - Database storage, aggregation
  - ✅ Rate Limit Detection (VBT-159) - 429 errors, automatic retry, exponential backoff
  - ✅ Error Handling (VBT-160) - 9 types, circuit breaker, severity levels
  - ✅ Cost Tracking System (VBT-161) - Per-model pricing, reporting utilities
  - ✅ System Prompt Support (VBT-162) - 6 presets, validation, custom prompts
  - ✅ Integration Testing (VBT-163) - 9 tests, WebSocket simulation, all passing

**Remaining Phase 3 Tasks:**
- ⏳ **VBT-42**: AI Provider Abstraction Layer
- ⏳ **VBT-38**: Conversation Management API
- ⏳ **VBT-43**: Message Processing and Routing API

**Last Completed**: VBT-163 (Integration Testing with WebSocket Server) - VBT-40 Story Complete!

**Next Task**: VBT-42 (AI Provider Abstraction Layer), VBT-38 (Conversation Management), or VBT-43 (Message Processing)

## Security

- **Password Security**: Bcrypt hashing with 12 salt rounds
- **Authentication**: JWT with HTTP-only secure cookies (access: 15min, refresh: 7 days)
- **Account Protection**: Failed login tracking with automatic lockout (5 attempts, 15min lock)
- **Rate Limiting**: Brute force prevention (5 requests per 15 minutes)
- **Role-Based Access**: Admin, User, and Guest roles with middleware enforcement
- **API Keys**: Encrypted storage for Claude/OpenAI keys (database ready)
- **CORS Protection**: Configurable origin with credentials support
- **SQL Injection**: Protected via Prisma ORM parameterized queries
- **Docker Security**: Non-root container users
- **Secrets Management**: Environment-based configuration

## License

ISC © Carlos Grillo

## Support

For issues and questions:
- GitHub Issues: https://github.com/cadugrillo/vibebot/issues
- Development Guide: See [CLAUDE.md](./CLAUDE.md)
- Docker Guide: See [DOCKER.md](./DOCKER.md)

---

**Note**: This project is in active development. See the roadmap for planned features and current status.