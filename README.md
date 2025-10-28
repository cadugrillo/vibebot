# VibeBot

**A self-hosted multi-user AI Agent application** with support for Claude and OpenAI APIs, MCP server integration, and comprehensive conversation management.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)

## Features

### Current (MVP - Phase 1 Complete)

- ✅ **Backend Infrastructure**: Node.js/TypeScript with Express
- ✅ **Frontend**: React + Vite + shadcn/ui
- ✅ **Database**: PostgreSQL with Prisma ORM
- ✅ **Docker Support**: Full containerized deployment
- ✅ **User Management**: Authentication with roles (Admin, User, Guest)
- ✅ **API Key Management**: Per-user encrypted storage for Claude/OpenAI keys
- ✅ **Conversation System**: Multi-user chat with history

### Planned Features

#### 1. Authentication & User Management

- User registration and login system
- Role-based access control (admin, user, guest)
- API key management per user (users can add their own Claude/OpenAI keys)
- User quotas and rate limiting
- Session management and security

#### 2. Chat & Conversation Features

- Conversation branching (create alternate versions from any point)
- Search across chat history
- Export conversations (PDF, Markdown, JSON)
- Conversation sharing and collaboration
- Conversation templates/presets
- Chat folders or organization/tagging system

#### 3. Model & Configuration Management

- Model switching mid-conversation
- Custom system prompts per chat or globally
- Temperature and other parameter controls
- Model comparison mode (run same prompt on different models)
- Cost tracking per user/conversation

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
│   ├── utils/            # Utility functions
│   └── server.ts         # Main server file
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities
│   │   └── types/        # TypeScript types
│   └── public/           # Static assets
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Prisma schema
│   ├── migrations/       # Database migrations
│   ├── seed.ts          # Seed data script
│   └── DATABASE.md      # Database documentation
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile           # Backend Docker image
└── DOCKER.md           # Docker deployment guide
```

## Database Schema

See [prisma/DATABASE.md](./prisma/DATABASE.md) for complete database documentation.

**Core Models:**
- **User**: Authentication and profile
- **ApiKey**: Encrypted AI provider API keys (per user)
- **Conversation**: Chat sessions
- **Message**: Individual messages (USER, ASSISTANT, SYSTEM)

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

## Contributing

This is currently a solo developer project. Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Development Roadmap

See [development_tasks.md](./development_tasks.md) for the complete 8-week MVP development plan.

**Current Phase**: Phase 1 - Foundation ✅
**Next Phase**: Phase 2 - Authentication (Weeks 2-3)

## Security

- User passwords are hashed with bcrypt
- API keys are encrypted before storage
- JWT-based authentication
- CORS protection
- SQL injection protection via Prisma ORM
- Non-root Docker containers
- Environment-based secrets

## License

ISC © Carlos Grillo

## Support

For issues and questions:
- GitHub Issues: https://github.com/cadugrillo/vibebot/issues
- Development Guide: See [CLAUDE.md](./CLAUDE.md)
- Docker Guide: See [DOCKER.md](./DOCKER.md)

---

**Note**: This project is in active development. See the roadmap for planned features and current status.