import { z } from "zod";
import { dateRangeQuerySchema } from "../../utils/date-range";
import { paginationQuerySchema } from "../../utils/pagination";
import { sortQuerySchema } from "../../utils/sort";

const MAX_FILTER_LENGTH = 50;
const ACTIVITY_LOG_SORT_FIELDS = ["createdAt"] as const;

const filterSchema = z.string().trim().min(1).max(MAX_FILTER_LENGTH);

export const listActivityLogsSchema = z.object({
  query: z.object({
    ...paginationQuerySchema.shape,
    ...dateRangeQuerySchema.shape,
    ...sortQuerySchema(ACTIVITY_LOG_SORT_FIELDS, "createdAt", "desc").shape,
    action: filterSchema.optional(),
    entityType: filterSchema.optional(),
    userId: z.uuid("Invalid user id").optional(),
  }),
});

export type ListActivityLogsQuery = z.infer<typeof listActivityLogsSchema>["query"];
