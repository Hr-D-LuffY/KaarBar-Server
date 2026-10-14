import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { shopContext } from "../../middleware/shopContext";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as orderController from "./order.controller";
import { cancelOrderSchema, createOrderSchema } from "./order.validation";

const router = Router();

router.use(verifyToken);

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
