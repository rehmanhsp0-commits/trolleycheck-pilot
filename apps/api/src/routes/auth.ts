import { Router, Request, Response } from 'express';
import { validateRequest } from '../middleware/validate.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { RegisterSchema, LoginSchema } from '../schemas/auth.schema.js';
import { registerUser, loginUser } from '../lib/supabase.js';
import { getPrisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

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
 */
router.post(
  '/login',
  authRateLimit,
  validateRequest(LoginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Login user with Supabase Auth
      const authResult = await loginUser(email, password);

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

export default router;
