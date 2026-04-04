import { Router, Request, Response } from 'express';
import { validateRequest } from '../middleware/validate.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { RegisterSchema, LoginSchema, RefreshSchema } from '../schemas/auth.schema.js';
import { registerUser, loginUser, refreshAccessToken, logoutUser, deleteUserAccount } from '../lib/supabase.js';
import { getPrisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { isLoginLocked, incrementFailedLogin, clearFailedLogin } from '../lib/cache.js';

const router = Router();

/**
 * POST /auth/register
 * Register a new user with email and password
 * Accepts: { email, password }
 * Returns: { user, accessToken, refreshToken }
 */
router.post(
  '/register',
  authRateLimit,
  validateRequest(RegisterSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const authResult = await registerUser(email, password);

      const prisma = getPrisma();
      const user = await prisma.user.create({
        data: {
          id: authResult.user.id,
          email: authResult.user.email,
        },
      });

      logger.info({ userId: user.id }, 'User registration successful');

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
      if (err.status) {
        return res.status(err.status).json({
          error: err.code,
          message: err.message,
          statusCode: err.status,
        });
      }

      if (err.code === 'P2002') {
        return res.status(409).json({
          error: 'CONFLICT',
          message: 'An account with this email already exists',
          statusCode: 409,
        });
      }

      logger.error({ err }, 'Registration error');

      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to register user',
        statusCode: 500,
      });
    }
  }
);

/**
 * POST /auth/login
 * Login user with email and password
 * Accepts: { email, password }
 * Returns: { user, accessToken, refreshToken }
 */
router.post(
  '/login',
  authRateLimit,
  validateRequest(LoginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const lockStatus = await isLoginLocked(email);
      if (lockStatus.isLocked) {
        logger.warn(
          { email: email.toLowerCase(), remainingSeconds: lockStatus.remainingSeconds },
          'Login attempt on locked account'
        );

        return res.status(429).json({
          error: 'ACCOUNT_LOCKED',
          message: 'Account is temporarily locked. Please try again later.',
          statusCode: 429,
          retryAfter: lockStatus.remainingSeconds,
        });
      }

      let authResult;
      try {
        authResult = await loginUser(email, password);
      } catch (loginErr: any) {
        if (loginErr.status === 401) {
          const result = await incrementFailedLogin(email);

          logger.warn(
            { email: email.toLowerCase(), attempts: result.attempts, isLocked: result.isLocked },
            'Login attempt failed'
          );

          if (result.isLocked) {
            return res.status(429).json({
              error: 'ACCOUNT_LOCKED',
              message: 'Account is temporarily locked. Please try again later.',
              statusCode: 429,
              retryAfter: result.remainingSeconds,
            });
          }

          return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Invalid email or password',
            statusCode: 401,
          });
        }

        throw loginErr;
      }

      await clearFailedLogin(email);

      logger.info({ userId: authResult.user.id }, 'User login successful');

      return res.status(200).json(authResult);
    } catch (err: any) {
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
 */
router.post(
  '/refresh',
  authRateLimit,
  validateRequest(RefreshSchema),
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      const tokenResult = await refreshAccessToken(refreshToken);

      logger.info({ refreshTokenUsed: true }, 'Token refresh successful');

      return res.status(200).json(tokenResult);
    } catch (err: any) {
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

/**
 * POST /auth/logout
 * Logout user by invalidating refresh token
 * Accepts: { refreshToken }
 * Returns: { message }
 */
router.post(
  '/logout',
  authRateLimit,
  validateRequest(RefreshSchema),
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      const logoutResult = await logoutUser(refreshToken);

      return res.status(200).json(logoutResult);
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({
          error: err.code,
          message: err.message,
          statusCode: err.status,
        });
      }

      logger.error({ err }, 'Logout error');

      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to logout',
        statusCode: 500,
      });
    }
  }
);

/**
 * DELETE /auth/account
 * Delete user account and all associated data
 * Accepts: { refreshToken }
 * Returns: 204 No Content
 */
router.delete(
  '/account',
  authRateLimit,
  validateRequest(RefreshSchema),
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      await deleteUserAccount(refreshToken);

      return res.status(204).send();
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({
          error: err.code,
          message: err.message,
          statusCode: err.status,
        });
      }

      logger.error({ err }, 'Account deletion error');

      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to delete account',
        statusCode: 500,
      });
    }
  }
);

export default router;
