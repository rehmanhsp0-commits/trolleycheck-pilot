import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { getPrisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const router = Router();

router.use(authMiddleware);
router.use(generalRateLimit);

/**
 * GET /products
 * Returns the product catalogue with prices.
 * Query: ?category=dairy&store=FreshMart&q=milk
 * Response: { data: Product[], count: number }
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, store, q } = req.query as Record<string, string | undefined>;

    const prisma = getPrisma();

    const where: any = { active: true };

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        prices: store
          ? { where: { store: { equals: store, mode: 'insensitive' } } }
          : true,
        },
      orderBy: [{ popularity: 'desc' }, { category: 'asc' }, { name: 'asc' }],
    });

    logger.info({ userId: req.user!.id, count: products.length, category, q }, 'Products retrieved');

    return res.status(200).json({ data: products, count: products.length });
  } catch (err: any) {
    logger.error({ err }, 'Products retrieval error');

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve products',
      statusCode: 500,
    });
  }
});

/**
 * GET /products/:id
 * Returns a single product with its prices.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const prisma = getPrisma();

    const product = await prisma.product.findFirst({
      where: { id },
      include: { prices: true },
    });

    if (!product) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Product not found',
        statusCode: 404,
      });
    }

    return res.status(200).json(product);
  } catch (err: any) {
    logger.error({ err }, 'Product retrieval error');

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve product',
      statusCode: 500,
    });
  }
});

export default router;
