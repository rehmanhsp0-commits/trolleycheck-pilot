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
      { store: 'Coles', amount: 2.5 },
      { store: 'Woolworths', amount: 2.2 },
    ],
  },
  {
    id: 'prod-2',
    name: 'Bread',
    unit: 'each',
    active: true,
    prices: [
      { store: 'Coles', amount: 3.0 },
      { store: 'Woolworths', amount: 3.5 },
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
    expect(res.body.coles.total).toBe(8);
    // ValueGrocer: Milk 2×2.2=4.40, Bread 1×3.50=3.50 → 7.90
    expect(res.body.woolworths.total).toBe(7.9);
  });

  it('identifies the cheaper store', async () => {
    mockListFindFirst.mockResolvedValue(LIST_WITH_ITEMS);
    mockProductFindMany.mockResolvedValue(PRODUCTS_WITH_PRICES);

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.body.cheaperStore).toBe('Woolworths');
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

    expect(res.body.coles.items).toHaveLength(2);
    expect(res.body.woolworths.items).toHaveLength(2);

    const milkFresh = res.body.coles.items.find((i: any) => i.name === 'Milk');
    expect(milkFresh).toMatchObject({ quantity: 2, unitPrice: 2.5, total: 5 });
  });

  it('returns unified items[] array with per-item store comparison (TC-10)', async () => {
    mockListFindFirst.mockResolvedValue(LIST_WITH_ITEMS);
    mockProductFindMany.mockResolvedValue(PRODUCTS_WITH_PRICES);

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.body.items).toHaveLength(2);

    const milk = res.body.items.find((i: any) => i.name === 'Milk');
    expect(milk).toMatchObject({
      name: 'Milk',
      quantity: 2,
      coles: { unitPrice: 2.5, total: 5 },
      woolworths: { unitPrice: 2.2, total: 4.4 },
      cheaperStore: 'Woolworths',
      saving: 0.6,
    });
  });

  it('items[] sorted by saving descending (TC-10)', async () => {
    // Milk saving: 5.00 - 4.40 = 0.60 (VG cheaper)
    // Bread saving: 3.50 - 3.00 = 0.50 (FM cheaper)
    // Sorted: Milk (0.60) first, Bread (0.50) second
    mockListFindFirst.mockResolvedValue(LIST_WITH_ITEMS);
    mockProductFindMany.mockResolvedValue(PRODUCTS_WITH_PRICES);

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.body.items[0].saving).toBeGreaterThanOrEqual(res.body.items[1].saving);
  });

  it('item cheaperStore is null when same price at both stores (TC-10)', async () => {
    const equalProducts = [
      { id: 'p1', name: 'Milk', unit: 'L', active: true, prices: [
        { store: 'Coles', amount: 2.5 },
        { store: 'Woolworths', amount: 2.5 },
      ]},
    ];
    mockListFindFirst.mockResolvedValue({ ...LIST_WITH_ITEMS, items: [LIST_WITH_ITEMS.items[0]] });
    mockProductFindMany.mockResolvedValue(equalProducts);

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.body.items[0].cheaperStore).toBeNull();
    expect(res.body.items[0].saving).toBe(0);
  });

  it('item valuegrocer is null when only FreshMart price exists (TC-10)', async () => {
    const fmOnly = [{ id: 'p1', name: 'Milk', unit: 'L', active: true, prices: [{ store: 'Coles', amount: 2.5 }] }];
    mockListFindFirst.mockResolvedValue({ ...LIST_WITH_ITEMS, items: [LIST_WITH_ITEMS.items[0]] });
    mockProductFindMany.mockResolvedValue(fmOnly);

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.body.items[0].coles).toMatchObject({ unitPrice: 2.5 });
    expect(res.body.items[0].woolworths).toBeNull();
    expect(res.body.items[0].cheaperStore).toBeNull();
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
    expect(res.body.coles.items).toHaveLength(1);
    expect(res.body.notFound).toHaveLength(0);
  });

  it('returns empty comparison for list with no items', async () => {
    mockListFindFirst.mockResolvedValue({ ...LIST_WITH_ITEMS, items: [] });

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.status).toBe(200);
    expect(res.body.coles.total).toBe(0);
    expect(res.body.woolworths.total).toBe(0);
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
          { store: 'Coles', amount: 2.5 },
          { store: 'Woolworths', amount: 2.5 },
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
        prices: [{ store: 'Coles', amount: 2.5 }],
      },
    ];
    mockListFindFirst.mockResolvedValue({
      ...LIST_WITH_ITEMS,
      items: [{ id: 'item-1', name: 'Milk', quantity: 2, unit: 'L', notes: null, checked: false, position: 1 }],
    });
    mockProductFindMany.mockResolvedValue(freshmartOnly);

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.status).toBe(200);
    expect(res.body.coles.items).toHaveLength(1);
    expect(res.body.woolworths.items).toHaveLength(0);
    expect(res.body.cheaperStore).toBeNull(); // can't compare with only one store
  });

  it('returns 500 on db error', async () => {
    mockListFindFirst.mockRejectedValue(new Error('db error'));

    const res = await request(app).post('/compare').set(AUTH).send({ listId: 'list-1' });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'INTERNAL_ERROR' });
  });
});
