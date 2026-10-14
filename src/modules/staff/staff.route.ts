import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { shopContext } from "../../middleware/shopContext";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as staffController from "./staff.controller";
import {
  createSalaryPaymentSchema,
  createStaffSchema,
  listStaffSchema,
  staffIdSchema,
  staffLedgerSchema,
  updateStaffSchema,
} from "./staff.validation";

const router = Router();

router.use(verifyToken, requireRole(Role.SUPER_ADMIN, Role.OWNER), shopContext);

router.get("/", validate(listStaffSchema), staffController.listStaff);
router.post("/", validate(createStaffSchema), staffController.createStaff);
router.get("/:id", validate(staffIdSchema), staffController.getStaff);
router.get("/:id/ledger", validate(staffLedgerSchema), staffController.getStaffLedger);
router.patch("/:id", validate(updateStaffSchema), staffController.updateStaff);
router.delete("/:id", validate(staffIdSchema), staffController.deleteStaff);
router.post(
  "/:id/salary-payments",
  requireRole(Role.OWNER),
  validate(createSalaryPaymentSchema),
  staffController.createSalaryPayment,
);

export const StaffRoutes = router;
