import { z } from "zod";
import { dateRangeQuerySchema } from "../../utils/date-range";
import { MAX_LIMIT } from "../../utils/pagination";

const DEFAULT_TOP_PRODUCTS_LIMIT = 10;
const SALES_GROUP_BY = ["day", "month"] as const;
const TOP_PRODUCTS_BY = ["quantity", "revenue"] as const;

export const reportRangeSchema = z.object({ query: z.object(dateRangeQuerySchema.shape) });

export const salesReportSchema = z.object({
  query: z.object({
    ...dateRangeQuerySchema.shape,
    groupBy: z.enum(SALES_GROUP_BY).default("day"),
  }),
});

export const topProductsReportSchema = z.object({
  query: z.object({
    ...dateRangeQuerySchema.shape,
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .default(DEFAULT_TOP_PRODUCTS_LIMIT)
      .transform((limit) => Math.min(limit, MAX_LIMIT)),
    by: z.enum(TOP_PRODUCTS_BY).default("quantity"),
  }),
});

export type ReportRangeQuery = z.infer<typeof reportRangeSchema>["query"];
export type SalesReportQuery = z.infer<typeof salesReportSchema>["query"];
export type TopProductsReportQuery = z.infer<typeof topProductsReportSchema>["query"];
