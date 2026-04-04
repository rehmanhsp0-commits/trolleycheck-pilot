import { app } from './app.js';
import { logger } from './lib/logger.js';

const PORT = parseInt(process.env.PORT || '3000');
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      environment: NODE_ENV,
      version: process.env.APP_VERSION || '0.1.0',
    },
    'Server started'
  );
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
