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

/**
 * Increment failed login attempts for an email and check if account is locked
 * Locks account for 15 minutes after 5 failed attempts
 * Returns: { attempts, isLocked, remainingSeconds }
 */
export async function incrementFailedLogin(email: string): Promise<{
  attempts: number;
  isLocked: boolean;
  remainingSeconds: number;
}> {
  try {
    const client = await getRedisClient();
    const key = `failed_login:${email.toLowerCase()}`;

    const attempts = await client.incr(key);

    let remainingSeconds = -1;
    if (attempts === 1) {
      // First attempt, set expiration to 15 minutes (900 seconds)
      await client.expire(key, 900);
      remainingSeconds = 900;
    } else {
      // Existing attempts, get TTL
      const ttl = await client.ttl(key);
      remainingSeconds = ttl > 0 ? ttl : 0;
    }

    const isLocked = attempts >= 5;

    return {
      attempts,
      isLocked,
      remainingSeconds,
    };
  } catch (err) {
    logger.error({ err }, 'Failed to increment failed login counter');
    // Fail open - if Redis is down, allow login attempt
    return {
      attempts: 0,
      isLocked: false,
      remainingSeconds: 0,
    };
  }
}

/**
 * Check if an account is locked due to failed login attempts
 * Returns: { isLocked, remainingSeconds }
 */
export async function isLoginLocked(email: string): Promise<{
  isLocked: boolean;
  remainingSeconds: number;
}> {
  try {
    const client = await getRedisClient();
    const key = `failed_login:${email.toLowerCase()}`;

    const attempts = await client.get(key);
    if (!attempts) {
      return { isLocked: false, remainingSeconds: 0 };
    }

    const attemptCount = parseInt(attempts, 10);
    if (attemptCount < 5) {
      return { isLocked: false, remainingSeconds: 0 };
    }

    // Account is locked, get remaining TTL
    const ttl = await client.ttl(key);
    const remainingSeconds = ttl > 0 ? ttl : 0;

    return { isLocked: true, remainingSeconds };
  } catch (err) {
    logger.warn({ err }, 'Failed to check login lock status');
    // Fail open - if Redis is down, allow login attempt
    return { isLocked: false, remainingSeconds: 0 };
  }
}

/**
 * Clear failed login attempts for an email (on successful login)
 */
export async function clearFailedLogin(email: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = `failed_login:${email.toLowerCase()}`;
    await client.del(key);
  } catch (err) {
    logger.warn({ err }, 'Failed to clear failed login counter');
    // Non-critical error, don't throw
  }
}
