import request from 'supertest';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockListFindFirst = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../lib/prisma.js', () => ({
  getPrisma: jest.fn(() => ({
    list: { findFirst: mockListFindFirst },
    $queryRaw: jest.fn(async () => 1),
    $disconnect: jest.fn(async () => {}),
    $transaction: (...args: any[]) => mockTransaction(...args),
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

const SOURCE_LIST = {
  id: 'list-1',
  userId: 'test-user-id',
  name: 'Weekly Shop',
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    { id: 'item-1', name: 'Milk', quantity: 2, unit: 'L', notes: 'Full fat', checked: true, position: 1 },
    { id: 'item-2', name: 'Bread', quantity: 1, unit: 'each', notes: null, checked: false, position: 2 },
  ],
};

const DUPLICATE_LIST = {
  id: 'list-new',
  userId: 'test-user-id',
  name: 'Copy of Weekly Shop',
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    { id: 'item-new-1', name: 'Milk', quantity: 2, unit: 'L', notes: 'Full fat', checked: false, position: 1 },
    { id: 'item-new-2', name: 'Bread', quantity: 1, unit: 'each', notes: null, checked: false, position: 2 },
  ],
};

// ── TC-8: Duplicate List ───────────────────────────────────────────────────

describe('POST /lists/:id/duplicate (TC-8)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without authentication', async () => {
    const res = await request(app).post('/lists/list-1/duplicate');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
  });

  it('creates a duplicate list and returns 201', async () => {
    mockListFindFirst.mockResolvedValue(SOURCE_LIST);
    mockTransaction.mockImplementation(async (fn: Function) => fn({
      list: { create: jest.fn().mockResolvedValue(DUPLICATE_LIST) },
    }));

    const res = await request(app)
      .post('/lists/list-1/duplicate')
      .set(AUTH);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Copy of Weekly Shop');
    expect(res.body.items).toHaveLength(2);
  });

  it('sets duplicate name to "Copy of {original name}"', async () => {
    mockListFindFirst.mockResolvedValue(SOURCE_LIST);
    mockTransaction.mockImplementation(async (fn: Function) => fn({
      list: { create: jest.fn().mockResolvedValue(DUPLICATE_LIST) },
    }));

    const res = await request(app).post('/lists/list-1/duplicate').set(AUTH);

    expect(res.body).toHaveProperty('name', 'Copy of Weekly Shop');
  });

  it('all copied items have checked: false', async () => {
    mockListFindFirst.mockResolvedValue(SOURCE_LIST);
    mockTransaction.mockImplementation(async (fn: Function) => fn({
      list: { create: jest.fn().mockResolvedValue(DUPLICATE_LIST) },
    }));

    const res = await request(app).post('/lists/list-1/duplicate').set(AUTH);

    expect(res.status).toBe(201);
    res.body.items.forEach((item: any) => {
      expect(item.checked).toBe(false);
    });
  });

  it('returns 404 when source list not found or not owned', async () => {
    mockListFindFirst.mockResolvedValue(null);

    const res = await request(app).post('/lists/no-such-list/duplicate').set(AUTH);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('returns 500 on db error', async () => {
    mockListFindFirst.mockResolvedValue(SOURCE_LIST);
    mockTransaction.mockRejectedValue(new Error('db error'));

    const res = await request(app).post('/lists/list-1/duplicate').set(AUTH);

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'INTERNAL_ERROR' });
  });
});
