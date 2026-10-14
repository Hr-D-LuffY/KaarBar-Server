import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { shopContext } from "../../middleware/shopContext";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as customerController from "./customer.controller";
import {
  createCustomerPaymentSchema,
  createCustomerSchema,
  customerIdSchema,
  listCustomersSchema,
  updateCustomerSchema,
} from "./customer.validation";

const router = Router();

router.use(verifyToken, requireRole(Role.SUPER_ADMIN, Role.OWNER), shopContext);

router.get("/", validate(listCustomersSchema), customerController.listCustomers);
router.post("/", validate(createCustomerSchema), customerController.createCustomer);
router.get("/:id", validate(customerIdSchema), customerController.getCustomer);
router.patch("/:id", validate(updateCustomerSchema), customerController.updateCustomer);
router.delete("/:id", validate(customerIdSchema), customerController.deleteCustomer);
router.post(
  "/:id/payments",
  requireRole(Role.OWNER),
  validate(createCustomerPaymentSchema),
  customerController.createCustomerPayment,
);

export const CustomerRoutes = router;
