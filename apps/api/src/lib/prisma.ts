import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

let prisma: PrismaClient;

/**
 * Get or create a Prisma client
 * Singleton pattern to avoid multiple client instances
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });

    // Log Prisma errors
    prisma.$on('error', (e) => {
      logger.error({ err: e }, 'Prisma error');
    });

    prisma.$on('warn', (e) => {
      logger.warn({ msg: e }, 'Prisma warning');
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
