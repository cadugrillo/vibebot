# Database Schema Documentation

## Overview

VibeBot uses PostgreSQL as the database with Prisma ORM for type-safe database access. The schema is designed to support multi-user AI conversations with secure API key management.

## Database Models

### User

Stores user account information and authentication details.

**Fields:**
- `id` (String, Primary Key): Unique identifier (CUID)
- `email` (String, Unique): User's email address
- `password` (String): Hashed password using bcrypt
- `name` (String, Optional): User's display name
- `role` (UserRole): User role (ADMIN, USER, GUEST) - defaults to USER
- `createdAt` (DateTime): Account creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Relationships:**
- One-to-Many with `Conversation` (user can have multiple conversations)
- One-to-Many with `Message` (user can send multiple messages)
- One-to-Many with `ApiKey` (user can have multiple API keys)

**Indexes:**
- Unique index on `email`

---

### ApiKey

Stores encrypted API keys for AI providers (Claude, OpenAI) per user.

**Fields:**
- `id` (String, Primary Key): Unique identifier (CUID)
- `userId` (String, Foreign Key): Reference to User
- `provider` (ApiKeyProvider): API provider (CLAUDE, OPENAI)
- `encryptedKey` (String): Encrypted API key
- `name` (String, Optional): User-friendly name for the key
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Relationships:**
- Many-to-One with `User` (belongs to a user)

**Indexes:**
- Index on `userId` for faster queries

**Security Notes:**
- API keys are encrypted before storage
- Users manage their own API keys (no shared billing)
- Cascade delete when user is deleted

---

### Conversation

Represents a chat conversation between a user and AI.

**Fields:**
- `id` (String, Primary Key): Unique identifier (CUID)
- `userId` (String, Foreign Key): Reference to User
- `title` (String): Conversation title (defaults to "New Conversation")
- `model` (String, Optional): AI model used (e.g., "claude-3-5-sonnet", "gpt-4")
- `systemPrompt` (String, Optional): Custom system prompt for the conversation
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Relationships:**
- Many-to-One with `User` (belongs to a user)
- One-to-Many with `Message` (contains multiple messages)

**Indexes:**
- Index on `userId` for filtering by user
- Index on `createdAt` for sorting by date

**Features:**
- Support for conversation branching (future enhancement)
- Model switching mid-conversation
- Custom system prompts per conversation

---

### Message

Stores individual messages within conversations.

**Fields:**
- `id` (String, Primary Key): Unique identifier (CUID)
- `conversationId` (String, Foreign Key): Reference to Conversation
- `userId` (String, Optional, Foreign Key): Reference to User (for user messages)
- `role` (MessageRole): Message role (USER, ASSISTANT, SYSTEM)
- `content` (String): Message content
- `metadata` (JSON, Optional): Additional metadata (tokens, cost, etc.)
- `createdAt` (DateTime): Creation timestamp

**Relationships:**
- Many-to-One with `Conversation` (belongs to a conversation)
- Many-to-One with `User` (belongs to a user, nullable for assistant messages)

**Indexes:**
- Index on `conversationId` for filtering by conversation
- Index on `createdAt` for ordering messages

**Notes:**
- `userId` is optional because assistant/system messages don't have a user
- `metadata` can store additional information like token count, costs, model parameters

---

## Enums

### UserRole
- `ADMIN`: Full system access
- `USER`: Standard user with conversation access
- `GUEST`: Limited access (if implemented)

### MessageRole
- `USER`: Message from the user
- `ASSISTANT`: Message from AI
- `SYSTEM`: System-generated message

### ApiKeyProvider
- `CLAUDE`: Anthropic Claude API
- `OPENAI`: OpenAI API

---

## Relationships Diagram

```
User
  ├── Conversations (1:N)
  │     └── Messages (1:N)
  ├── Messages (1:N)
  └── ApiKeys (1:N)
```

---

## Database Commands

### Migrations
```bash
npm run db:migrate       # Run pending migrations
npm run db:reset         # Reset database and re-run all migrations
```

### Seed Data
```bash
npm run db:seed          # Populate database with test data
```

### Prisma Studio
```bash
npm run db:studio        # Open Prisma Studio UI
```

---

## Seed Data

The seed script creates:
- **Admin User**: `admin@vibebot.local` (password: `password123`)
- **Test User**: `user@vibebot.local` (password: `password123`)
- **Sample API Keys**: For the test user
- **2 Conversations**: With sample messages

---

## Security Considerations

1. **Password Storage**: Passwords are hashed using bcrypt with salt rounds of 10
2. **API Key Encryption**: API keys must be encrypted before storage (implementation pending)
3. **Cascade Deletes**: When a user is deleted, all related data is removed
4. **Connection Pooling**: Configured in `src/config/database.ts` for optimal performance

---

## Future Enhancements

- Conversation branching support
- Message attachments/files
- Conversation sharing and collaboration
- Usage analytics and cost tracking
- Rate limiting per user
- Conversation templates
