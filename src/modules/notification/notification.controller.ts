import { openStream } from "../../lib/sse-hub";
import { catchAsync } from "../../utils/catchAsync";
import { getShopContext } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as notificationService from "./notification.service";
import type { ListNotificationsQuery } from "./notification.validation";

export const listNotifications = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const { notifications, meta } = await notificationService.listNotifications(
    shopId,
    req.query as unknown as ListNotificationsQuery,
  );
  sendSuccess(res, {
    message: "Notifications fetched successfully",
    data: { notifications },
    meta,
  });
});

// Streams events, so it bypasses the JSON envelope helpers
export const streamNotifications = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  openStream(shopId, req, res);
});

export const getUnreadCount = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const unreadCount = await notificationService.getUnreadCount(shopId);
  sendSuccess(res, { message: "Unread count fetched successfully", data: { unreadCount } });
});

export const markNotificationRead = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const notification = await notificationService.markNotificationRead(
    shopId,
    String(req.params.id),
  );
  sendSuccess(res, { message: "Notification marked as read", data: { notification } });
});

export const markAllNotificationsRead = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const updated = await notificationService.markAllNotificationsRead(shopId);
  sendSuccess(res, { message: "All notifications marked as read", data: { updated } });
});
