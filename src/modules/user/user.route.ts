import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as userController from "./user.controller";
import { updateMeSchema } from "./user.validation";

const router = Router();

router.patch(
  "/me",
  verifyToken,
  requireRole(Role.SUPER_ADMIN, Role.OWNER),
  validate(updateMeSchema),
  userController.updateMe,
);

export const UserRoutes = router;
