import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { verifyToken } from "../../middleware/verifyToken";
import * as categoryController from "./category.controller";

const router = Router();

router.use(verifyToken, requireRole(Role.SUPER_ADMIN, Role.OWNER));

router.get("/", categoryController.listCategories);

export const CategoryRoutes = router;
