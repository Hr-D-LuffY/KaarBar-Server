import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { shopContext } from "../../middleware/shopContext";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as shopController from "./shop.controller";
import { updateShopSchema } from "./shop.validation";

const router = Router();

router.use(verifyToken, shopContext, requireRole(Role.SUPER_ADMIN, Role.OWNER));

router.get("/", shopController.getShop);
router.patch("/", validate(updateShopSchema), shopController.updateShop);

export const ShopRoutes = router;
