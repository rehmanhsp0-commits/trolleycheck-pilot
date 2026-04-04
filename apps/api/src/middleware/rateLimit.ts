import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

// In-memory fallback store when Redis is unavailable
const memStore = new Map<string, { count: number; expiresAt: number }>();

export function rateLimit(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const ip = req.ip || 'unknown';
      const key = `rate-limit:${ip}`;
      const now = Date.now();
      const windowMs = options.windowMs;

      // Clean up expired entries
      const entry = memStore.get(key);
      if (!entry || entry.expiresAt < now) {
        memStore.set(key, { count: 1, expiresAt: now + windowMs });
      } else {
        entry.count++;
      }

      const current = memStore.get(key)!.count;

      res.set('X-RateLimit-Limit', options.maxRequests.toString());
      res.set('X-RateLimit-Remaining', Math.max(0, options.maxRequests - current).toString());

      if (current > options.maxRequests) {
        logger.warn({ ip, path: req.path, method: req.method, requests: current }, 'Rate limit exceeded');
        return res.status(429).json({
          error: 'RATE_LIMITED',
          message: 'Too many requests, please try again later',
          statusCode: 429,
        });
      }

      next();
    } catch (err) {
      logger.error({ err }, 'Rate limit error - allowing request');
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
