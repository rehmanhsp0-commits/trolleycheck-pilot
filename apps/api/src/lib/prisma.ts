import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { logger } from './logger.js';

let prisma: PrismaClient | undefined;

/**
 * Get or create a Prisma client.
 * Uses @prisma/adapter-pg (required by Prisma v7 WASM engine).
 * Uses DIRECT_URL for a direct connection (bypasses pgbouncer) when available,
 * falls back to DATABASE_URL.
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Strip pgbouncer param — the pg adapter manages its own pool
    const connectionString = databaseUrl.replace('?pgbouncer=true', '').replace('&pgbouncer=true', '');
    const adapter = new PrismaPg({ connectionString });

    prisma = new PrismaClient({
      adapter,
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
    prisma = undefined;
    logger.info('Prisma disconnected');
  }
}
