import { createClient, RedisClientType } from 'redis';
import { logger } from './logger.js';

let redisClient: RedisClientType | null = null;

const REDIS_ENABLED = !!process.env.REDIS_URL;

/**
 * Get or create a Redis client. Returns null if Redis is not configured.
 */
async function getRedisClient(): Promise<RedisClientType | null> {
  if (!REDIS_ENABLED) return null;
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 500),
    },
  }) as RedisClientType;

  redisClient.on('error', (err) => {
    logger.error({ err }, 'Redis client error');
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  try {
    await redisClient.connect();
  } catch (err) {
    logger.warn({ err }, 'Redis unavailable — running without cache');
    redisClient = null;
  }

  return redisClient;
}

/**
 * Check if Redis is available and healthy.
 */
export async function isRedisHealthy(): Promise<boolean> {
  if (!REDIS_ENABLED) return false;
  try {
    const client = await getRedisClient();
    if (!client) return false;
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Gracefully disconnect Redis.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit().catch(() => {});
    redisClient = null;
    redisAvailable = false;
  }
}

/**
 * Increment failed login attempts. Falls back to allowing login if Redis is unavailable.
 */
export async function incrementFailedLogin(
  email: string,
): Promise<{ attempts: number; isLocked: boolean; remainingSeconds: number }> {
  try {
    const client = await getRedisClient();
    if (!client) return { attempts: 0, isLocked: false, remainingSeconds: 0 };

    const key = `failed_login:${email.toLowerCase()}`;
    const attempts = await client.incr(key);

    let remainingSeconds = 900;
    if (attempts === 1) {
      await client.expire(key, 900);
    } else {
      const ttl = await client.ttl(key);
      remainingSeconds = ttl > 0 ? ttl : 0;
    }

    return { attempts, isLocked: attempts >= 5, remainingSeconds };
  } catch (err) {
    logger.error({ err }, 'Failed to increment failed login counter');
    return { attempts: 0, isLocked: false, remainingSeconds: 0 };
  }
}

/**
 * Check if an account is locked. Returns unlocked if Redis is unavailable.
 */
export async function isLoginLocked(
  email: string,
): Promise<{ isLocked: boolean; remainingSeconds: number }> {
  try {
    const client = await getRedisClient();
    if (!client) return { isLocked: false, remainingSeconds: 0 };

    const key = `failed_login:${email.toLowerCase()}`;
    const attempts = await client.get(key);
    if (!attempts || parseInt(attempts, 10) < 5) {
      return { isLocked: false, remainingSeconds: 0 };
    }

    const ttl = await client.ttl(key);
    return { isLocked: true, remainingSeconds: ttl > 0 ? ttl : 0 };
  } catch (err) {
    logger.warn({ err }, 'Failed to check login lock status');
    return { isLocked: false, remainingSeconds: 0 };
  }
}

/**
 * Clear failed login attempts on successful login.
 */
export async function clearFailedLogin(email: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;
    await client.del(`failed_login:${email.toLowerCase()}`);
  } catch (err) {
    logger.warn({ err }, 'Failed to clear failed login counter');
  }
}
