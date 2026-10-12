import { catchAsync } from "../../utils/catchAsync";
import { getShopContext } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as shopService from "./shop.service";
import type { UpdateShopInput } from "./shop.validation";

export const getShop = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const shop = await shopService.getShop(shopId);
  sendSuccess(res, { message: "Shop fetched successfully", data: { shop } });
});

export const updateShop = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const shop = await shopService.updateShop(shopId, req.body as UpdateShopInput);
  sendSuccess(res, { message: "Shop updated successfully", data: { shop } });
});
