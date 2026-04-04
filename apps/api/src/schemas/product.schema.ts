import { z } from 'zod';

export const ProductQuerySchema = z.object({
  category: z.string().optional(),
  store: z.string().optional(),
  q: z.string().optional(),
});

export type ProductQuery = z.infer<typeof ProductQuerySchema>;

export const ProductResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  unit: z.string(),
  active: z.boolean(),
  prices: z.array(
    z.object({
      store: z.string(),
      amount: z.number(),
      currency: z.string(),
      updatedAt: z.date(),
    })
  ),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProductResponse = z.infer<typeof ProductResponseSchema>;
