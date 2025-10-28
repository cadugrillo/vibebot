import { PrismaClient, UserRole, MessageRole, ApiKeyProvider } from '../src/generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.warn('🌱 Starting seed...');

  // Clean existing data
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.user.deleteMany();

  // Hash passwords
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@vibebot.local',
      password: hashedPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  });

  console.warn('✓ Created admin user');

  // Create regular user
  const user = await prisma.user.create({
    data: {
      email: 'user@vibebot.local',
      password: hashedPassword,
      name: 'Test User',
      role: UserRole.USER,
    },
  });

  console.warn('✓ Created test user');

  // Create API keys for the user (example - in reality these would be encrypted)
  await prisma.apiKey.create({
    data: {
      userId: user.id,
      provider: ApiKeyProvider.CLAUDE,
      encryptedKey: 'encrypted_claude_key_here',
      name: 'Claude API Key',
    },
  });

  console.warn('✓ Created API keys');

  // Create conversations
  const conversation1 = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: 'Getting Started with VibeBot',
      model: 'claude-3-5-sonnet-20241022',
    },
  });

  const conversation2 = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: 'Technical Discussion',
      model: 'gpt-4',
    },
  });

  console.warn('✓ Created conversations');

  // Create messages for conversation 1
  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation1.id,
        userId: user.id,
        role: MessageRole.USER,
        content: 'Hello! How does VibeBot work?',
      },
      {
        conversationId: conversation1.id,
        role: MessageRole.ASSISTANT,
        content:
          'VibeBot is a self-hosted multi-user AI Agent application that allows you to chat with AI models like Claude and OpenAI. You can manage your own API keys and have multiple conversations with history!',
      },
      {
        conversationId: conversation1.id,
        userId: user.id,
        role: MessageRole.USER,
        content: 'That sounds great! What features are available?',
      },
      {
        conversationId: conversation1.id,
        role: MessageRole.ASSISTANT,
        content:
          'Key features include: multiple chats with history, support for both Claude and OpenAI APIs, access to tools and remote MCP Servers, conversation branching, search across chat history, and more!',
      },
    ],
  });

  // Create messages for conversation 2
  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation2.id,
        userId: user.id,
        role: MessageRole.USER,
        content: 'Can you explain the architecture?',
      },
      {
        conversationId: conversation2.id,
        role: MessageRole.ASSISTANT,
        content:
          'VibeBot uses a Node.js/TypeScript backend with Express, PostgreSQL database with Prisma ORM, and a React frontend with shadcn/ui. It supports WebSocket for real-time communication.',
      },
    ],
  });

  console.warn('✓ Created sample messages');

  console.warn('🌱 Seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
