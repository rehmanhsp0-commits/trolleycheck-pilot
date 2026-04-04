import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test-specific environment variables
process.env.NODE_ENV = 'test';
process.env.APP_VERSION = '0.1.0-test';
