import { z } from 'zod';

export const CompareSchema = z.object({
  listId: z.string().min(1, 'listId is required'),
});

export type CompareRequest = z.infer<typeof CompareSchema>;

export const ComparedItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  total: z.number(),
});

export type ComparedItem = z.infer<typeof ComparedItemSchema>;

export const StoreResultSchema = z.object({
  total: z.number(),
  items: z.array(ComparedItemSchema),
});

export const CompareResponseSchema = z.object({
  freshmart: StoreResultSchema,
  valuegrocer: StoreResultSchema,
  cheaperStore: z.enum(['FreshMart', 'ValueGrocer']).nullable(),
  saving: z.object({
    amount: z.number(),
    percentage: z.number(),
  }),
  notFound: z.array(z.string()),
});

export type CompareResponse = z.infer<typeof CompareResponseSchema>;
