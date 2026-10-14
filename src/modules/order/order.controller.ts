import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { getShopContext } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as orderService from "./order.service";
import type { CreateOrderInput } from "./order.validation";

export const createOrder = catchAsync(async (req, res) => {
  const { order, warnings } = await orderService.createOrder(
    getShopContext(req),
    req.body as CreateOrderInput,
  );
  sendSuccess(res, {
    statusCode: httpStatus.CREATED,
    message: "Order created successfully",
    data: { order, warnings },
  });
});
