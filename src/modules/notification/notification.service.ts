import httpStatus from "http-status";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { toNotificationView } from "../../shared/notification-push";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, getPagination } from "../../utils/pagination";
import { buildOrderBy } from "../../utils/sort";
import type { ListNotificationsQuery } from "./notification.validation";

const notificationSelect = {
  id: true,
  productId: true,
  type: true,
  title: true,
  readAt: true,
  createdAt: true,
} as const;

export const listNotifications = async (
  shopId: string,
  { isRead, type, sortBy, sortOrder, ...pagination }: ListNotificationsQuery,
) => {
  const where: Prisma.NotificationWhereInput = {
    shopId,
    ...(type && { type }),
    ...(isRead !== undefined && { readAt: isRead ? { not: null } : null }),
  };

  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
      select: notificationSelect,
      ...getPagination(pagination),
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications: notifications.map(toNotificationView),
    meta: buildPaginationMeta({ ...pagination, total }),
  };
};

export const getUnreadCount = (shopId: string) =>
  prisma.notification.count({ where: { shopId, readAt: null } });

// Only unread rows are touched, so marking twice keeps the original readAt
export const markNotificationRead = async (shopId: string, id: string) => {
  await prisma.notification.updateMany({
    where: { id, shopId, readAt: null },
    data: { readAt: new Date() },
  });

  const notification = await prisma.notification.findFirst({
    where: { id, shopId },
    select: notificationSelect,
  });
  if (!notification) throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
  return toNotificationView(notification);
};

export const markAllNotificationsRead = async (shopId: string) => {
  const { count } = await prisma.notification.updateMany({
    where: { shopId, readAt: null },
    data: { readAt: new Date() },
  });
  return count;
};
