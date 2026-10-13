import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/sendResponse";
import * as companyService from "./company.service";
import type {
  CreateCompanyInput,
  ListCompaniesQuery,
  UpdateCompanyInput,
} from "./company.validation";

export const listCompanies = catchAsync(async (req, res) => {
  const { companies, meta } = await companyService.listCompanies(
    req.query as unknown as ListCompaniesQuery,
  );
  sendSuccess(res, { message: "Companies fetched successfully", data: { companies }, meta });
});

export const createCompany = catchAsync(async (req, res) => {
  const company = await companyService.createCompany(req.body as CreateCompanyInput);
  sendSuccess(res, {
    statusCode: httpStatus.CREATED,
    message: "Company created successfully",
    data: { company },
  });
});

export const updateCompany = catchAsync(async (req, res) => {
  const company = await companyService.updateCompany(
    String(req.params.id),
    req.body as UpdateCompanyInput,
  );
  sendSuccess(res, { message: "Company updated successfully", data: { company } });
});

export const deleteCompany = catchAsync(async (req, res) => {
  await companyService.deleteCompany(String(req.params.id));
  sendSuccess(res, { message: "Company deleted successfully" });
});
