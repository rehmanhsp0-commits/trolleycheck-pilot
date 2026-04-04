import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../lib/cache.js';
import { logger } from '../lib/logger.js';

/**
 * Rate limiting strategy using Redis
 * Track requests by IP address
 * Returns 429 if rate limit exceeded
 */
export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

/**
 * Create a rate limit middleware
 * For auth endpoints: 10 requests per minute per IP
 * For general endpoints: 100 requests per minute per IP
 */
export function rateLimit(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const redis = await getRedisClient();
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const key = `rate-limit:${ip}`;

      const current = await redis.incr(key);

      if (current === 1) {
        // Set expiration on first request
        await redis.expire(key, Math.ceil(options.windowMs / 1000));
      }

      res.set('X-RateLimit-Limit', options.maxRequests.toString());
      res.set('X-RateLimit-Remaining', Math.max(0, options.maxRequests - current).toString());

      if (current > options.maxRequests) {
        logger.warn(
          {
            ip,
            path: req.path,
            method: req.method,
            requests: current,
            limit: options.maxRequests,
          },
          'Rate limit exceeded'
        );

        return res.status(429).json({
          error: 'RATE_LIMITED',
          message: 'Too many requests, please try again later',
          statusCode: 429,
        });
      }

      next();
    } catch (err) {
      logger.error({ err }, 'Rate limit error - allowing request');
      // On Redis error, allow request to proceed
      next();
    }
  };
}

/**
 * Auth endpoint rate limiter: 10 req/min per IP
 */
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
});

/**
 * General endpoint rate limiter: 100 req/min per IP
 */
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
});
