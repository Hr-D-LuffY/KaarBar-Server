import { z } from "zod";
import { dateRangeQuerySchema } from "../../utils/date-range";
import { paginationQuerySchema } from "../../utils/pagination";
import { searchQuerySchema } from "../../utils/search";
import { sortQuerySchema } from "../../utils/sort";

const MAX_FILTER_LENGTH = 50;
const SHOP_SORT_FIELDS = ["shopName", "createdAt"] as const;
const ACTIVITY_LOG_SORT_FIELDS = ["createdAt"] as const;

export const listShopsSchema = z.object({
  query: z.object({
    ...paginationQuerySchema.shape,
    ...searchQuerySchema.shape,
    ...sortQuerySchema(SHOP_SORT_FIELDS, "createdAt", "desc").shape,
    isActive: z.stringbool().optional(),
  }),
});

export const updateShopStatusSchema = z.object({
  params: z.object({ id: z.uuid("Invalid shop id") }),
  body: z.object({ isActive: z.boolean("isActive must be true or false") }),
});

export const listAllActivityLogsSchema = z.object({
  query: z.object({
    ...paginationQuerySchema.shape,
    ...dateRangeQuerySchema.shape,
    ...sortQuerySchema(ACTIVITY_LOG_SORT_FIELDS, "createdAt", "desc").shape,
    shopId: z.uuid("Invalid shop id").optional(),
    action: z.string().trim().min(1).max(MAX_FILTER_LENGTH).optional(),
  }),
});

export type ListShopsQuery = z.infer<typeof listShopsSchema>["query"];
export type UpdateShopStatusInput = z.infer<typeof updateShopStatusSchema>["body"];
export type ListAllActivityLogsQuery = z.infer<typeof listAllActivityLogsSchema>["query"];
