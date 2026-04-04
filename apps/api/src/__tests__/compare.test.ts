import request from 'supertest';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockListFindFirst = jest.fn();
const mockProductFindMany = jest.fn();

jest.mock('../lib/prisma.js', () => ({
  getPrisma: jest.fn(() => ({
    list: { findFirst: mockListFindFirst },
    product: { findMany: mockProductFindMany },
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

const LIST_WITH_ITEMS = {
  id: 'list-1',
  userId: 'test-user-id',
  name: 'Weekly Shop',
  items: [
    { id: 'item-1', name: 'Milk', quantity: 2, unit: 'L', notes: null, checked: false, position: 1 },
    { id: 'item-2', name: 'Bread', quantity: 1, unit: 'each', notes: null, checked: false, position: 2 },
  ],
};

const PRODUCTS_WITH_PRICES = [
  {
    id: 'prod-1',
    name: 'Milk',
    unit: 'L',
    active: true,
    prices: [
      { store: 'FreshMart', amount: 2.5 },
      { store: 'ValueGrocer', amount: 2.2 },
    ],
  },
  {
    id: 'prod-2',
    name: 'Bread',
    unit: 'each',
    active: true,
    prices: [
      { store: 'FreshMart', amount: 3.0 },
      { store: 'ValueGrocer', amount: 3.5 },
    ],
  },
];

// ── TC-9: Compare basket prices ────────────────────────────────────────────

describe('POST /compare (TC-9)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without authentication', async () => {
    const res = await request(app).post('/compare').send({ listId: 'list-1' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
  });

  it('returns 400 for missing listId', async () => {
    const res = await request(app).post('/compare').set(AUTH).send({});

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'VALIDATION_ERROR' });
  });

  it('returns 404 when list not found or not owned', async () => {
    mockListFindFirst.mockResolvedValue(null);

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'no-such-list' });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('returns totals for both stores', async () => {
    mockListFindFirst.mockResolvedValue(LIST_WITH_ITEMS);
    mockProductFindMany.mockResolvedValue(PRODUCTS_WITH_PRICES);

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.status).toBe(200);
    // FreshMart: Milk 2×2.5=5.00, Bread 1×3.00=3.00 → 8.00
    expect(res.body.freshmart.total).toBe(8);
    // ValueGrocer: Milk 2×2.2=4.40, Bread 1×3.50=3.50 → 7.90
    expect(res.body.valuegrocer.total).toBe(7.9);
  });

  it('identifies the cheaper store', async () => {
    mockListFindFirst.mockResolvedValue(LIST_WITH_ITEMS);
    mockProductFindMany.mockResolvedValue(PRODUCTS_WITH_PRICES);

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.body.cheaperStore).toBe('ValueGrocer');
  });

  it('returns saving amount and percentage', async () => {
    mockListFindFirst.mockResolvedValue(LIST_WITH_ITEMS);
    mockProductFindMany.mockResolvedValue(PRODUCTS_WITH_PRICES);

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    // saving = 8.00 - 7.90 = 0.10
    expect(res.body.saving.amount).toBe(0.1);
    expect(res.body.saving.percentage).toBeGreaterThan(0);
  });

  it('returns item-level breakdown for each store', async () => {
    mockListFindFirst.mockResolvedValue(LIST_WITH_ITEMS);
    mockProductFindMany.mockResolvedValue(PRODUCTS_WITH_PRICES);

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.body.freshmart.items).toHaveLength(2);
    expect(res.body.valuegrocer.items).toHaveLength(2);

    const milkFresh = res.body.freshmart.items.find((i: any) => i.name === 'Milk');
    expect(milkFresh).toMatchObject({ quantity: 2, unitPrice: 2.5, total: 5 });
  });

  it('adds items with no matching product to notFound', async () => {
    const listWithUnknown = {
      ...LIST_WITH_ITEMS,
      items: [
        ...LIST_WITH_ITEMS.items,
        { id: 'item-3', name: 'Truffles', quantity: 1, unit: 'each', notes: null, checked: false, position: 3 },
      ],
    };
    mockListFindFirst.mockResolvedValue(listWithUnknown);
    mockProductFindMany.mockResolvedValue(PRODUCTS_WITH_PRICES);

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.body.notFound).toContain('Truffles');
  });

  it('matches product names case-insensitively', async () => {
    const listUpperCase = {
      ...LIST_WITH_ITEMS,
      items: [{ id: 'item-1', name: 'MILK', quantity: 1, unit: 'L', notes: null, checked: false, position: 1 }],
    };
    mockListFindFirst.mockResolvedValue(listUpperCase);
    mockProductFindMany.mockResolvedValue([PRODUCTS_WITH_PRICES[0]]);

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.status).toBe(200);
    expect(res.body.freshmart.items).toHaveLength(1);
    expect(res.body.notFound).toHaveLength(0);
  });

  it('returns empty comparison for list with no items', async () => {
    mockListFindFirst.mockResolvedValue({ ...LIST_WITH_ITEMS, items: [] });

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.status).toBe(200);
    expect(res.body.freshmart.total).toBe(0);
    expect(res.body.valuegrocer.total).toBe(0);
    expect(res.body.cheaperStore).toBeNull();
    expect(res.body.notFound).toHaveLength(0);
  });

  it('returns cheaperStore null when totals are equal', async () => {
    const equalPriceProducts = [
      {
        id: 'prod-1',
        name: 'Milk',
        unit: 'L',
        active: true,
        prices: [
          { store: 'FreshMart', amount: 2.5 },
          { store: 'ValueGrocer', amount: 2.5 },
        ],
      },
    ];
    mockListFindFirst.mockResolvedValue({
      ...LIST_WITH_ITEMS,
      items: [{ id: 'item-1', name: 'Milk', quantity: 1, unit: 'L', notes: null, checked: false, position: 1 }],
    });
    mockProductFindMany.mockResolvedValue(equalPriceProducts);

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.status).toBe(200);
    expect(res.body.cheaperStore).toBeNull();
    expect(res.body.saving.amount).toBe(0);
  });

  it('handles items available at only one store', async () => {
    const freshmartOnly = [
      {
        id: 'prod-1',
        name: 'Milk',
        unit: 'L',
        active: true,
        prices: [{ store: 'FreshMart', amount: 2.5 }],
      },
    ];
    mockListFindFirst.mockResolvedValue({
      ...LIST_WITH_ITEMS,
      items: [{ id: 'item-1', name: 'Milk', quantity: 2, unit: 'L', notes: null, checked: false, position: 1 }],
    });
    mockProductFindMany.mockResolvedValue(freshmartOnly);

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.status).toBe(200);
    expect(res.body.freshmart.items).toHaveLength(1);
    expect(res.body.valuegrocer.items).toHaveLength(0);
    expect(res.body.cheaperStore).toBeNull(); // can't compare with only one store
  });

  it('returns 500 on db error', async () => {
    mockListFindFirst.mockRejectedValue(new Error('db error'));

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'INTERNAL_ERROR' });
  });
});
