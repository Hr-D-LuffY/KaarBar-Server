import { catchAsync } from "../../utils/catchAsync";
import { getShopContext } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as reportService from "./report.service";
import type {
  ReportRangeQuery,
  SalesReportQuery,
  TopProductsReportQuery,
} from "./report.validation";

export const getDashboard = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const dashboard = await reportService.getDashboard(shopId);
  sendSuccess(res, { message: "Dashboard fetched successfully", data: { dashboard } });
});

export const getSalesReport = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const report = await reportService.getSalesReport(
    shopId,
    req.query as unknown as SalesReportQuery,
  );
  sendSuccess(res, { message: "Sales report fetched successfully", data: { report } });
});

export const getProfitReport = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const report = await reportService.getProfitReport(
    shopId,
    req.query as unknown as ReportRangeQuery,
  );
  sendSuccess(res, { message: "Profit report fetched successfully", data: { report } });
});

export const getTopProducts = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const report = await reportService.getTopProducts(
    shopId,
    req.query as unknown as TopProductsReportQuery,
  );
  sendSuccess(res, { message: "Top products fetched successfully", data: { report } });
});

export const getDuesReport = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const report = await reportService.getDuesReport(shopId);
  sendSuccess(res, { message: "Dues report fetched successfully", data: { report } });
});
