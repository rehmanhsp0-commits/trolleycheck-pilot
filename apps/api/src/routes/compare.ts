import { Router, Request, Response } from 'express';
import { validateRequest } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { CompareSchema } from '../schemas/compare.schema.js';
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

    const freshmartItems: { name: string; quantity: number; unit: string; unitPrice: number; total: number }[] = [];
    const valuegrocerItems: { name: string; quantity: number; unit: string; unitPrice: number; total: number }[] = [];
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

      if (freshmartPrice) {
        freshmartItems.push({
          name: item.name,
          quantity,
          unit: item.unit ?? product.unit,
          unitPrice: freshmartPrice.amount,
          total: Math.round(freshmartPrice.amount * quantity * 100) / 100,
        });
      }

      if (valuegrocerPrice) {
        valuegrocerItems.push({
          name: item.name,
          quantity,
          unit: item.unit ?? product.unit,
          unitPrice: valuegrocerPrice.amount,
          total: Math.round(valuegrocerPrice.amount * quantity * 100) / 100,
        });
      }
    }

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

export default router;
