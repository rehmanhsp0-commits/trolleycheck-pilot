import request from 'supertest';

jest.mock('../lib/prisma.js', () => ({
  getPrisma: jest.fn(() => ({
    $queryRaw: jest.fn(async () => 1),
    $disconnect: jest.fn(async () => {}),
  })),
  disconnectPrisma: jest.fn(async () => {}),
}));

jest.mock('../lib/cache.js', () => ({
  isRedisHealthy: jest.fn(async () => true),
  disconnectRedis: jest.fn(async () => {}),
}));

import { app } from '../app.js';

describe('Health Check', () => {
  it('GET /health should return 200', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('db', 'connected');
    expect(res.body).toHaveProperty('cache', 'connected');
  });
});
