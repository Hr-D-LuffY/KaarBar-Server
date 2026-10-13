import { z } from "zod";
import { dateRangeQuerySchema } from "../../utils/date-range";
import { moneySchema, unitCostSchema, ZERO } from "../../utils/money";
import { paginationQuerySchema } from "../../utils/pagination";
import { sortQuerySchema } from "../../utils/sort";

const MAX_ITEMS_PER_RESTOCK = 100;
// Stock is stored in an Int column, so one line stays well below its limit
const MAX_ITEM_QUANTITY = 1_000_000_000;
const MAX_NOTE_LENGTH = 200;
const RESTOCK_SORT_FIELDS = ["createdAt", "total"] as const;

const restockItemSchema = z.object({
  productId: z.uuid("Invalid product id"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(MAX_ITEM_QUANTITY, "Quantity is too large"),
  buyPrice: unitCostSchema,
});

export const createRestockSchema = z.object({
  body: z
    .object({
      vendorId: z.uuid("Invalid vendor id").optional(),
      isOpeningStock: z.boolean().default(false),
      transportCost: moneySchema.default(ZERO),
      paid: moneySchema.default(ZERO),
      note: z
        .string()
        .trim()
        .min(1, "Note cannot be empty")
        .max(MAX_NOTE_LENGTH, `Note must be at most ${MAX_NOTE_LENGTH} characters`)
        .optional(),
      items: z
        .array(restockItemSchema)
        .min(1, "Add at least one item")
        .max(MAX_ITEMS_PER_RESTOCK, `At most ${MAX_ITEMS_PER_RESTOCK} items per restock`),
    })
    .superRefine((body, ctx) => {
      if (Boolean(body.vendorId) === body.isOpeningStock) {
        ctx.addIssue({
          code: "custom",
          path: ["vendorId"],
          message: "Provide either a vendorId or isOpeningStock: true",
        });
      }
      if (body.isOpeningStock && body.paid.gt(ZERO)) {
        ctx.addIssue({
          code: "custom",
          path: ["paid"],
          message: "Opening stock has no payment",
        });
      }
      const productIds = body.items.map((item) => item.productId);
      if (new Set(productIds).size !== productIds.length) {
        ctx.addIssue({
          code: "custom",
          path: ["items"],
          message: "Each product can appear only once per restock",
        });
      }
    }),
});

export const listRestocksSchema = z.object({
  query: z.object({
    ...paginationQuerySchema.shape,
    ...dateRangeQuerySchema.shape,
    ...sortQuerySchema(RESTOCK_SORT_FIELDS, "createdAt").shape,
    vendorId: z.uuid("Invalid vendor id").optional(),
    isOpeningStock: z.stringbool().optional(),
  }),
});

export const restockIdSchema = z.object({ params: z.object({ id: z.uuid("Invalid restock id") }) });

export type CreateRestockInput = z.infer<typeof createRestockSchema>["body"];
export type ListRestocksQuery = z.infer<typeof listRestocksSchema>["query"];
