import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { getShopContext } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as inventoryService from "./inventory.service";
import type {
  CreateStockAdjustmentInput,
  ListInventoryQuery,
  ListStockMovementsQuery,
} from "./inventory.validation";

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

export const createStockAdjustment = catchAsync(async (req, res) => {
  const adjustment = await inventoryService.createStockAdjustment(
    getShopContext(req),
    req.body as CreateStockAdjustmentInput,
  );
  sendSuccess(res, {
    statusCode: httpStatus.CREATED,
    message: "Stock adjusted successfully",
    data: { adjustment },
  });
});

export const getStockMovements = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const { product, movements, meta } = await inventoryService.getStockMovements(
    shopId,
    String(req.params.productId),
    req.query as unknown as ListStockMovementsQuery,
  );
  sendSuccess(res, {
    message: "Stock movements fetched successfully",
    data: { product, movements },
    meta,
  });
});
