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
 * Creates user via admin API (email pre-confirmed), then signs them in to get real tokens
 */
export async function registerUser(email: string, password: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    if (error?.message.toLowerCase().includes('duplicate') || error?.message.toLowerCase().includes('already')) {
      throw {
        message: 'An account with this email already exists',
        code: 'CONFLICT',
        status: 409,
      };
    }
    logger.error({ error: error?.message }, 'User creation failed');
    throw {
      message: error?.message || 'Failed to create user',
      code: 'AUTH_ERROR',
      status: 500,
    };
  }

  // Sign in to get real session tokens
  const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !sessionData.session) {
    logger.error({ error: signInError?.message }, 'Post-registration sign-in failed');
    throw {
      message: 'User created but failed to generate session',
      code: 'AUTH_ERROR',
      status: 500,
    };
  }

  logger.info({ userId: data.user.id }, 'User registered');

  return {
    user: {
      id: data.user.id,
      email: data.user.email || '',
      createdAt: new Date(data.user.created_at || new Date().toISOString()),
      updatedAt: new Date(data.user.updated_at || new Date().toISOString()),
    },
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token || '',
  };
}

/**
 * Verify JWT token and return user info
 */
export async function verifyToken(token: string) {
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw {
      message: 'Invalid or expired token',
      code: 'UNAUTHORIZED',
      status: 401,
    };
  }

  return data.user;
}

/**
 * Login user with email and password
 */
export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    throw {
      message: 'Invalid email or password',
      code: 'UNAUTHORIZED',
      status: 401,
    };
  }

  logger.info({ userId: data.user.id }, 'User logged in');

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
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    throw {
      message: 'Invalid or expired token',
      code: 'UNAUTHORIZED',
      status: 401,
    };
  }

  logger.info({ userId: data.session.user.id }, 'Token refreshed');

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token || '',
  };
}

/**
 * Logout user — invalidates session via Supabase admin signOut
 */
export async function logoutUser(refreshToken: string) {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    throw {
      message: 'Invalid or expired token',
      code: 'UNAUTHORIZED',
      status: 401,
    };
  }

  const userId = data.session.user.id;

  // Invalidate all sessions for this user
  await supabase.auth.admin.signOut(userId, 'global');

  logger.info({ userId }, 'User logged out');

  return { message: 'Logged out' };
}

/**
 * Delete user account and all associated data
 */
export async function deleteUserAccount(refreshToken: string) {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    throw {
      message: 'Invalid or expired token',
      code: 'UNAUTHORIZED',
      status: 401,
    };
  }

  const userId = data.session.user.id;

  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

  if (deleteError) {
    logger.error({ error: deleteError.message }, 'Account deletion failed');
    throw {
      message: 'Failed to delete account',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }

  logger.info({ userId }, 'User account deleted');
}
