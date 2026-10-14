import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { shopContext } from "../../middleware/shopContext";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as notificationController from "./notification.controller";
import { listNotificationsSchema, notificationIdSchema } from "./notification.validation";

const router = Router();

router.use(verifyToken, requireRole(Role.OWNER), shopContext);

router.get("/", validate(listNotificationsSchema), notificationController.listNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/read-all", notificationController.markAllNotificationsRead);
router.patch(
  "/:id/read",
  validate(notificationIdSchema),
  notificationController.markNotificationRead,
);

export const NotificationRoutes = router;
