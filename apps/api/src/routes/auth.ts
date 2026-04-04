import { Router, Request, Response } from 'express';
import { validateRequest } from '../middleware/validate.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { RegisterSchema, LoginSchema, RefreshSchema } from '../schemas/auth.schema.js';        
import { registerUser, loginUser, refreshAccessToken } from '../lib/supabase.js';
import { getPrisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { isLoginLocked, incrementFailedLogin, clearFailedLogin } from '../lib/cache.js';

const router = Router();

/**
 * POST /auth/register
 * Register a new user with email and password
 * Accepts: { email, password }
 * Returns: { user, accessToken, refreshToken }
 * Status 201 on success
 * Status 400 on validation error
 * Status 409 if email already exists
 */
router.post(
  '/register',
  authRateLimit,
  validateRequest(RegisterSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Register user in Supabase Auth
      const authResult = await registerUser(email, password);

      // Create user record in Prisma (for app data)
      const prisma = getPrisma();
      const user = await prisma.user.create({
        data: {
          id: authResult.user.id,
          email: authResult.user.email,
        },
      });

      logger.info(
        {
          userId: user.id,
        },
        'User registration successful'
      );

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
      });
    } catch (err: any) {
      // Handle known errors
      if (err.status) {
        return res.status(err.status).json({
          error: err.code,
          message: err.message,
          statusCode: err.status,
        });
      }

      // Handle Prisma errors
      if (err.code === 'P2002') {
        // Unique constraint violation
        return res.status(409).json({
          error: 'CONFLICT',
          message: 'An account with this email already exists',
          statusCode: 409,
        });
      }

      logger.error({ err }, 'Registration error');

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to register user',
        statusCode: 500,
      });
      return;
    }
  }
);

/**
 * POST /auth/login
 * Login user with email and password
 * Accepts: { email, password }
 * Returns: { user, accessToken, refreshToken }
 * Status 200 on success
 * Status 400 on validation error
 * Status 401 on invalid credentials
 * Status 429 on account locked (5+ failed attempts in 15 min)
 */
router.post(
  '/login',
  authRateLimit,
  validateRequest(LoginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Check if account is locked due to failed login attempts
      const lockStatus = await isLoginLocked(email);
      if (lockStatus.isLocked) {
        logger.warn(
          {
            email: email.toLowerCase(),
            remainingSeconds: lockStatus.remainingSeconds,
          },
          'Login attempt on locked account'
        );

        return res.status(429).json({
          error: 'ACCOUNT_LOCKED',
          message: 'Account is temporarily locked. Please try again later.',
          statusCode: 429,
          retryAfter: lockStatus.remainingSeconds,
        });
      }

      // Login user with Supabase Auth
      let authResult;
      try {
        authResult = await loginUser(email, password);
      } catch (loginErr: any) {
        // Login failed - increment failed attempts
        if (loginErr.status === 401) {
          const result = await incrementFailedLogin(email);

          logger.warn(
            {
              email: email.toLowerCase(),
              attempts: result.attempts,
              isLocked: result.isLocked,
            },
            'Login attempt failed'
          );

          // Now that we've counted this attempt, check if newly locked
          if (result.isLocked) {
            return res.status(429).json({
              error: 'ACCOUNT_LOCKED',
              message: 'Account is temporarily locked. Please try again later.',
              statusCode: 429,
              retryAfter: result.remainingSeconds,
            });
          }

          // Still under lock threshold, return generic 401
          return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Invalid email or password',
            statusCode: 401,
          });
        }

        // Re-throw other errors
        throw loginErr;
      }

      // Login successful - clear failed attempts
      await clearFailedLogin(email);

      logger.info(
        {
          userId: authResult.user.id,
        },
        'User login successful'
      );

      return res.status(200).json(authResult);
    } catch (err: any) {
      // Handle known errors
      if (err.status) {
        return res.status(err.status).json({
          error: err.code,
          message: err.message,
          statusCode: err.status,
        });
      }

      logger.error({ err }, 'Login error');

      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to login',
        statusCode: 500,
      });
    }
  }
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 * Accepts: { refreshToken }
 * Returns: { accessToken, refreshToken }
 * Status 200 on success
 * Status 400 on validation error
 * Status 401 on invalid/expired refresh token
 */
router.post(
  '/refresh',
  authRateLimit,
  validateRequest(RefreshSchema),
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      // Refresh tokens using Supabase Auth
      const tokenResult = await refreshAccessToken(refreshToken);

      logger.info(
        {
          refreshTokenUsed: true,
        },
        'Token refresh successful'
      );

      return res.status(200).json(tokenResult);
    } catch (err: any) {
      // Handle known errors
      if (err.status) {
        return res.status(err.status).json({
          error: err.code,
          message: err.message,
          statusCode: err.status,
        });
      }

      logger.error({ err }, 'Token refresh error');

      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to refresh token',
        statusCode: 500,
      });
    }
  }
);

export default router;
