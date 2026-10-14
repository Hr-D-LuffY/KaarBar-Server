import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { shopContext } from "../../middleware/shopContext";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as inventoryController from "./inventory.controller";
import {
  createStockAdjustmentSchema,
  listInventorySchema,
  stockMovementsSchema,
} from "./inventory.validation";

const router = Router();

router.use(verifyToken, requireRole(Role.OWNER), shopContext);

router.get("/", validate(listInventorySchema), inventoryController.listInventory);
router.post(
  "/adjustments",
  validate(createStockAdjustmentSchema),
  inventoryController.createStockAdjustment,
);
router.get(
  "/:productId/movements",
  validate(stockMovementsSchema),
  inventoryController.getStockMovements,
);

export const InventoryRoutes = router;
