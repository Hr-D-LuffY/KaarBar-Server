import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { shopContext } from "../../middleware/shopContext";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as inventoryController from "./inventory.controller";
import { listInventorySchema } from "./inventory.validation";

const router = Router();

router.use(verifyToken, requireRole(Role.OWNER), shopContext);

router.get("/", validate(listInventorySchema), inventoryController.listInventory);

export const InventoryRoutes = router;
