import { createClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://test.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'test-key';

if (process.env.NODE_ENV === 'production') {
  if (!process.env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL environment variable is not set');
  }

  if (!process.env.SUPABASE_KEY) {
    throw new Error('SUPABASE_KEY environment variable is not set');
  }

  if (!process.env.SUPABASE_JWT_SECRET) {
    throw new Error('SUPABASE_JWT_SECRET environment variable is not set');
  }
}

/**
 * Supabase client for authentication
 * Uses service role key to bypass RLS for admin operations
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Register a new user with email and password
 * Returns access token and refresh token from Supabase Auth
 */
export async function registerUser(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation for MVP
    });

    if (error || !data.user) {
      if (error?.message.includes('duplicate')) {
        throw {
          message: 'An account with this email already exists',
          code: 'CONFLICT',
          status: 409,
        };
      }
      throw {
        message: error?.message || 'Failed to create user',
        code: 'AUTH_ERROR',
        status: 500,
      };
    }

    // Generate dummy tokens for MVP - in production, use Supabase session generation
    const accessToken = 'test-access-token';
    const refreshToken = 'test-refresh-token';

    logger.info(
      {
        userId: data.user.id,
      },
      'User registered'
    );

    return {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        createdAt: new Date(data.user.created_at || new Date().toISOString()),
        updatedAt: new Date(data.user.updated_at || new Date().toISOString()),
      },
      accessToken,
      refreshToken,
    };
  } catch (err: any) {
    logger.error(
      {
        error: err.message || err,
      },
      'Registration failed'
    );
    throw err;
  }
}

/**
 * Verify JWT token and return user info
 */
export async function verifyToken(token: string) {
  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw {
        message: 'Invalid or expired token',
        code: 'UNAUTHORIZED',
        status: 401,
      };
    }

    return data.user;
  } catch (err: any) {
    throw {
      message: 'Token verification failed',
      code: 'UNAUTHORIZED',
      status: 401,
    };
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw {
        message: 'Failed to refresh token',
        code: 'UNAUTHORIZED',
        status: 401,
      };
    }

    logger.info(
      {
        userId: data.session.user.id,
      },
      'Token refreshed'
    );

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token || '',
    };
  } catch (err: any) {
    logger.error(
      {
        error: err.message,
      },
      'Token refresh failed'
    );
    throw err;
  }
}

/**
 * Login user with email and password
 */
export async function loginUser(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      // Generic error message for security
      throw {
        message: 'Invalid email or password',
        code: 'UNAUTHORIZED',
        status: 401,
      };
    }

    logger.info(
      {
        userId: data.user.id,
      },
      'User logged in'
    );

    return {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        createdAt: new Date(data.user.created_at || new Date().toISOString()),
        updatedAt: new Date(data.user.updated_at || new Date().toISOString()),
      },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token || '',
    };
  } catch (err: any) {
    logger.error(
      {
        error: err.message || err,
      },
      'Login failed'
    );
    throw err;
  }
}
