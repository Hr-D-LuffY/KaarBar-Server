import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { getShopContext } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as customerService from "./customer.service";
import type {
  CreateCustomerInput,
  CreateCustomerPaymentInput,
  ListCustomerLedgerQuery,
  ListCustomersQuery,
  UpdateCustomerInput,
} from "./customer.validation";

export const listCustomers = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const { customers, meta } = await customerService.listCustomers(
    shopId,
    req.query as unknown as ListCustomersQuery,
  );
  sendSuccess(res, { message: "Customers fetched successfully", data: { customers }, meta });
});

export const getCustomer = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const customer = await customerService.getCustomer(shopId, String(req.params.id));
  sendSuccess(res, { message: "Customer fetched successfully", data: { customer } });
});

export const createCustomer = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const customer = await customerService.createCustomer(shopId, req.body as CreateCustomerInput);
  sendSuccess(res, {
    statusCode: httpStatus.CREATED,
    message: "Customer created successfully",
    data: { customer },
  });
});

export const updateCustomer = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const customer = await customerService.updateCustomer(
    shopId,
    String(req.params.id),
    req.body as UpdateCustomerInput,
  );
  sendSuccess(res, { message: "Customer updated successfully", data: { customer } });
});

export const deleteCustomer = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  await customerService.deleteCustomer(shopId, String(req.params.id));
  sendSuccess(res, { message: "Customer deleted successfully" });
});

export const createCustomerPayment = catchAsync(async (req, res) => {
  const payment = await customerService.createCustomerPayment(
    getShopContext(req),
    String(req.params.id),
    req.body as CreateCustomerPaymentInput,
  );
  sendSuccess(res, {
    statusCode: httpStatus.CREATED,
    message: "Payment recorded successfully",
    data: { payment },
  });
});

export const getCustomerLedger = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const { customer, entries, meta } = await customerService.getCustomerLedger(
    shopId,
    String(req.params.id),
    req.query as unknown as ListCustomerLedgerQuery,
  );
  sendSuccess(res, {
    message: "Customer ledger fetched successfully",
    data: { customer, entries },
    meta,
  });
});
