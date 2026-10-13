import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as unitController from "./unit.controller";
import {
  createUnitSchema,
  deleteUnitSchema,
  listUnitsSchema,
  updateUnitSchema,
} from "./unit.validation";

const router = Router();

router.use(verifyToken, requireRole(Role.SUPER_ADMIN, Role.OWNER));

router.get("/", validate(listUnitsSchema), unitController.listUnits);
router.post("/", validate(createUnitSchema), unitController.createUnit);
router.patch(
  "/:id",
  requireRole(Role.SUPER_ADMIN),
  validate(updateUnitSchema),
  unitController.updateUnit,
);
router.delete(
  "/:id",
  requireRole(Role.SUPER_ADMIN),
  validate(deleteUnitSchema),
  unitController.deleteUnit,
);

export const UnitRoutes = router;
