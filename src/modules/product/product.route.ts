import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { shopContext } from "../../middleware/shopContext";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as productController from "./product.controller";
import {
  createProductSchema,
  listCatalogSchema,
  listProductsSchema,
  productIdSchema,
  productOptionsSchema,
  updateLowStockLevelSchema,
  updateProductSchema,
} from "./product.validation";

const router = Router();

router.use(verifyToken, requireRole(Role.SUPER_ADMIN, Role.OWNER));

// Fixed paths come before "/:id" so they are not read as a product id
router.get("/catalog", shopContext, validate(listCatalogSchema), productController.listCatalog);
router.get(
  "/options",
  shopContext,
  validate(productOptionsSchema),
  productController.getProductOptions,
);
router.get("/", shopContext, validate(listProductsSchema), productController.listProducts);
router.post("/", shopContext, validate(createProductSchema), productController.createProduct);
router.get("/:id", shopContext, validate(productIdSchema), productController.getProduct);
router.post("/:id/add", shopContext, validate(productIdSchema), productController.addProductToShop);
router.patch(
  "/:id/low-stock-level",
  shopContext,
  validate(updateLowStockLevelSchema),
  productController.updateLowStockLevel,
);
// Shared catalog fields belong to no shop, so Super Admin needs no X-Shop-Id here
router.patch(
  "/:id",
  requireRole(Role.SUPER_ADMIN),
  validate(updateProductSchema),
  productController.updateProduct,
);
router.delete(
  "/:id",
  shopContext,
  validate(productIdSchema),
  productController.removeProductFromShop,
);

export const ProductRoutes = router;
