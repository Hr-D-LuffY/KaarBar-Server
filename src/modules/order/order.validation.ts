import { z } from "zod";
import { moneySchema, unitCostSchema, ZERO } from "../../utils/money";
import { itemQuantitySchema } from "../../utils/quantity";

const MAX_ITEMS_PER_ORDER = 100;
const MAX_CANCEL_REASON_LENGTH = 200;

const orderItemSchema = z.object({
  productId: z.uuid("Invalid product id"),
  quantity: itemQuantitySchema,
  unitPrice: unitCostSchema,
});

export const createOrderSchema = z.object({
  body: z
    .object({
      customerId: z.uuid("Invalid customer id").optional(),
      discount: moneySchema.default(ZERO),
      paid: moneySchema,
      items: z
        .array(orderItemSchema)
        .min(1, "Add at least one item")
        .max(MAX_ITEMS_PER_ORDER, `At most ${MAX_ITEMS_PER_ORDER} items per order`),
    })
    .superRefine((body, ctx) => {
      const productIds = body.items.map((item) => item.productId);
      if (new Set(productIds).size !== productIds.length) {
        ctx.addIssue({
          code: "custom",
          path: ["items"],
          message: "Each product can appear only once per order",
        });
      }
    }),
});

export const cancelOrderSchema = z.object({
  params: z.object({ id: z.uuid("Invalid order id") }),
  body: z.object({
    reason: z
      .string()
      .trim()
      .min(1, "Reason cannot be empty")
      .max(
        MAX_CANCEL_REASON_LENGTH,
        `Reason must be at most ${MAX_CANCEL_REASON_LENGTH} characters`,
      ),
  }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>["body"];
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>["body"];
