import { z } from 'zod';

/**
 * Register request validation schema
 * Email must be valid, password must be 8+ chars with letter + number
 */
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine(
      (password) => /[a-zA-Z]/.test(password),
      'Password must contain at least one letter'
    )
    .refine(
      (password) => /\d/.test(password),
      'Password must contain at least one number'
    ),
});

export type RegisterRequest = z.infer<typeof RegisterSchema>;

/**
 * Login request validation schema
 */
export const LoginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof LoginSchema>;

/**
 * Refresh token request validation schema
 */
export const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshRequest = z.infer<typeof RefreshSchema>;

/**
 * Logout request validation schema
 */
export const LogoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type LogoutRequest = z.infer<typeof LogoutSchema>;

/**
 * Auth response (user + tokens)
 */
export const AuthResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
  accessToken: z.string(),
  refreshToken: z.string(),
});
