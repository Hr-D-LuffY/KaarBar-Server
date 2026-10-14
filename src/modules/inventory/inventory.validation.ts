import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { MAX_ITEM_QUANTITY } from "../../utils/quantity";
import { searchQuerySchema } from "../../utils/search";
import { sortQuerySchema } from "../../utils/sort";

const INVENTORY_SORT_FIELDS = ["name", "stock", "updatedAt"] as const;
const MAX_ADJUSTMENT_NOTE_LENGTH = 200;
const ADJUSTMENT_REASONS = ["DAMAGE", "COUNT_CORRECTION", "OTHER"] as const;

export const listInventorySchema = z.object({
  query: z.object({
    ...paginationQuerySchema.shape,
    ...searchQuerySchema.shape,
    ...sortQuerySchema(INVENTORY_SORT_FIELDS, "name", "asc").shape,
    categoryId: z.uuid("Invalid category id").optional(),
    lowStock: z.stringbool().optional(),
  }),
});

export type ListInventoryQuery = z.infer<typeof listInventorySchema>["query"];

export const createStockAdjustmentSchema = z.object({
  body: z.object({
    productId: z.uuid("Invalid product id"),
    // Smallest-step count; negative removes stock
    change: z
      .number()
      .int("Change must be a whole number")
      .min(-MAX_ITEM_QUANTITY, "Change is too large")
      .max(MAX_ITEM_QUANTITY, "Change is too large")
      .refine((change) => change !== 0, "Change cannot be zero"),
    reason: z.enum(ADJUSTMENT_REASONS),
    note: z
      .string()
      .trim()
      .max(
        MAX_ADJUSTMENT_NOTE_LENGTH,
        `Note must be at most ${MAX_ADJUSTMENT_NOTE_LENGTH} characters`,
      )
      .optional(),
  }),
});

export const stockMovementsSchema = z.object({
  params: z.object({ productId: z.uuid("Invalid product id") }),
  query: z.object(paginationQuerySchema.shape),
});

// The `details` of a STOCK_ADJUSTMENT activity-log row
export const stockAdjustmentLogDetailsSchema = z.object({
  change: z.number(),
  reason: z.enum(ADJUSTMENT_REASONS),
  note: z.string().nullable(),
});

export type CreateStockAdjustmentInput = z.infer<typeof createStockAdjustmentSchema>["body"];
export type ListStockMovementsQuery = z.infer<typeof stockMovementsSchema>["query"];
