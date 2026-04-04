import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

/**
 * Extend Express Request to include user info
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * JWT verification middleware
 * Extracts token from Authorization header and verifies it
 * Attaches user info to request object
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(
        {
          path: req.path,
          method: req.method,
        },
        'Missing or invalid authorization header'
      );

      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization token',
        statusCode: 401,
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    try {
      const user = await verifyToken(token);

      req.user = {
        id: user.id,
        email: user.email || '',
      };

      next();
    } catch (err: any) {
      logger.warn(
        {
          path: req.path,
          method: req.method,
          error: err.message,
        },
        'Token verification failed'
      );

      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        statusCode: 401,
      });
    }
  } catch (err: any) {
    logger.error({ err }, 'Auth middleware error');

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Authentication error',
      statusCode: 500,
    });
  }
}
