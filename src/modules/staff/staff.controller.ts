import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { getShopContext } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as staffService from "./staff.service";
import type {
  CreateSalaryPaymentInput,
  CreateStaffInput,
  ListStaffQuery,
  StaffLedgerQuery,
  UpdateStaffInput,
} from "./staff.validation";

export const listStaff = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const { staff, meta } = await staffService.listStaff(
    shopId,
    req.query as unknown as ListStaffQuery,
  );
  sendSuccess(res, { message: "Staff fetched successfully", data: { staff }, meta });
});

export const getStaff = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const staff = await staffService.getStaff(shopId, String(req.params.id));
  sendSuccess(res, { message: "Staff member fetched successfully", data: { staff } });
});

export const createStaff = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const staff = await staffService.createStaff(shopId, req.body as CreateStaffInput);
  sendSuccess(res, {
    statusCode: httpStatus.CREATED,
    message: "Staff member created successfully",
    data: { staff },
  });
});

export const updateStaff = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const staff = await staffService.updateStaff(
    shopId,
    String(req.params.id),
    req.body as UpdateStaffInput,
  );
  sendSuccess(res, { message: "Staff member updated successfully", data: { staff } });
});

export const deleteStaff = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  await staffService.deleteStaff(shopId, String(req.params.id));
  sendSuccess(res, { message: "Staff member deleted successfully" });
});

export const createSalaryPayment = catchAsync(async (req, res) => {
  const payment = await staffService.createSalaryPayment(
    getShopContext(req),
    String(req.params.id),
    req.body as CreateSalaryPaymentInput,
  );
  sendSuccess(res, {
    statusCode: httpStatus.CREATED,
    message: "Salary payment recorded successfully",
    data: { payment },
  });
});

export const getStaffLedger = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const { staff, entries, meta } = await staffService.getStaffLedger(
    shopId,
    String(req.params.id),
    req.query as unknown as StaffLedgerQuery,
  );
  sendSuccess(res, {
    message: "Staff ledger fetched successfully",
    data: { staff, entries },
    meta,
  });
});
