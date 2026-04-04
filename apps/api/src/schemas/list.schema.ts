import { z } from 'zod';

/**
 * Create list request validation schema
 */
export const CreateListSchema = z.object({
  name: z.string().min(1, 'List name is required').max(100, 'List name too long'),
});

export type CreateListRequest = z.infer<typeof CreateListSchema>;

/**
 * Update list request validation schema
 */
export const UpdateListSchema = z.object({
  name: z.string().min(1, 'List name is required').max(100, 'List name too long'),
});

export type UpdateListRequest = z.infer<typeof UpdateListSchema>;

/**
 * List response schema
 */
export const ListResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
    notes: z.string().nullable(),
    checked: z.boolean(),
    listId: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ListResponse = z.infer<typeof ListResponseSchema>;

/**
 * List summary response (without items)
 */
export const ListSummaryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ListSummaryResponse = z.infer<typeof ListSummaryResponseSchema>;
