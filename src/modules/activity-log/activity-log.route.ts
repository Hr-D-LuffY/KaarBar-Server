import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { shopContext } from "../../middleware/shopContext";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as activityLogController from "./activity-log.controller";
import { listActivityLogsSchema } from "./activity-log.validation";

const router = Router();

router.use(verifyToken, requireRole(Role.SUPER_ADMIN, Role.OWNER), shopContext);

router.get("/", validate(listActivityLogsSchema), activityLogController.listActivityLogs);

export const ActivityLogRoutes = router;
