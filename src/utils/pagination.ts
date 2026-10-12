import { z } from "zod";
import type { PaginationMeta } from "./sendResponse";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(DEFAULT_PAGE).default(DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .default(DEFAULT_LIMIT)
    .transform((limit) => Math.min(limit, MAX_LIMIT)),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const getPagination = ({ page, limit }: PaginationQuery) => ({
  skip: (page - 1) * limit,
  take: limit,
});

export const buildPaginationMeta = ({
  page,
  limit,
  total,
}: PaginationQuery & { total: number }): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
