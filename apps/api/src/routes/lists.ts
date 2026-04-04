import { Router, Request, Response } from 'express';
import { validateRequest } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { CreateListSchema, UpdateListSchema } from '../schemas/list.schema.js';
import { getPrisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authMiddleware);
router.use(generalRateLimit);

/**
 * POST /lists
 * Create a new grocery list
 * Requires authentication
 * Accepts: { name }
 * Returns: list object
 */
router.post(
  '/',
  validateRequest(CreateListSchema),
  async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      const userId = req.user!.id;

      const prisma = getPrisma();
      const list = await prisma.list.create({
        data: {
          name,
          userId,
        },
        include: {
          items: true,
        },
      });

      logger.info(
        {
          userId,
          listId: list.id,
        },
        'List created'
      );

      return res.status(201).json(list);
    } catch (err: any) {
      logger.error({ err }, 'List creation error');

      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to create list',
        statusCode: 500,
      });
    }
  }
);

/**
 * GET /lists
 * Get all user's grocery lists
 * Requires authentication
 * Returns: array of list summaries
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const prisma = getPrisma();
    const lists = await prisma.list.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    logger.info(
      {
        userId,
        listCount: lists.length,
      },
      'Lists retrieved'
    );

    return res.status(200).json(lists);
  } catch (err: any) {
    logger.error({ err }, 'List retrieval error');

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve lists',
      statusCode: 500,
    });
  }
});

/**
 * GET /lists/:id
 * Get a specific grocery list by ID
 * Requires authentication and ownership
 * Returns: list object with items
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const prisma = getPrisma();
    const list = await prisma.list.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!list) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'List not found',
        statusCode: 404,
      });
    }

    logger.info(
      {
        userId,
        listId: list.id,
      },
      'List retrieved'
    );

    return res.status(200).json(list);
  } catch (err: any) {
    logger.error({ err }, 'List retrieval error');

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve list',
      statusCode: 500,
    });
  }
});

/**
 * PUT /lists/:id
 * Update a grocery list name
 * Requires authentication and ownership
 * Accepts: { name }
 * Returns: updated list object
 */
router.put(
  '/:id',
  validateRequest(UpdateListSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const userId = req.user!.id;

      const prisma = getPrisma();
      const list = await prisma.list.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!list) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'List not found',
          statusCode: 404,
        });
      }

      const updatedList = await prisma.list.update({
        where: {
          id,
        },
        data: {
          name,
        },
        include: {
          items: true,
        },
      });

      logger.info(
        {
          userId,
          listId: updatedList.id,
        },
        'List updated'
      );

      return res.status(200).json(updatedList);
    } catch (err: any) {
      logger.error({ err }, 'List update error');

      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update list',
        statusCode: 500,
      });
    }
  }
);

/**
 * DELETE /lists/:id
 * Delete a grocery list and all its items
 * Requires authentication and ownership
 * Returns: 204 No Content
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const prisma = getPrisma();
    const list = await prisma.list.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!list) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'List not found',
        statusCode: 404,
      });
    }

    // Delete the list (cascade will delete items)
    await prisma.list.delete({
      where: {
        id,
      },
    });

    logger.info(
      {
        userId,
        listId: id,
      },
      'List deleted'
    );

    return res.status(204).send();
  } catch (err: any) {
    logger.error({ err }, 'List deletion error');

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete list',
      statusCode: 500,
    });
  }
});

export default router;
