import { Router } from "express";
import { Role } from "../../generated/prisma/client";
import { requireRole } from "../../middleware/requireRole";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as companyController from "./company.controller";
import {
  createCompanySchema,
  deleteCompanySchema,
  listCompaniesSchema,
  updateCompanySchema,
} from "./company.validation";

const router = Router();

router.use(verifyToken, requireRole(Role.SUPER_ADMIN, Role.OWNER));

router.get("/", validate(listCompaniesSchema), companyController.listCompanies);
router.post("/", validate(createCompanySchema), companyController.createCompany);
router.patch(
  "/:id",
  requireRole(Role.SUPER_ADMIN),
  validate(updateCompanySchema),
  companyController.updateCompany,
);
router.delete(
  "/:id",
  requireRole(Role.SUPER_ADMIN),
  validate(deleteCompanySchema),
  companyController.deleteCompany,
);

export const CompanyRoutes = router;
