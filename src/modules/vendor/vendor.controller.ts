import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { getShopContext } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as vendorService from "./vendor.service";
import type {
  CreateVendorInput,
  CreateVendorPaymentInput,
  ListVendorsQuery,
  UpdateVendorInput,
} from "./vendor.validation";

export const listVendors = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const { vendors, meta } = await vendorService.listVendors(
    shopId,
    req.query as unknown as ListVendorsQuery,
  );
  sendSuccess(res, { message: "Vendors fetched successfully", data: { vendors }, meta });
});

export const getVendor = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const vendor = await vendorService.getVendor(shopId, String(req.params.id));
  sendSuccess(res, { message: "Vendor fetched successfully", data: { vendor } });
});

export const createVendor = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const vendor = await vendorService.createVendor(shopId, req.body as CreateVendorInput);
  sendSuccess(res, {
    statusCode: httpStatus.CREATED,
    message: "Vendor created successfully",
    data: { vendor },
  });
});

export const updateVendor = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const vendor = await vendorService.updateVendor(
    shopId,
    String(req.params.id),
    req.body as UpdateVendorInput,
  );
  sendSuccess(res, { message: "Vendor updated successfully", data: { vendor } });
});

export const deleteVendor = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  await vendorService.deleteVendor(shopId, String(req.params.id));
  sendSuccess(res, { message: "Vendor deleted successfully" });
});

export const createVendorPayment = catchAsync(async (req, res) => {
  const payment = await vendorService.createVendorPayment(
    getShopContext(req),
    String(req.params.id),
    req.body as CreateVendorPaymentInput,
  );
  sendSuccess(res, {
    statusCode: httpStatus.CREATED,
    message: "Payment recorded successfully",
    data: { payment },
  });
});
