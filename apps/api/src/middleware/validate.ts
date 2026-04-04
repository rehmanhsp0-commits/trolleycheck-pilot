import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { logger } from '../lib/logger.js';

/**
 * Zod validation middleware
 * Validates request body against a Zod schema
 * Returns 400 with error details if validation fails
 */
export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (err: any) {
      logger.warn(
        {
          path: req.path,
          method: req.method,
          error: err.errors,
        },
        'Validation error'
      );

      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: err.errors[0]?.message || 'Validation failed',
        statusCode: 400,
      });
    }
  };
}

/**
 * Validate request body and attach to request object
 * Similar to validateRequest but throws error instead of responding
 */
export async function validate<T>(schema: ZodSchema, data: unknown): Promise<T> {
  return schema.parseAsync(data);
}
