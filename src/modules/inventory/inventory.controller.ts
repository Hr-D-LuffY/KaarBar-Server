import { catchAsync } from "../../utils/catchAsync";
import { getShopContext } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as inventoryService from "./inventory.service";
import type { ListInventoryQuery } from "./inventory.validation";

export const listInventory = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const { products, summary, meta } = await inventoryService.listInventory(
    shopId,
    req.query as unknown as ListInventoryQuery,
  );
  sendSuccess(res, {
    message: "Inventory fetched successfully",
    data: { products, summary },
    meta,
  });
});
