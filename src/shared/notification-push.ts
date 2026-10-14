import type { Notification } from "../generated/prisma/client";
import { publish } from "../lib/sse-hub";

const NOTIFICATION_EVENT = "notification";

// The one shape a notification has in the list endpoint and on the stream
export const toNotificationView = ({
  id,
  productId,
  type,
  title,
  readAt,
  createdAt,
}: Pick<Notification, "id" | "productId" | "type" | "title" | "readAt" | "createdAt">) => ({
  id,
  productId,
  type,
  title,
  readAt,
  createdAt,
  isRead: readAt !== null,
});

// Takes notifications created inside a transaction; call it only after that transaction commits
export const pushNotifications = (shopId: string, notifications: Notification[]) => {
  for (const notification of notifications) {
    publish(shopId, NOTIFICATION_EVENT, toNotificationView(notification));
  }
};
