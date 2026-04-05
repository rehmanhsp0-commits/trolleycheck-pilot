import { Router, Request, Response } from 'express';
import { validateRequest } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { CompareSchema, SplitSchema } from '../schemas/compare.schema.js';
import { getPrisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const router = Router();

router.use(authMiddleware);
router.use(generalRateLimit);

const STORES = ['Coles', 'Woolworths'] as const;

/**
 * POST /compare
 * Compare basket prices across FreshMart and ValueGrocer for a grocery list.
 * Accepts: { listId: string }
 * Returns: {
 *   coles: { total, items },
 *   woolworths: { total, items },
 *   cheaperStore: 'Coles' | 'Woolworths' | null,
 *   saving: { amount, percentage },
 *   notFound: string[]
 * }
 */
router.post('/', validateRequest(CompareSchema), async (req: Request, res: Response) => {
  try {
    const { listId } = req.body;
    const userId = req.user!.id;

    const prisma = getPrisma();

    // Verify list ownership and fetch items
    const list = await prisma.list.findFirst({
      where: { id: listId, userId },
      include: { items: { orderBy: { position: 'asc' } } },
    });

    if (!list) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'List not found',
        statusCode: 404,
      });
    }

    if (list.items.length === 0) {
      return res.status(200).json({
        coles: { total: 0, items: [] },
        woolworths: { total: 0, items: [] },
        cheaperStore: null,
        saving: { amount: 0, percentage: 0 },
        notFound: [],
      });
    }

    // Look up products by name (case-insensitive) with their prices
    const itemNames = list.items.map((item) => item.name);

    const products = await prisma.product.findMany({
      where: {
        name: { in: itemNames, mode: 'insensitive' },
        active: true,
      },
      include: {
        prices: {
          where: { store: { in: [...STORES] } },
        },
      },
    });

    // Build a lookup map: lowercase name → product
    const productMap = new Map(products.map((p) => [p.name.toLowerCase(), p]));

    type StoreItemPrice = { unitPrice: number; total: number };
    type ItemRow = {
      name: string;
      quantity: number;
      unit: string;
      coles: StoreItemPrice | null;
      woolworths: StoreItemPrice | null;
      cheaperStore: 'Coles' | 'Woolworths' | null;
      saving: number;
    };

    const colesItems: { name: string; quantity: number; unit: string; unitPrice: number; total: number }[] = [];
    const woolworthsItems: { name: string; quantity: number; unit: string; unitPrice: number; total: number }[] = [];
    const itemRows: ItemRow[] = [];
    const notFound: string[] = [];

    for (const item of list.items) {
      const product = productMap.get(item.name.toLowerCase());

      if (!product) {
        notFound.push(item.name);
        continue;
      }

      const colesPrice = product.prices.find((p) => p.store === 'Coles');
      const woolworthsPrice = product.prices.find((p) => p.store === 'Woolworths');

      if (!colesPrice && !woolworthsPrice) {
        notFound.push(item.name);
        continue;
      }

      const quantity = item.quantity ?? 1;
      const unit = item.unit ?? product.unit;

      const fmPrice = colesPrice
        ? { unitPrice: colesPrice.amount, total: Math.round(colesPrice.amount * quantity * 100) / 100 }
        : null;
      const vgPrice = woolworthsPrice
        ? { unitPrice: woolworthsPrice.amount, total: Math.round(woolworthsPrice.amount * quantity * 100) / 100 }
        : null;

      let itemCheaperStore: 'Coles' | 'Woolworths' | null = null;
      let itemSaving = 0;

      if (fmPrice && vgPrice) {
        if (fmPrice.total < vgPrice.total) {
          itemCheaperStore = 'Coles';
          itemSaving = Math.round((vgPrice.total - fmPrice.total) * 100) / 100;
        } else if (vgPrice.total < fmPrice.total) {
          itemCheaperStore = 'Woolworths';
          itemSaving = Math.round((fmPrice.total - vgPrice.total) * 100) / 100;
        }
      }

      itemRows.push({ name: item.name, quantity, unit, coles: fmPrice, woolworths: vgPrice, cheaperStore: itemCheaperStore, saving: itemSaving });

      if (fmPrice) {
        colesItems.push({ name: item.name, quantity, unit, unitPrice: fmPrice.unitPrice, total: fmPrice.total });
      }
      if (vgPrice) {
        woolworthsItems.push({ name: item.name, quantity, unit, unitPrice: vgPrice.unitPrice, total: vgPrice.total });
      }
    }

    // Sort item comparisons by saving (largest first)
    itemRows.sort((a, b) => b.saving - a.saving);

    const colesTotal = Math.round(colesItems.reduce((sum, i) => sum + i.total, 0) * 100) / 100;
    const woolworthsTotal = Math.round(woolworthsItems.reduce((sum, i) => sum + i.total, 0) * 100) / 100;

    let cheaperStore: 'Coles' | 'Woolworths' | null = null;
    let savingAmount = 0;
    let savingPercentage = 0;

    if (colesTotal > 0 && woolworthsTotal > 0) {
      if (colesTotal < woolworthsTotal) {
        cheaperStore = 'Coles';
        savingAmount = Math.round((woolworthsTotal - colesTotal) * 100) / 100;
        savingPercentage = Math.round((savingAmount / woolworthsTotal) * 10000) / 100;
      } else if (woolworthsTotal < colesTotal) {
        cheaperStore = 'Woolworths';
        savingAmount = Math.round((colesTotal - woolworthsTotal) * 100) / 100;
        savingPercentage = Math.round((savingAmount / colesTotal) * 10000) / 100;
      }
    }

    logger.info(
      {
        userId,
        listId,
        colesTotal,
        woolworthsTotal,
        cheaperStore,
        notFoundCount: notFound.length,
      },
      'Basket comparison completed'
    );

    return res.status(200).json({
      coles: { total: colesTotal, items: colesItems },
      woolworths: { total: woolworthsTotal, items: woolworthsItems },
      items: itemRows,
      cheaperStore,
      saving: { amount: savingAmount, percentage: savingPercentage },
      notFound,
    });
  } catch (err: any) {
    logger.error({ err }, 'Basket comparison error');

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to compare basket prices',
      statusCode: 500,
    });
  }
});

const DEFAULT_MINIMUM_SAVING = 5;

/**
 * POST /compare/split
 * Split-shop optimiser: assigns each item to the cheapest available store.
 * Accepts: { listId, minimumSaving?, excludeItems? }
 * Returns: {
 *   coles: { items, subtotal },
 *   woolworths: { items, subtotal },
 *   totalSaving,
 *   worthSplitting
 * }
 */
router.post('/split', validateRequest(SplitSchema), async (req: Request, res: Response) => {
  try {
    const { listId, minimumSaving = DEFAULT_MINIMUM_SAVING, excludeItems = [] } = req.body;
    const userId = req.user!.id;

    const prisma = getPrisma();

    const list = await prisma.list.findFirst({
      where: { id: listId, userId },
      include: { items: { orderBy: { position: 'asc' } } },
    });

    if (!list) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'List not found',
        statusCode: 404,
      });
    }

    const activeItems = list.items.filter(
      (item) => !excludeItems.map((e: string) => e.toLowerCase()).includes(item.name.toLowerCase())
    );

    const itemNames = activeItems.map((item) => item.name);

    const products = await prisma.product.findMany({
      where: {
        name: { in: itemNames, mode: 'insensitive' },
        active: true,
      },
      include: {
        prices: { where: { store: { in: [...STORES] } } },
      },
    });

    const productMap = new Map(products.map((p) => [p.name.toLowerCase(), p]));

    type SplitItem = { name: string; quantity: number; unit: string; unitPrice: number; total: number };
    const colesItems: SplitItem[] = [];
    const woolworthsItems: SplitItem[] = [];

    for (const item of activeItems) {
      const product = productMap.get(item.name.toLowerCase());
      if (!product) continue;

      const fmPrice = product.prices.find((p) => p.store === 'Coles');
      const vgPrice = product.prices.find((p) => p.store === 'Woolworths');

      if (!fmPrice && !vgPrice) continue;

      const quantity = item.quantity ?? 1;
      const unit = item.unit ?? product.unit;

      if (fmPrice && vgPrice) {
        // Assign to cheaper store
        if (fmPrice.amount <= vgPrice.amount) {
          colesItems.push({ name: item.name, quantity, unit, unitPrice: fmPrice.amount, total: Math.round(fmPrice.amount * quantity * 100) / 100 });
        } else {
          woolworthsItems.push({ name: item.name, quantity, unit, unitPrice: vgPrice.amount, total: Math.round(vgPrice.amount * quantity * 100) / 100 });
        }
      } else if (fmPrice) {
        colesItems.push({ name: item.name, quantity, unit, unitPrice: fmPrice.amount, total: Math.round(fmPrice.amount * quantity * 100) / 100 });
      } else if (vgPrice) {
        woolworthsItems.push({ name: item.name, quantity, unit, unitPrice: vgPrice.amount, total: Math.round(vgPrice.amount * quantity * 100) / 100 });
      }
    }

    const colesSubtotal = Math.round(colesItems.reduce((s, i) => s + i.total, 0) * 100) / 100;
    const woolworthsSubtotal = Math.round(woolworthsItems.reduce((s, i) => s + i.total, 0) * 100) / 100;
    const splitTotal = Math.round((colesSubtotal + woolworthsSubtotal) * 100) / 100;

    // Best single-store: use the store that covers the most items at lowest cost
    // Sum all items at FreshMart (use VG price if FM not available), and vice versa
    let colesSingleTotal = 0;
    let woolworthsSingleTotal = 0;
    let colesComplete = true;
    let woolworthsComplete = true;

    for (const item of activeItems) {
      const product = productMap.get(item.name.toLowerCase());
      if (!product) continue;
      const fmPrice = product.prices.find((p) => p.store === 'Coles');
      const vgPrice = product.prices.find((p) => p.store === 'Woolworths');
      const qty = item.quantity ?? 1;

      if (fmPrice) {
        colesSingleTotal += fmPrice.amount * qty;
      } else {
        colesComplete = false;
      }
      if (vgPrice) {
        woolworthsSingleTotal += vgPrice.amount * qty;
      } else {
        woolworthsComplete = false;
      }
    }

    colesSingleTotal = Math.round(colesSingleTotal * 100) / 100;
    woolworthsSingleTotal = Math.round(woolworthsSingleTotal * 100) / 100;

    // Cheapest single-store that has all found items; prefer the complete one
    let cheapestSingle: number;
    if (colesComplete && woolworthsComplete) {
      cheapestSingle = Math.min(colesSingleTotal, woolworthsSingleTotal);
    } else if (colesComplete) {
      cheapestSingle = colesSingleTotal;
    } else if (woolworthsComplete) {
      cheapestSingle = woolworthsSingleTotal;
    } else {
      cheapestSingle = Math.min(colesSingleTotal, woolworthsSingleTotal);
    }

    const totalSaving = Math.round((cheapestSingle - splitTotal) * 100) / 100;
    const worthSplitting = totalSaving >= minimumSaving;

    logger.info({ userId, listId, splitTotal, cheapestSingle, totalSaving, worthSplitting }, 'Split-shop optimiser completed');

    return res.status(200).json({
      coles: { items: colesItems, subtotal: colesSubtotal },
      woolworths: { items: woolworthsItems, subtotal: woolworthsSubtotal },
      totalSaving: Math.max(0, totalSaving),
      worthSplitting,
    });
  } catch (err: any) {
    logger.error({ err }, 'Split-shop optimiser error');

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to calculate split-shop optimisation',
      statusCode: 500,
    });
  }
});

export default router;
