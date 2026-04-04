import { Router, Request, Response } from 'express';
import { validateRequest } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { CreateListSchema, UpdateListSchema } from '../schemas/list.schema.js';
import { CreateItemSchema, UpdateItemSchema } from '../schemas/item.schema.js';
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

/**
 * POST /lists/:id/items
 * Add a new item to a specific grocery list
 * Requires authentication and list ownership
 * Accepts: { name, quantity?, unit?, notes? }
 * Returns: created item object
 */
router.post(
  '/:id/items',
  validateRequest(CreateItemSchema),
  async (req: Request, res: Response) => {
    try {
      const { id: listId } = req.params;
      const { name, quantity, unit, notes } = req.body;
      const userId = req.user!.id;

      const prisma = getPrisma();

      // Verify list ownership
      const list = await prisma.list.findFirst({
        where: {
          id: listId,
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

      const item = await prisma.item.create({
        data: {
          listId,
          name,
          quantity,
          unit,
          notes,
          checked: false, // New items start as unchecked
        },
      });

      logger.info(
        {
          userId,
          listId,
          itemId: item.id,
        },
        'Item created'
      );

      return res.status(201).json(item);
    } catch (err: any) {
      logger.error({ err }, 'Item creation error');

      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to create item',
        statusCode: 500,
      });
    }
  }
);

/**
 * GET /lists/:id/items
 * Get all items in a specific grocery list
 * Requires authentication and list ownership
 * Returns: array of items
 */
router.get('/:id/items', async (req: Request, res: Response) => {
  try {
    const { id: listId } = req.params;
    const userId = req.user!.id;

    const prisma = getPrisma();

    // Verify list ownership
    const list = await prisma.list.findFirst({
      where: {
        id: listId,
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

    const items = await prisma.item.findMany({
      where: {
        listId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    logger.info(
      {
        userId,
        listId,
        itemCount: items.length,
      },
      'Items retrieved'
    );

    return res.status(200).json(items);
  } catch (err: any) {
    logger.error({ err }, 'Items retrieval error');

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve items',
      statusCode: 500,
    });
  }
});

/**
 * PUT /lists/:id/items/:itemId
 * Update a specific item in a grocery list
 * Requires authentication and list ownership
 * Accepts: { name?, quantity?, unit?, notes?, completed? }
 * Returns: updated item object
 */
router.put(
  '/:id/items/:itemId',
  validateRequest(UpdateItemSchema),
  async (req: Request, res: Response) => {
    try {
      const { id: listId, itemId } = req.params;
      const { name, quantity, unit, notes, completed } = req.body;
      const userId = req.user!.id;

      const prisma = getPrisma();

      // Verify list ownership and item exists
      const item = await prisma.item.findFirst({
        where: {
          id: itemId,
          listId,
          list: {
            userId,
          },
        },
      });

      if (!item) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Item not found',
          statusCode: 404,
        });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (quantity !== undefined) updateData.quantity = quantity;
      if (unit !== undefined) updateData.unit = unit;
      if (notes !== undefined) updateData.notes = notes;
      if (completed !== undefined) updateData.checked = completed;

      const updatedItem = await prisma.item.update({
        where: {
          id: itemId,
        },
        data: updateData,
      });

      logger.info(
        {
          userId,
          listId,
          itemId: updatedItem.id,
        },
        'Item updated'
      );

      return res.status(200).json(updatedItem);
    } catch (err: any) {
      logger.error({ err }, 'Item update error');

      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update item',
        statusCode: 500,
      });
    }
  }
);

/**
 * DELETE /lists/:id/items/:itemId
 * Delete a specific item from a grocery list
 * Requires authentication and list ownership
 * Returns: 204 No Content
 */
router.delete('/:id/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { id: listId, itemId } = req.params;
    const userId = req.user!.id;

    const prisma = getPrisma();

    // Verify list ownership and item exists
    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        listId,
        list: {
          userId,
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Item not found',
        statusCode: 404,
      });
    }

    await prisma.item.delete({
      where: {
        id: itemId,
      },
    });

    logger.info(
      {
        userId,
        listId,
        itemId,
      },
      'Item deleted'
    );

    return res.status(204).send();
  } catch (err: any) {
    logger.error({ err }, 'Item deletion error');

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete item',
      statusCode: 500,
    });
  }
});

export default router;
