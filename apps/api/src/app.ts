import express, { Request, Response } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger.js';
import { getPrisma, disconnectPrisma } from './lib/prisma.js';
import { isRedisHealthy, disconnectRedis } from './lib/cache.js';
import authRoutes from './routes/auth.js';
import listRoutes from './routes/lists.js';

export const app = express();

// Trust proxy - required for getting real IP behind Railway load balancer
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Logging middleware
app.use(pinoHttp({ logger }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

/**
 * Health check endpoint
 * Returns: { status, timestamp, version, db, cache }
 * Status 200 if healthy, 503 if service unavailable
 */
app.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const prisma = getPrisma();
    const redisHealthy = await isRedisHealthy();

    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    const status = redisHealthy ? 'healthy' : 'degraded';

    res.status(redisHealthy ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '0.1.0',
      db: 'connected',
      cache: redisHealthy ? 'connected' : 'disconnected',
    });
  } catch (err) {
    logger.error({ err }, 'Health check failed');

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '0.1.0',
      db: 'disconnected',
      cache: 'disconnected',
    });
  }
});

// Auth routes (no authentication required for register/login)
app.use('/auth', authRoutes);

// List routes (authentication required)
app.use('/lists', listRoutes);

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
  });
});

/**
 * Error handler
 */
app.use((err: any, req: Request, res: Response) => {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
  });
});

/**
 * Graceful shutdown handler
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await disconnectPrisma();
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await disconnectPrisma();
  await disconnectRedis();
  process.exit(0);
});
