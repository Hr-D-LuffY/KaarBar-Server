import { z } from "zod";
import { OrderStatus } from "../../generated/prisma/client";
import { dateRangeQuerySchema } from "../../utils/date-range";
import { moneySchema, unitCostSchema, ZERO } from "../../utils/money";
import { paginationQuerySchema } from "../../utils/pagination";
import { itemQuantitySchema } from "../../utils/quantity";
import { sortQuerySchema } from "../../utils/sort";

const MAX_ITEMS_PER_ORDER = 100;
const MAX_CANCEL_REASON_LENGTH = 200;
const ORDER_SORT_FIELDS = ["createdAt", "total"] as const;
// "INV-000124", "inv-124" and "124" all find invoice 124; capped so it fits the Int column
const INVOICE_SEARCH_PATTERN = /^(inv-)?\d{1,9}$/i;
const INVOICE_PREFIX_PATTERN = /^inv-/i;

const orderIdParamsSchema = z.object({ id: z.uuid("Invalid order id") });

const invoiceSearchSchema = z
  .string()
  .trim()
  .transform((search) => search || undefined)
  .pipe(
    z
      .string()
      .regex(INVOICE_SEARCH_PATTERN, "Search must be an invoice number like INV-000124")
      .transform((search) => Number(search.replace(INVOICE_PREFIX_PATTERN, "")))
      .optional(),
  )
  .optional();

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

export const listOrdersSchema = z.object({
  query: z.object({
    ...paginationQuerySchema.shape,
    ...dateRangeQuerySchema.shape,
    ...sortQuerySchema(ORDER_SORT_FIELDS, "createdAt").shape,
    status: z.enum(OrderStatus).optional(),
    customerId: z.uuid("Invalid customer id").optional(),
    search: invoiceSearchSchema,
  }),
});

export const orderIdSchema = z.object({ params: orderIdParamsSchema });

export const orderInvoiceSchema = z.object({
  params: orderIdParamsSchema,
  query: z.object({ download: z.stringbool().optional() }),
});

export const cancelOrderSchema = z.object({
  params: orderIdParamsSchema,
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
export type ListOrdersQuery = z.infer<typeof listOrdersSchema>["query"];
export type OrderInvoiceQuery = z.infer<typeof orderInvoiceSchema>["query"];
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>["body"];
