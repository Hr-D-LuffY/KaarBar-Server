import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { shopContext } from "../../middleware/shopContext";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as vendorController from "./vendor.controller";
import {
  createVendorPaymentSchema,
  createVendorSchema,
  listVendorsSchema,
  updateVendorSchema,
  vendorIdSchema,
  vendorLedgerSchema,
} from "./vendor.validation";

const router = Router();

router.use(verifyToken, requireRole(Role.OWNER), shopContext);

router.get("/", validate(listVendorsSchema), vendorController.listVendors);
router.post("/", validate(createVendorSchema), vendorController.createVendor);
router.get("/:id", validate(vendorIdSchema), vendorController.getVendor);
router.get("/:id/ledger", validate(vendorLedgerSchema), vendorController.getVendorLedger);
router.patch("/:id", validate(updateVendorSchema), vendorController.updateVendor);
router.delete("/:id", validate(vendorIdSchema), vendorController.deleteVendor);
router.post(
  "/:id/payments",
  validate(createVendorPaymentSchema),
  vendorController.createVendorPayment,
);

export const VendorRoutes = router;
