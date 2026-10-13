import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as productTypeController from "./product-type.controller";
import {
  createProductTypeSchema,
  deleteProductTypeSchema,
  listProductTypesSchema,
  updateProductTypeSchema,
} from "./product-type.validation";

const router = Router();

router.use(verifyToken, requireRole(Role.SUPER_ADMIN, Role.OWNER));

router.get("/", validate(listProductTypesSchema), productTypeController.listProductTypes);
router.post("/", validate(createProductTypeSchema), productTypeController.createProductType);
router.patch(
  "/:id",
  requireRole(Role.SUPER_ADMIN),
  validate(updateProductTypeSchema),
  productTypeController.updateProductType,
);
router.delete(
  "/:id",
  requireRole(Role.SUPER_ADMIN),
  validate(deleteProductTypeSchema),
  productTypeController.deleteProductType,
);

export const ProductTypeRoutes = router;
