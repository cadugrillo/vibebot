import { PrismaClient } from '../generated/prisma';

// Connection pooling configuration
const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Connection pool settings
    // Default pool size is dynamically calculated: num_physical_cpus * 2 + 1
    // You can override with connection string parameters:
    // ?connection_limit=10&pool_timeout=20
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export default prisma;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
