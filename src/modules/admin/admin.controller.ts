import { catchAsync } from "../../utils/catchAsync";
import { getAuthUser } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as adminService from "./admin.service";
import type {
  ListAllActivityLogsQuery,
  ListShopsQuery,
  UpdateShopStatusInput,
} from "./admin.validation";

export const listShops = catchAsync(async (req, res) => {
  const { shops, meta } = await adminService.listShops(req.query as unknown as ListShopsQuery);
  sendSuccess(res, { message: "Shops fetched successfully", data: { shops }, meta });
});

export const updateShopStatus = catchAsync(async (req, res) => {
  const shop = await adminService.updateShopStatus(
    getAuthUser(req),
    String(req.params.id),
    req.body as UpdateShopStatusInput,
  );
  sendSuccess(res, {
    message: shop.isActive ? "Shop activated successfully" : "Shop suspended successfully",
    data: { shop },
  });
});

export const getStats = catchAsync(async (_req, res) => {
  const stats = await adminService.getStats();
  sendSuccess(res, { message: "Stats fetched successfully", data: { stats } });
});

export const listAllActivityLogs = catchAsync(async (req, res) => {
  const { logs, meta } = await adminService.listAllActivityLogs(
    req.query as unknown as ListAllActivityLogsQuery,
  );
  sendSuccess(res, { message: "Activity logs fetched successfully", data: { logs }, meta });
});
