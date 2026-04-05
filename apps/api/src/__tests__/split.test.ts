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
    { id: 'i1', name: 'Milk',   quantity: 2, unit: 'L',    notes: null, checked: false, position: 1 },
    { id: 'i2', name: 'Bread',  quantity: 1, unit: 'each', notes: null, checked: false, position: 2 },
    { id: 'i3', name: 'Butter', quantity: 1, unit: 'each', notes: null, checked: false, position: 3 },
  ],
};

// Milk: VG cheaper (4.40 vs 5.00), Bread: FM cheaper (3.00 vs 3.50), Butter: FM only
const PRODUCTS = [
  {
    id: 'p1', name: 'Milk', unit: 'L', active: true,
    prices: [{ store: 'Coles', amount: 2.5 }, { store: 'Woolworths', amount: 2.2 }],
  },
  {
    id: 'p2', name: 'Bread', unit: 'each', active: true,
    prices: [{ store: 'Coles', amount: 3.0 }, { store: 'Woolworths', amount: 3.5 }],
  },
  {
    id: 'p3', name: 'Butter', unit: 'each', active: true,
    prices: [{ store: 'Coles', amount: 4.0 }],
  },
];

// ── TC-11: Split-shop optimiser ────────────────────────────────────────────

describe('POST /compare/split (TC-11)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without authentication', async () => {
    const res = await request(app).post('/compare/split').send({ listId: 'list-1' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing listId', async () => {
    const res = await request(app).post('/compare/split').set(AUTH).send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'VALIDATION_ERROR' });
  });

  it('returns 400 for non-positive minimumSaving', async () => {
    const res = await request(app).post('/compare/split').set(AUTH).send({ listId: 'list-1', minimumSaving: -1 });
    expect(res.status).toBe(400);
  });

  it('returns 404 when list not found or not owned', async () => {
    mockListFindFirst.mockResolvedValue(null);
    const res = await request(app).post('/compare/split').set(AUTH).send({ listId: 'no-list' });
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('assigns each item to the cheaper store', async () => {
    mockListFindFirst.mockResolvedValue(LIST_WITH_ITEMS);
    mockProductFindMany.mockResolvedValue(PRODUCTS);

    const res = await request(app).post('/compare/split').set(AUTH).send({ listId: 'list-1' });

    expect(res.status).toBe(200);
    // Milk → ValueGrocer (cheaper), Bread → FreshMart (cheaper), Butter → FreshMart (only store)
    const vgNames = res.body.woolworths.items.map((i: any) => i.name);
    const fmNames = res.body.coles.items.map((i: any) => i.name);
    expect(vgNames).toContain('Milk');
    expect(fmNames).toContain('Bread');
    expect(fmNames).toContain('Butter');
  });

  it('returns correct subtotals', async () => {
    mockListFindFirst.mockResolvedValue(LIST_WITH_ITEMS);
    mockProductFindMany.mockResolvedValue(PRODUCTS);

    const res = await request(app).post('/compare/split').set(AUTH).send({ listId: 'list-1' });

    // FreshMart: Bread 3.00 + Butter 4.00 = 7.00
    expect(res.body.coles.subtotal).toBe(7);
    // ValueGrocer: Milk 2×2.20 = 4.40
    expect(res.body.woolworths.subtotal).toBe(4.4);
  });

  it('returns totalSaving vs cheapest single-store option', async () => {
    mockListFindFirst.mockResolvedValue(LIST_WITH_ITEMS);
    mockProductFindMany.mockResolvedValue(PRODUCTS);

    const res = await request(app).post('/compare/split').set(AUTH).send({ listId: 'list-1' });

    // Split total = 7.00 + 4.40 = 11.40
    // FreshMart single: Milk 5.00 + Bread 3.00 + Butter 4.00 = 12.00
    // ValueGrocer single: Milk 4.40 + Bread 3.50 = 7.90 (Butter not available)
    // Cheapest single-store = 12.00 (VG can't cover Butter)
    // totalSaving = 12.00 - 11.40 = 0.60
    expect(res.body.totalSaving).toBeCloseTo(0.6, 2);
  });

  it('worthSplitting is true when saving exceeds default $5 threshold', async () => {
    // FM much cheaper on Milk, VG much cheaper on Bread → big split saving
    const bigSavingProducts = [
      { id: 'p1', name: 'Milk', unit: 'L', active: true, prices: [
        { store: 'Coles', amount: 1 }, { store: 'Woolworths', amount: 10 }]},  // FM cheaper
      { id: 'p2', name: 'Bread', unit: 'each', active: true, prices: [
        { store: 'Coles', amount: 10 }, { store: 'Woolworths', amount: 1 }]},  // VG cheaper
    ];
    // qty 2 Milk + qty 1 Bread
    // Split: FM=2×1=2, VG=1×1=1 → splitTotal=3
    // Single FM: 2×1 + 1×10 = 12, Single VG: 2×10 + 1×1 = 21, cheapest=12
    // saving = 12 - 3 = 9 → worthSplitting (> $5) = true
    mockListFindFirst.mockResolvedValue({ ...LIST_WITH_ITEMS, items: LIST_WITH_ITEMS.items.slice(0, 2) });
    mockProductFindMany.mockResolvedValue(bigSavingProducts);

    const res = await request(app).post('/compare/split').set(AUTH).send({ listId: 'list-1' });

    expect(res.body.worthSplitting).toBe(true);
    expect(res.body.totalSaving).toBeGreaterThanOrEqual(5);
  });

  it('worthSplitting is false when saving is below default $5 threshold', async () => {
    mockListFindFirst.mockResolvedValue(LIST_WITH_ITEMS);
    mockProductFindMany.mockResolvedValue(PRODUCTS);

    const res = await request(app).post('/compare/split').set(AUTH).send({ listId: 'list-1' });

    // totalSaving ~0.60, below $5 default
    expect(res.body.worthSplitting).toBe(false);
  });

  it('worthSplitting respects custom minimumSaving threshold', async () => {
    mockListFindFirst.mockResolvedValue(LIST_WITH_ITEMS);
    mockProductFindMany.mockResolvedValue(PRODUCTS);

    const res = await request(app).post('/compare/split').set(AUTH).send({ listId: 'list-1', minimumSaving: 0.5 });

    // totalSaving ~0.60, above custom threshold of 0.50
    expect(res.body.worthSplitting).toBe(true);
  });

  it('excludes items in excludeItems from the split', async () => {
    mockListFindFirst.mockResolvedValue(LIST_WITH_ITEMS);
    mockProductFindMany.mockResolvedValue(PRODUCTS);

    const res = await request(app)
      .post('/compare/split')
      .set(AUTH)
      .send({ listId: 'list-1', excludeItems: ['Milk'] });

    const allNames = [
      ...res.body.coles.items.map((i: any) => i.name),
      ...res.body.woolworths.items.map((i: any) => i.name),
    ];
    expect(allNames).not.toContain('Milk');
  });

  it('returns 500 on db error', async () => {
    mockListFindFirst.mockRejectedValue(new Error('db error'));
    const res = await request(app).post('/compare/split').set(AUTH).send({ listId: 'list-1' });
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'INTERNAL_ERROR' });
  });
});
