import request from 'supertest';

const mockListFindFirst = jest.fn();
const mockItemCreate = jest.fn();
const mockItemFindFirst = jest.fn();
const mockItemUpdate = jest.fn();
const mockItemDelete = jest.fn();
const mockItemAggregate = jest.fn();

jest.mock('../lib/prisma.js', () => ({
  getPrisma: jest.fn(() => ({
    list: { findFirst: mockListFindFirst },
    item: {
      create: mockItemCreate,
      findFirst: mockItemFindFirst,
      update: mockItemUpdate,
      delete: mockItemDelete,
      aggregate: mockItemAggregate,
    },
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

describe('Item unit validation (TC-7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockItemAggregate.mockResolvedValue({ _max: { position: 0 } });
  });

  it('accepts valid unit: kg', async () => {
    mockListFindFirst.mockResolvedValue({ id: 'list-1', userId: 'test-user-id' });
    mockItemCreate.mockResolvedValue({ id: 'item-1', name: 'Sugar', quantity: 1, unit: 'kg', notes: null, checked: false, listId: 'list-1' });

    const res = await request(app)
      .post('/lists/list-1/items')
      .set(AUTH)
      .send({ name: 'Sugar', quantity: 1, unit: 'kg' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ unit: 'kg' });
  });

  it('accepts valid unit: g', async () => {
    mockListFindFirst.mockResolvedValue({ id: 'list-1', userId: 'test-user-id' });
    mockItemCreate.mockResolvedValue({ id: 'item-1', name: 'Yeast', quantity: 7, unit: 'g', notes: null, checked: false, listId: 'list-1' });

    const res = await request(app)
      .post('/lists/list-1/items')
      .set(AUTH)
      .send({ name: 'Yeast', quantity: 7, unit: 'g' });

    expect(res.status).toBe(201);
  });

  it('accepts valid unit: L', async () => {
    mockListFindFirst.mockResolvedValue({ id: 'list-1', userId: 'test-user-id' });
    mockItemCreate.mockResolvedValue({ id: 'item-1', name: 'Milk', quantity: 2, unit: 'L', notes: null, checked: false, listId: 'list-1' });

    const res = await request(app)
      .post('/lists/list-1/items')
      .set(AUTH)
      .send({ name: 'Milk', quantity: 2, unit: 'L' });

    expect(res.status).toBe(201);
  });

  it('accepts valid unit: mL', async () => {
    mockListFindFirst.mockResolvedValue({ id: 'list-1', userId: 'test-user-id' });
    mockItemCreate.mockResolvedValue({ id: 'item-1', name: 'Vanilla', quantity: 5, unit: 'mL', notes: null, checked: false, listId: 'list-1' });

    const res = await request(app)
      .post('/lists/list-1/items')
      .set(AUTH)
      .send({ name: 'Vanilla', quantity: 5, unit: 'mL' });

    expect(res.status).toBe(201);
  });

  it('accepts valid unit: each', async () => {
    mockListFindFirst.mockResolvedValue({ id: 'list-1', userId: 'test-user-id' });
    mockItemCreate.mockResolvedValue({ id: 'item-1', name: 'Eggs', quantity: 12, unit: 'each', notes: null, checked: false, listId: 'list-1' });

    const res = await request(app)
      .post('/lists/list-1/items')
      .set(AUTH)
      .send({ name: 'Eggs', quantity: 12, unit: 'each' });

    expect(res.status).toBe(201);
  });

  it('rejects invalid unit with 400', async () => {
    const res = await request(app)
      .post('/lists/list-1/items')
      .set(AUTH)
      .send({ name: 'Milk', quantity: 2, unit: 'litre' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: 'VALIDATION_ERROR',
      message: 'Unit must be one of: kg, g, L, mL, each',
      statusCode: 400,
    });
  });

  it('rejects unit "liter" with 400', async () => {
    const res = await request(app)
      .post('/lists/list-1/items')
      .set(AUTH)
      .send({ name: 'Milk', quantity: 2, unit: 'liter' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'VALIDATION_ERROR' });
  });

  it('accepts item with no unit (unit is optional)', async () => {
    mockListFindFirst.mockResolvedValue({ id: 'list-1', userId: 'test-user-id' });
    mockItemCreate.mockResolvedValue({ id: 'item-1', name: 'Bread', quantity: 1, unit: 'each', notes: null, checked: false, listId: 'list-1' });

    const res = await request(app)
      .post('/lists/list-1/items')
      .set(AUTH)
      .send({ name: 'Bread' });

    expect(res.status).toBe(201);
  });

  it('rejects item name longer than 200 characters', async () => {
    const res = await request(app)
      .post('/lists/list-1/items')
      .set(AUTH)
      .send({ name: 'a'.repeat(201) });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'VALIDATION_ERROR' });
  });

  it('also rejects invalid unit on PUT /lists/:id/items/:itemId', async () => {
    const res = await request(app)
      .put('/lists/list-1/items/item-1')
      .set(AUTH)
      .send({ unit: 'cups' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: 'VALIDATION_ERROR',
      message: 'Unit must be one of: kg, g, L, mL, each',
    });
  });

  it('returns 404 when list not found on POST /lists/:id/items', async () => {
    mockListFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/lists/no-list/items')
      .set(AUTH)
      .send({ name: 'Milk', quantity: 1, unit: 'L' });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('returns 500 on db error during POST /lists/:id/items', async () => {
    mockListFindFirst.mockResolvedValue({ id: 'list-1', userId: 'test-user-id' });
    mockItemAggregate.mockResolvedValue({ _max: { position: 0 } });
    mockItemCreate.mockRejectedValue(new Error('db error'));

    const res = await request(app)
      .post('/lists/list-1/items')
      .set(AUTH)
      .send({ name: 'Milk', quantity: 1, unit: 'L' });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'INTERNAL_ERROR' });
  });
});
