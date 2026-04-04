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

const STORES = ['FreshMart', 'ValueGrocer'] as const;

/**
 * POST /compare
 * Compare basket prices across FreshMart and ValueGrocer for a grocery list.
 * Accepts: { listId: string }
 * Returns: {
 *   freshmart: { total, items },
 *   valuegrocer: { total, items },
 *   cheaperStore: 'FreshMart' | 'ValueGrocer' | null,
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
        freshmart: { total: 0, items: [] },
        valuegrocer: { total: 0, items: [] },
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
      freshmart: StoreItemPrice | null;
      valuegrocer: StoreItemPrice | null;
      cheaperStore: 'FreshMart' | 'ValueGrocer' | null;
      saving: number;
    };

    const freshmartItems: { name: string; quantity: number; unit: string; unitPrice: number; total: number }[] = [];
    const valuegrocerItems: { name: string; quantity: number; unit: string; unitPrice: number; total: number }[] = [];
    const itemRows: ItemRow[] = [];
    const notFound: string[] = [];

    for (const item of list.items) {
      const product = productMap.get(item.name.toLowerCase());

      if (!product) {
        notFound.push(item.name);
        continue;
      }

      const freshmartPrice = product.prices.find((p) => p.store === 'FreshMart');
      const valuegrocerPrice = product.prices.find((p) => p.store === 'ValueGrocer');

      if (!freshmartPrice && !valuegrocerPrice) {
        notFound.push(item.name);
        continue;
      }

      const quantity = item.quantity ?? 1;
      const unit = item.unit ?? product.unit;

      const fmPrice = freshmartPrice
        ? { unitPrice: freshmartPrice.amount, total: Math.round(freshmartPrice.amount * quantity * 100) / 100 }
        : null;
      const vgPrice = valuegrocerPrice
        ? { unitPrice: valuegrocerPrice.amount, total: Math.round(valuegrocerPrice.amount * quantity * 100) / 100 }
        : null;

      let itemCheaperStore: 'FreshMart' | 'ValueGrocer' | null = null;
      let itemSaving = 0;

      if (fmPrice && vgPrice) {
        if (fmPrice.total < vgPrice.total) {
          itemCheaperStore = 'FreshMart';
          itemSaving = Math.round((vgPrice.total - fmPrice.total) * 100) / 100;
        } else if (vgPrice.total < fmPrice.total) {
          itemCheaperStore = 'ValueGrocer';
          itemSaving = Math.round((fmPrice.total - vgPrice.total) * 100) / 100;
        }
      }

      itemRows.push({ name: item.name, quantity, unit, freshmart: fmPrice, valuegrocer: vgPrice, cheaperStore: itemCheaperStore, saving: itemSaving });

      if (fmPrice) {
        freshmartItems.push({ name: item.name, quantity, unit, unitPrice: fmPrice.unitPrice, total: fmPrice.total });
      }
      if (vgPrice) {
        valuegrocerItems.push({ name: item.name, quantity, unit, unitPrice: vgPrice.unitPrice, total: vgPrice.total });
      }
    }

    // Sort item comparisons by saving (largest first)
    itemRows.sort((a, b) => b.saving - a.saving);

    const freshmartTotal = Math.round(freshmartItems.reduce((sum, i) => sum + i.total, 0) * 100) / 100;
    const valuegrocerTotal = Math.round(valuegrocerItems.reduce((sum, i) => sum + i.total, 0) * 100) / 100;

    let cheaperStore: 'FreshMart' | 'ValueGrocer' | null = null;
    let savingAmount = 0;
    let savingPercentage = 0;

    if (freshmartTotal > 0 && valuegrocerTotal > 0) {
      if (freshmartTotal < valuegrocerTotal) {
        cheaperStore = 'FreshMart';
        savingAmount = Math.round((valuegrocerTotal - freshmartTotal) * 100) / 100;
        savingPercentage = Math.round((savingAmount / valuegrocerTotal) * 10000) / 100;
      } else if (valuegrocerTotal < freshmartTotal) {
        cheaperStore = 'ValueGrocer';
        savingAmount = Math.round((freshmartTotal - valuegrocerTotal) * 100) / 100;
        savingPercentage = Math.round((savingAmount / freshmartTotal) * 10000) / 100;
      }
    }

    logger.info(
      {
        userId,
        listId,
        freshmartTotal,
        valuegrocerTotal,
        cheaperStore,
        notFoundCount: notFound.length,
      },
      'Basket comparison completed'
    );

    return res.status(200).json({
      freshmart: { total: freshmartTotal, items: freshmartItems },
      valuegrocer: { total: valuegrocerTotal, items: valuegrocerItems },
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
 *   freshmart: { items, subtotal },
 *   valuegrocer: { items, subtotal },
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
    const freshmartItems: SplitItem[] = [];
    const valuegrocerItems: SplitItem[] = [];

    for (const item of activeItems) {
      const product = productMap.get(item.name.toLowerCase());
      if (!product) continue;

      const fmPrice = product.prices.find((p) => p.store === 'FreshMart');
      const vgPrice = product.prices.find((p) => p.store === 'ValueGrocer');

      if (!fmPrice && !vgPrice) continue;

      const quantity = item.quantity ?? 1;
      const unit = item.unit ?? product.unit;

      if (fmPrice && vgPrice) {
        // Assign to cheaper store
        if (fmPrice.amount <= vgPrice.amount) {
          freshmartItems.push({ name: item.name, quantity, unit, unitPrice: fmPrice.amount, total: Math.round(fmPrice.amount * quantity * 100) / 100 });
        } else {
          valuegrocerItems.push({ name: item.name, quantity, unit, unitPrice: vgPrice.amount, total: Math.round(vgPrice.amount * quantity * 100) / 100 });
        }
      } else if (fmPrice) {
        freshmartItems.push({ name: item.name, quantity, unit, unitPrice: fmPrice.amount, total: Math.round(fmPrice.amount * quantity * 100) / 100 });
      } else if (vgPrice) {
        valuegrocerItems.push({ name: item.name, quantity, unit, unitPrice: vgPrice.amount, total: Math.round(vgPrice.amount * quantity * 100) / 100 });
      }
    }

    const fmSubtotal = Math.round(freshmartItems.reduce((s, i) => s + i.total, 0) * 100) / 100;
    const vgSubtotal = Math.round(valuegrocerItems.reduce((s, i) => s + i.total, 0) * 100) / 100;
    const splitTotal = Math.round((fmSubtotal + vgSubtotal) * 100) / 100;

    // Best single-store: use the store that covers the most items at lowest cost
    // Sum all items at FreshMart (use VG price if FM not available), and vice versa
    let fmSingleTotal = 0;
    let vgSingleTotal = 0;
    let fmComplete = true;
    let vgComplete = true;

    for (const item of activeItems) {
      const product = productMap.get(item.name.toLowerCase());
      if (!product) continue;
      const fmPrice = product.prices.find((p) => p.store === 'FreshMart');
      const vgPrice = product.prices.find((p) => p.store === 'ValueGrocer');
      const qty = item.quantity ?? 1;

      if (fmPrice) {
        fmSingleTotal += fmPrice.amount * qty;
      } else {
        fmComplete = false;
      }
      if (vgPrice) {
        vgSingleTotal += vgPrice.amount * qty;
      } else {
        vgComplete = false;
      }
    }

    fmSingleTotal = Math.round(fmSingleTotal * 100) / 100;
    vgSingleTotal = Math.round(vgSingleTotal * 100) / 100;

    // Cheapest single-store that has all found items; prefer the complete one
    let cheapestSingle: number;
    if (fmComplete && vgComplete) {
      cheapestSingle = Math.min(fmSingleTotal, vgSingleTotal);
    } else if (fmComplete) {
      cheapestSingle = fmSingleTotal;
    } else if (vgComplete) {
      cheapestSingle = vgSingleTotal;
    } else {
      cheapestSingle = Math.min(fmSingleTotal, vgSingleTotal);
    }

    const totalSaving = Math.round((cheapestSingle - splitTotal) * 100) / 100;
    const worthSplitting = totalSaving >= minimumSaving;

    logger.info({ userId, listId, splitTotal, cheapestSingle, totalSaving, worthSplitting }, 'Split-shop optimiser completed');

    return res.status(200).json({
      freshmart: { items: freshmartItems, subtotal: fmSubtotal },
      valuegrocer: { items: valuegrocerItems, subtotal: vgSubtotal },
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
