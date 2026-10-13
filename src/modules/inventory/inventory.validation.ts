import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { searchQuerySchema } from "../../utils/search";
import { sortQuerySchema } from "../../utils/sort";

const INVENTORY_SORT_FIELDS = ["name", "stock", "updatedAt"] as const;

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
