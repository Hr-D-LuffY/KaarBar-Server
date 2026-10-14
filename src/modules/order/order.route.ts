import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { shopContext } from "../../middleware/shopContext";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as orderController from "./order.controller";
import {
  cancelOrderSchema,
  createOrderSchema,
  listOrdersSchema,
  orderIdSchema,
  orderInvoiceSchema,
} from "./order.validation";

const router = Router();

router.use(verifyToken);

router.get(
  "/",
  requireRole(Role.SUPER_ADMIN, Role.OWNER),
  shopContext,
  validate(listOrdersSchema),
  orderController.listOrders,
);

router.get(
  "/:id",
  requireRole(Role.SUPER_ADMIN, Role.OWNER),
  shopContext,
  validate(orderIdSchema),
  orderController.getOrder,
);

router.get(
  "/:id/invoice",
  requireRole(Role.SUPER_ADMIN, Role.OWNER),
  shopContext,
  validate(orderInvoiceSchema),
  orderController.getOrderInvoice,
);

router.post(
  "/",
  requireRole(Role.OWNER),
  shopContext,
  validate(createOrderSchema),
  orderController.createOrder,
);

router.post(
  "/:id/cancel",
  requireRole(Role.OWNER),
  shopContext,
  validate(cancelOrderSchema),
  orderController.cancelOrder,
);

export const OrderRoutes = router;
