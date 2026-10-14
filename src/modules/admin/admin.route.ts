import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as adminController from "./admin.controller";
import {
  listAllActivityLogsSchema,
  listShopsSchema,
  updateShopStatusSchema,
} from "./admin.validation";

const router = Router();

// Platform-wide, so no shopContext and no X-Shop-Id
router.use(verifyToken, requireRole(Role.SUPER_ADMIN));

router.get("/shops", validate(listShopsSchema), adminController.listShops);
router.patch(
  "/shops/:id/status",
  validate(updateShopStatusSchema),
  adminController.updateShopStatus,
);
router.get("/stats", adminController.getStats);
router.get(
  "/activity-logs",
  validate(listAllActivityLogsSchema),
  adminController.listAllActivityLogs,
);

export const AdminRoutes = router;
