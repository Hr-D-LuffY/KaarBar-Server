import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { shopContext } from "../../middleware/shopContext";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as reportController from "./report.controller";
import { reportRangeSchema, salesReportSchema, topProductsReportSchema } from "./report.validation";

const router = Router();

router.use(verifyToken, requireRole(Role.SUPER_ADMIN, Role.OWNER), shopContext);

router.get("/dashboard", reportController.getDashboard);
router.get("/sales", validate(salesReportSchema), reportController.getSalesReport);
router.get("/profit", validate(reportRangeSchema), reportController.getProfitReport);
router.get("/top-products", validate(topProductsReportSchema), reportController.getTopProducts);
router.get("/dues", reportController.getDuesReport);

export const ReportRoutes = router;
