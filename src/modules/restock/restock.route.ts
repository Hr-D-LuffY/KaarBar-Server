import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { shopContext } from "../../middleware/shopContext";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as restockController from "./restock.controller";
import { createRestockSchema, listRestocksSchema, restockIdSchema } from "./restock.validation";

const router = Router();

router.use(verifyToken, requireRole(Role.OWNER), shopContext);

router.get("/", validate(listRestocksSchema), restockController.listRestocks);
router.post("/", validate(createRestockSchema), restockController.createRestock);
router.get("/:id", validate(restockIdSchema), restockController.getRestock);

export const RestockRoutes = router;
