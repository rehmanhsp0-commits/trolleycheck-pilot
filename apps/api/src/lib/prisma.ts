import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

let prisma: PrismaClient;

/**
 * Get or create a Prisma client
 * Singleton pattern to avoid multiple client instances
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    prisma = new PrismaClient({
      log: [],
    });
  }

  return prisma;
}

/**
 * Handle graceful shutdown
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    logger.info('Prisma disconnected');
  }
}
