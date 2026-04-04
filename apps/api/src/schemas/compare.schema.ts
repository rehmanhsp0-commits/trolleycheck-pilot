import { z } from 'zod';

export const CompareSchema = z.object({
  listId: z.string().min(1, 'listId is required'),
});

export type CompareRequest = z.infer<typeof CompareSchema>;

export const SplitSchema = z.object({
  listId: z.string().min(1, 'listId is required'),
  minimumSaving: z.number().positive('minimumSaving must be positive').optional(),
  excludeItems: z.array(z.string()).optional(),
});

export type SplitRequest = z.infer<typeof SplitSchema>;

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

const StoreItemPriceSchema = z.object({
  unitPrice: z.number(),
  total: z.number(),
});

export const ItemComparisonSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  freshmart: StoreItemPriceSchema.nullable(),
  valuegrocer: StoreItemPriceSchema.nullable(),
  cheaperStore: z.enum(['FreshMart', 'ValueGrocer']).nullable(),
  saving: z.number(),
});

export type ItemComparison = z.infer<typeof ItemComparisonSchema>;

export const CompareResponseSchema = z.object({
  freshmart: StoreResultSchema,
  valuegrocer: StoreResultSchema,
  items: z.array(ItemComparisonSchema),
  cheaperStore: z.enum(['FreshMart', 'ValueGrocer']).nullable(),
  saving: z.object({
    amount: z.number(),
    percentage: z.number(),
  }),
  notFound: z.array(z.string()),
});

export type CompareResponse = z.infer<typeof CompareResponseSchema>;
