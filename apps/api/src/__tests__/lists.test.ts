import request from 'supertest';

// ── Mocks (must precede app import) ────────────────────────────────────────

const mockListFindMany = jest.fn();
const mockListCreate = jest.fn();
const mockListFindFirst = jest.fn();
const mockListUpdate = jest.fn();
const mockListDelete = jest.fn();
const mockItemFindMany = jest.fn();
const mockItemFindFirst = jest.fn();
const mockItemCreate = jest.fn();
const mockItemUpdate = jest.fn();
const mockItemDelete = jest.fn();
const mockItemAggregate = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../lib/prisma.js', () => ({
  getPrisma: jest.fn(() => ({
    list: {
      findMany: mockListFindMany,
      create: mockListCreate,
      findFirst: mockListFindFirst,
      update: mockListUpdate,
      delete: mockListDelete,
    },
    item: {
      findMany: mockItemFindMany,
      findFirst: mockItemFindFirst,
      create: mockItemCreate,
      update: mockItemUpdate,
      delete: mockItemDelete,
      aggregate: mockItemAggregate,
    },
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
const LIST_1 = { id: 'list-1', userId: 'test-user-id', name: 'My List', createdAt: new Date(), updatedAt: new Date() };
const LIST_WITH_ITEMS = { ...LIST_1, items: [] };
const ITEM_1 = { id: 'item-1', listId: 'list-1', name: 'Milk', quantity: 1, unit: 'L', notes: null, checked: false, position: 1 };

// Valid CUIDs for reorder tests (schema enforces cuid format)
const CUID_1 = 'clhb4yoaw000008l7hzml4g03';
const CUID_2 = 'clhb4yoaw000108l7hzml4g04';

// ── 401 guard tests (no auth needed, no DB mocks needed) ───────────────────

describe('Lists — 401 without auth', () => {
  it('GET /lists', async () => {
    expect((await request(app).get('/lists')).status).toBe(401);
  });
  it('POST /lists', async () => {
    expect((await request(app).post('/lists').send({ name: 'X' })).status).toBe(401);
  });
  it('GET /lists/:id', async () => {
    expect((await request(app).get('/lists/123')).status).toBe(401);
  });
  it('PUT /lists/:id', async () => {
    expect((await request(app).put('/lists/123').send({ name: 'X' })).status).toBe(401);
  });
  it('DELETE /lists/:id', async () => {
    expect((await request(app).delete('/lists/123')).status).toBe(401);
  });
});

describe('Items — 401 without auth', () => {
  it('POST /lists/:id/items', async () => {
    expect((await request(app).post('/lists/123/items').send({ name: 'X' })).status).toBe(401);
  });
  it('GET /lists/:id/items', async () => {
    expect((await request(app).get('/lists/123/items')).status).toBe(401);
  });
  it('PUT /lists/:id/items/:itemId', async () => {
    expect((await request(app).put('/lists/123/items/456').send({ name: 'X' })).status).toBe(401);
  });
  it('DELETE /lists/:id/items/:itemId', async () => {
    expect((await request(app).delete('/lists/123/items/456')).status).toBe(401);
  });
});

// ── List CRUD ───────────────────────────────────────────────────────────────

describe('GET /lists', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns user lists with 200', async () => {
    mockListFindMany.mockResolvedValue([LIST_1]);

    const res = await request(app).get('/lists').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty('id', 'list-1');
  });

  it('returns 500 on db error', async () => {
    mockListFindMany.mockRejectedValue(new Error('db error'));

    const res = await request(app).get('/lists').set(AUTH);

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'INTERNAL_ERROR' });
  });
});

describe('POST /lists', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a list and returns 201', async () => {
    mockListCreate.mockResolvedValue(LIST_WITH_ITEMS);

    const res = await request(app).post('/lists').set(AUTH).send({ name: 'My List' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 'list-1');
  });

  it('returns 400 for missing name', async () => {
    const res = await request(app).post('/lists').set(AUTH).send({});

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'VALIDATION_ERROR' });
  });

  it('returns 400 for empty name', async () => {
    const res = await request(app).post('/lists').set(AUTH).send({ name: '' });

    expect(res.status).toBe(400);
  });

  it('returns 500 on db error', async () => {
    mockListCreate.mockRejectedValue(new Error('db error'));

    const res = await request(app).post('/lists').set(AUTH).send({ name: 'My List' });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'INTERNAL_ERROR' });
  });
});

describe('GET /lists/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns list with items', async () => {
    mockListFindFirst.mockResolvedValue(LIST_WITH_ITEMS);

    const res = await request(app).get('/lists/list-1').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'list-1');
  });

  it('returns 404 when list not found or not owned', async () => {
    mockListFindFirst.mockResolvedValue(null);

    const res = await request(app).get('/lists/no-such-list').set(AUTH);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('returns 500 on db error', async () => {
    mockListFindFirst.mockRejectedValue(new Error('db error'));

    const res = await request(app).get('/lists/list-1').set(AUTH);

    expect(res.status).toBe(500);
  });
});

describe('PUT /lists/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates list name and returns 200', async () => {
    mockListFindFirst.mockResolvedValue(LIST_1);
    mockListUpdate.mockResolvedValue({ ...LIST_WITH_ITEMS, name: 'Renamed' });

    const res = await request(app).put('/lists/list-1').set(AUTH).send({ name: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Renamed');
  });

  it('returns 404 when list not found or not owned', async () => {
    mockListFindFirst.mockResolvedValue(null);

    const res = await request(app).put('/lists/list-1').set(AUTH).send({ name: 'Renamed' });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('returns 400 for missing name', async () => {
    const res = await request(app).put('/lists/list-1').set(AUTH).send({});

    expect(res.status).toBe(400);
  });

  it('returns 500 on db error', async () => {
    mockListFindFirst.mockResolvedValue(LIST_1);
    mockListUpdate.mockRejectedValue(new Error('db error'));

    const res = await request(app).put('/lists/list-1').set(AUTH).send({ name: 'Renamed' });

    expect(res.status).toBe(500);
  });
});

describe('DELETE /lists/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes list and returns 204', async () => {
    mockListFindFirst.mockResolvedValue(LIST_1);
    mockListDelete.mockResolvedValue(LIST_1);

    const res = await request(app).delete('/lists/list-1').set(AUTH);

    expect(res.status).toBe(204);
  });

  it('returns 404 when list not found or not owned', async () => {
    mockListFindFirst.mockResolvedValue(null);

    const res = await request(app).delete('/lists/list-1').set(AUTH);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('returns 500 on db error', async () => {
    mockListFindFirst.mockResolvedValue(LIST_1);
    mockListDelete.mockRejectedValue(new Error('db error'));

    const res = await request(app).delete('/lists/list-1').set(AUTH);

    expect(res.status).toBe(500);
  });
});

// ── Item CRUD ───────────────────────────────────────────────────────────────
// Note: POST /lists/:id/items is covered by items.test.ts

describe('GET /lists/:id/items', () => {
  // Route: list.findFirst({ where: { id, userId } }) → item.findMany({ where: { listId } })
  beforeEach(() => jest.clearAllMocks());

  it('returns items for the list', async () => {
    mockListFindFirst.mockResolvedValue(LIST_1);
    mockItemFindMany.mockResolvedValue([ITEM_1]);

    const res = await request(app).get('/lists/list-1/items').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns 404 when list not found or not owned', async () => {
    mockListFindFirst.mockResolvedValue(null);

    const res = await request(app).get('/lists/list-1/items').set(AUTH);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('returns 500 on db error', async () => {
    mockListFindFirst.mockResolvedValue(LIST_1);
    mockItemFindMany.mockRejectedValue(new Error('db error'));

    const res = await request(app).get('/lists/list-1/items').set(AUTH);

    expect(res.status).toBe(500);
  });
});

describe('PUT /lists/:id/items/:itemId', () => {
  // Route: item.findFirst({ where: { id: itemId, listId, list: { userId } } }) → item.update
  beforeEach(() => jest.clearAllMocks());

  it('updates item and returns 200', async () => {
    mockItemFindFirst.mockResolvedValue(ITEM_1);
    mockItemUpdate.mockResolvedValue({ ...ITEM_1, name: 'Oat Milk' });

    const res = await request(app).put('/lists/list-1/items/item-1').set(AUTH).send({ name: 'Oat Milk' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Oat Milk');
  });

  it('returns 404 when item not found or not owned', async () => {
    mockItemFindFirst.mockResolvedValue(null);

    const res = await request(app).put('/lists/list-1/items/item-1').set(AUTH).send({ name: 'Oat Milk' });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('returns 400 for invalid unit', async () => {
    const res = await request(app).put('/lists/list-1/items/item-1').set(AUTH).send({ unit: 'cups' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'VALIDATION_ERROR' });
  });

  it('returns 500 on db error', async () => {
    mockItemFindFirst.mockResolvedValue(ITEM_1);
    mockItemUpdate.mockRejectedValue(new Error('db error'));

    const res = await request(app).put('/lists/list-1/items/item-1').set(AUTH).send({ name: 'Oat Milk' });

    expect(res.status).toBe(500);
  });
});

describe('DELETE /lists/:id/items/:itemId', () => {
  // Route: item.findFirst({ where: { id: itemId, listId, list: { userId } } }) → item.delete
  beforeEach(() => jest.clearAllMocks());

  it('deletes item and returns 204', async () => {
    mockItemFindFirst.mockResolvedValue(ITEM_1);
    mockItemDelete.mockResolvedValue(ITEM_1);

    const res = await request(app).delete('/lists/list-1/items/item-1').set(AUTH);

    expect(res.status).toBe(204);
  });

  it('returns 404 when item not found or not owned', async () => {
    mockItemFindFirst.mockResolvedValue(null);

    const res = await request(app).delete('/lists/list-1/items/item-1').set(AUTH);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('returns 500 on db error', async () => {
    mockItemFindFirst.mockResolvedValue(ITEM_1);
    mockItemDelete.mockRejectedValue(new Error('db error'));

    const res = await request(app).delete('/lists/list-1/items/item-1').set(AUTH);

    expect(res.status).toBe(500);
  });
});

// ── Reorder ─────────────────────────────────────────────────────────────────

describe('PUT /lists/:id/items/reorder', () => {
  // Route: list.findFirst (ownership) → item.findMany (existing ids) → $transaction (updates)
  // Note: reorder route must be registered BEFORE /:id/items/:itemId to avoid param capture
  beforeEach(() => jest.clearAllMocks());

  it('reorders items and returns 200', async () => {
    const reorderedItems = [{ ...ITEM_1, id: CUID_2, position: 1 }, { ...ITEM_1, id: CUID_1, position: 2 }];
    mockListFindFirst.mockResolvedValue(LIST_1);
    mockItemFindMany.mockResolvedValue([{ id: CUID_1 }, { id: CUID_2 }]);
    mockTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => fn({
      item: {
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue(reorderedItems),
      },
    }));

    const res = await request(app)
      .put('/lists/list-1/items/reorder')
      .set(AUTH)
      .send({ itemIds: [CUID_2, CUID_1] });

    expect(res.status).toBe(200);
  });

  it('returns 404 when list not found or not owned', async () => {
    mockListFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .put('/lists/list-1/items/reorder')
      .set(AUTH)
      .send({ itemIds: [CUID_1] });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('returns 400 for item IDs not in the list', async () => {
    const OTHER_CUID = 'clhb4yoaw000208l7hzml4g05';
    mockListFindFirst.mockResolvedValue(LIST_1);
    mockItemFindMany.mockResolvedValue([{ id: CUID_1 }]);

    const res = await request(app)
      .put('/lists/list-1/items/reorder')
      .set(AUTH)
      .send({ itemIds: [OTHER_CUID] });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'BAD_REQUEST' });
  });

  it('returns 400 when not all list items are included', async () => {
    mockListFindFirst.mockResolvedValue(LIST_1);
    mockItemFindMany.mockResolvedValue([{ id: CUID_1 }, { id: CUID_2 }]);

    const res = await request(app)
      .put('/lists/list-1/items/reorder')
      .set(AUTH)
      .send({ itemIds: [CUID_1] });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'BAD_REQUEST' });
  });

  it('returns 400 for empty itemIds (schema validation)', async () => {
    const res = await request(app)
      .put('/lists/list-1/items/reorder')
      .set(AUTH)
      .send({ itemIds: [] });

    expect(res.status).toBe(400);
  });

  it('returns 500 on db error', async () => {
    mockListFindFirst.mockResolvedValue(LIST_1);
    mockItemFindMany.mockRejectedValue(new Error('db error'));

    const res = await request(app)
      .put('/lists/list-1/items/reorder')
      .set(AUTH)
      .send({ itemIds: [CUID_1] });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'INTERNAL_ERROR' });
  });
});
