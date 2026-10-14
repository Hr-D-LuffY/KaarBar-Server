import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { getShopContext } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as orderService from "./order.service";
import type {
  CancelOrderInput,
  CreateOrderInput,
  ListOrdersQuery,
  OrderInvoiceQuery,
} from "./order.validation";

export const listOrders = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const { orders, meta } = await orderService.listOrders(
    shopId,
    req.query as unknown as ListOrdersQuery,
  );
  sendSuccess(res, { message: "Orders fetched successfully", data: { orders }, meta });
});

export const getOrder = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const order = await orderService.getOrder(shopId, String(req.params.id));
  sendSuccess(res, { message: "Order fetched successfully", data: { order } });
});

export const getOrderInvoice = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const { download } = req.query as unknown as OrderInvoiceQuery;
  const { fileName, pdf } = await orderService.getOrderInvoice(shopId, String(req.params.id));

  res.type("application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename="${fileName}"`,
  );
  res.send(pdf);
});

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

export const cancelOrder = catchAsync(async (req, res) => {
  const order = await orderService.cancelOrder(
    getShopContext(req),
    String(req.params.id),
    req.body as CancelOrderInput,
  );
  sendSuccess(res, { message: "Order cancelled successfully", data: { order } });
});
