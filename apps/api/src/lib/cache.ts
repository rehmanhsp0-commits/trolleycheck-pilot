import { createClient } from 'redis';
import { logger } from './logger.js';

let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Get or create a Redis client
 * Connects to Redis via REDIS_URL environment variable
 * Defaults to localhost:6379 for local development
 */
export async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          return Math.min(retries * 50, 500);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis client error');
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (err) {
    logger.error({ err }, 'Failed to create Redis client');
    throw err;
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.ping();
    return true;
  } catch (err) {
    logger.warn({ err }, 'Redis health check failed');
    return false;
  }
}

/**
 * Gracefully disconnect Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected');
  }
}
