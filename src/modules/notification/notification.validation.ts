import { z } from "zod";
import { NotificationType } from "../../generated/prisma/client";
import { paginationQuerySchema } from "../../utils/pagination";
import { sortQuerySchema } from "../../utils/sort";

const NOTIFICATION_SORT_FIELDS = ["createdAt"] as const;

export const listNotificationsSchema = z.object({
  query: z.object({
    ...paginationQuerySchema.shape,
    ...sortQuerySchema(NOTIFICATION_SORT_FIELDS, "createdAt", "desc").shape,
    isRead: z.stringbool().optional(),
    type: z.enum(NotificationType).optional(),
  }),
});

export const notificationIdSchema = z.object({
  params: z.object({ id: z.uuid("Invalid notification id") }),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>["query"];
