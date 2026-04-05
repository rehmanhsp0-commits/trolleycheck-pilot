import request from 'supertest';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockProductFindMany = jest.fn();
const mockProductFindFirst = jest.fn();

jest.mock('../lib/prisma.js', () => ({
  getPrisma: jest.fn(() => ({
    product: { findMany: mockProductFindMany, findFirst: mockProductFindFirst },
    $queryRaw: jest.fn(async () => 1),
    $disconnect: jest.fn(async () => {}),
  })),
  disconnectPrisma: jest.fn(async () => {}),
}));

jest.mock('../middleware/rateLimit.js', () => ({
  generalRateLimit: (_req: any, _res: any, next: any) => next(),
  authRateLimit: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../lib/supabase.js', () => ({
  verifyToken: jest.fn(async () => ({ id: 'test-user-id', email: 'test@example.com' })),
}));

jest.mock('../lib/cache.js', () => ({
  isRedisHealthy: jest.fn(async () => true),
  disconnectRedis: jest.fn(async () => {}),
  isLoginLocked: jest.fn(async () => ({ isLocked: false, remainingSeconds: 0 })),
  incrementFailedLogin: jest.fn(async () => ({ attempts: 1, isLocked: false, remainingSeconds: 0 })),
  clearFailedLogin: jest.fn(async () => {}),
}));

import { app } from '../app.js';

const AUTH = { Authorization: 'Bearer test-token' };

const MILK = {
  id: 'prod-1', name: 'Milk', category: 'dairy', unit: 'L', active: true,
  createdAt: new Date(), updatedAt: new Date(),
  prices: [
    { id: 'pr-1', store: 'Coles', amount: 2.5, currency: 'AUD', updatedAt: new Date() },
    { id: 'pr-2', store: 'Woolworths', amount: 2.2, currency: 'AUD', updatedAt: new Date() },
  ],
};

const BREAD = {
  id: 'prod-2', name: 'White Bread', category: 'bread', unit: 'each', active: true,
  createdAt: new Date(), updatedAt: new Date(),
  prices: [{ id: 'pr-3', store: 'Coles', amount: 3.0, currency: 'AUD', updatedAt: new Date() }],
};

// ── TC-12: Product catalogue ───────────────────────────────────────────────

describe('GET /products (TC-12)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/products');
    expect(res.status).toBe(401);
  });

  it('returns product list with count', async () => {
    mockProductFindMany.mockResolvedValue([MILK, BREAD]);

    const res = await request(app).get('/products').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count', 2);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toHaveProperty('name');
    expect(res.body.data[0]).toHaveProperty('prices');
  });

  it('filters by ?category=dairy', async () => {
    mockProductFindMany.mockResolvedValue([MILK]);

    const res = await request(app).get('/products?category=dairy').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    const call = mockProductFindMany.mock.calls[0][0];
    expect(call.where.category).toMatchObject({ equals: 'dairy', mode: 'insensitive' });
  });

  it('filters by ?q= name search', async () => {
    mockProductFindMany.mockResolvedValue([MILK]);

    const res = await request(app).get('/products?q=milk').set(AUTH);

    expect(res.status).toBe(200);
    const call = mockProductFindMany.mock.calls[0][0];
    expect(call.where.name).toMatchObject({ contains: 'milk', mode: 'insensitive' });
  });

  it('filters prices by ?store=Coles', async () => {
    mockProductFindMany.mockResolvedValue([MILK]);

    const res = await request(app).get('/products?store=Coles').set(AUTH);

    expect(res.status).toBe(200);
    const call = mockProductFindMany.mock.calls[0][0];
    expect(call.include.prices).toMatchObject({ where: { store: { equals: 'Coles', mode: 'insensitive' } } });
  });

  it('returns 500 on db error', async () => {
    mockProductFindMany.mockRejectedValue(new Error('db error'));

    const res = await request(app).get('/products').set(AUTH);

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'INTERNAL_ERROR' });
  });
});

describe('GET /products/:id (TC-12)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/products/prod-1');
    expect(res.status).toBe(401);
  });

  it('returns a single product with prices', async () => {
    mockProductFindFirst.mockResolvedValue(MILK);

    const res = await request(app).get('/products/prod-1').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'prod-1');
    expect(res.body).toHaveProperty('name', 'Milk');
    expect(res.body.prices).toHaveLength(2);
  });

  it('returns 404 when product not found', async () => {
    mockProductFindFirst.mockResolvedValue(null);

    const res = await request(app).get('/products/no-such-product').set(AUTH);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('returns 500 on db error', async () => {
    mockProductFindFirst.mockRejectedValue(new Error('db error'));

    const res = await request(app).get('/products/prod-1').set(AUTH);

    expect(res.status).toBe(500);
  });
});
