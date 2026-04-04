import { z } from 'zod';

/**
 * Create item request validation schema
 */
export const VALID_UNITS = ['kg', 'g', 'L', 'mL', 'each'] as const;
export type Unit = (typeof VALID_UNITS)[number];

export const CreateItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(200, 'Item name too long'),
  quantity: z.number().positive('Quantity must be positive').optional(),
  unit: z.enum(VALID_UNITS, { errorMap: () => ({ message: 'Unit must be one of: kg, g, L, mL, each' }) }).optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export type CreateItemRequest = z.infer<typeof CreateItemSchema>;

/**
 * Update item request validation schema
 */
export const UpdateItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(100, 'Item name too long').optional(),
  quantity: z.number().positive('Quantity must be positive').optional(),
  unit: z.enum(VALID_UNITS, { errorMap: () => ({ message: 'Unit must be one of: kg, g, L, mL, each' }) }).optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
  completed: z.boolean().optional(),
});

export type UpdateItemRequest = z.infer<typeof UpdateItemSchema>;

/**
 * Item response schema
 */
export const ItemResponseSchema = z.object({
  id: z.string(),
  listId: z.string(),
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  notes: z.string().nullable(),
  completed: z.boolean(),
  position: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ItemResponse = z.infer<typeof ItemResponseSchema>;

/**
 * Items array response schema
 */
export const ItemsResponseSchema = z.array(ItemResponseSchema);

export type ItemsResponse = z.infer<typeof ItemsResponseSchema>;

/**
 * Reorder items request validation schema
 */
export const ReorderItemsSchema = z.object({
  itemIds: z.array(z.string().cuid()).min(1, 'At least one item ID is required'),
});

export type ReorderItemsRequest = z.infer<typeof ReorderItemsSchema>;
