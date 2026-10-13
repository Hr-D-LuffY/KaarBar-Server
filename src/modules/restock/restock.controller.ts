import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { getShopContext } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as restockService from "./restock.service";
import type { CreateRestockInput, ListRestocksQuery } from "./restock.validation";

export const listRestocks = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const { restocks, meta } = await restockService.listRestocks(
    shopId,
    req.query as unknown as ListRestocksQuery,
  );
  sendSuccess(res, { message: "Restocks fetched successfully", data: { restocks }, meta });
});

export const getRestock = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const restock = await restockService.getRestock(shopId, String(req.params.id));
  sendSuccess(res, { message: "Restock fetched successfully", data: { restock } });
});

export const createRestock = catchAsync(async (req, res) => {
  const restock = await restockService.createRestock(
    getShopContext(req),
    req.body as CreateRestockInput,
  );
  sendSuccess(res, {
    statusCode: httpStatus.CREATED,
    message: "Restock recorded successfully",
    data: { restock },
  });
});
