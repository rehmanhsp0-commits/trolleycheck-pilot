import pino from 'pino';

/**
 * Create a pino logger instance
 * - Production: JSON format (no PII)
 * - Development: Pretty-print for readability
 * - Never log emails, names, or list contents — user IDs only
 */
const createLogger = () => {
  const isDev = process.env.NODE_ENV === 'development';

  return pino({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: false,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
    base: {
      version: process.env.APP_VERSION,
      environment: process.env.NODE_ENV,
    },
    // Serializers to prevent logging PII
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers['user-agent'],
        },
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  });
};

export const logger = createLogger();
