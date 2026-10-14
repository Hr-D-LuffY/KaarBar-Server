import httpStatus from "http-status";
import { OrderStatus, type Prisma } from "../../generated/prisma/client";
import { buildInvoicePdf } from "../../lib/invoice-pdf";
import { prisma } from "../../lib/prisma";
import { ActivityAction, ActivityEntity, logActivity } from "../../shared/activity-log.service";
import { addDue, cancelDue } from "../../shared/due.service";
import { deductStock, restoreStock } from "../../shared/stock.service";
import { AppError } from "../../utils/AppError";
import { buildDateRange } from "../../utils/date-range";
import {
  formatMoney,
  formatUnitCost,
  MAX_MONEY,
  MONEY_DECIMAL_PLACES,
  splitProportionally,
  sumMoney,
  ZERO,
} from "../../utils/money";
import { buildPaginationMeta, getPagination } from "../../utils/pagination";
import { formatInvoiceNo } from "../../utils/invoice-no";
import { formatQuantity, formatRatePerUnit } from "../../utils/quantity";
import type { ShopContext } from "../../utils/request-context";
import { buildOrderBy } from "../../utils/sort";
import type { CancelOrderInput, CreateOrderInput, ListOrdersQuery } from "./order.validation";

const orderListSelect = {
  id: true,
  invoiceNo: true,
  customerId: true,
  customer: { select: { id: true, name: true, phone: true } },
  discount: true,
  total: true,
  paid: true,
  status: true,
  cancelReason: true,
  createdAt: true,
} as const;

const orderSelect = {
  ...orderListSelect,
  items: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      productId: true,
      product: {
        select: {
          name: true,
          packName: true,
          packSize: true,
          unit: { select: { name: true, symbol: true, decimalPlaces: true } },
        },
      },
      quantity: true,
      unitPrice: true,
      unitCost: true,
      lineTotal: true,
    },
  },
} satisfies Prisma.OrderSelect;

type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;
type OrderListRow = Prisma.OrderGetPayload<{ select: typeof orderListSelect }>;

const orderNotFound = () => new AppError(httpStatus.NOT_FOUND, "Order not found");

const validationError = (field: string, message: string) =>
  new AppError(httpStatus.BAD_REQUEST, "Validation failed", [{ field, message }]);

const toOrderListView = ({ invoiceNo, discount, total, paid, ...order }: OrderListRow) => ({
  ...order,
  invoiceNo,
  invoiceNumber: formatInvoiceNo(invoiceNo),
  subtotal: formatMoney(total.plus(discount)),
  discount: formatMoney(discount),
  total: formatMoney(total),
  paid: formatMoney(paid),
  remaining: formatMoney(total.minus(paid)),
});

const toOrderView = ({ items, ...order }: OrderRow) => ({
  ...toOrderListView(order),
  items: items.map(({ unitPrice, unitCost, lineTotal, ...item }) => ({
    ...item,
    unitPrice: formatUnitCost(unitPrice),
    unitCost: formatUnitCost(unitCost),
    lineTotal: formatMoney(lineTotal),
  })),
});

const findBelowCostWarnings = ({ items }: OrderRow) =>
  items
    .filter((item) => item.unitPrice.lt(item.unitCost))
    .map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      unitPrice: formatUnitCost(item.unitPrice),
      unitCost: formatUnitCost(item.unitCost),
      message: `${item.product.name} is priced below its cost`,
    }));

// Line totals are rounded to money precision; the rounding remainder goes to the last line
const computeOrderTotals = (items: CreateOrderInput["items"], discount: Prisma.Decimal) => {
  const exactLines = items.map(({ quantity, unitPrice }) => unitPrice.mul(quantity));
  const subtotal = sumMoney(exactLines).toDecimalPlaces(MONEY_DECIMAL_PLACES);
  return {
    lineTotals: splitProportionally(subtotal, exactLines),
    subtotal,
    total: subtotal.minus(discount),
  };
};

const assertCustomerInShop = async (tx: Prisma.TransactionClient, shopId: string, id: string) => {
  const customer = await tx.customer.findFirst({
    where: { id, shopId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) throw new AppError(httpStatus.NOT_FOUND, "Customer not found");
};

const findOrder = async (shopId: string, id: string) => {
  const order = await prisma.order.findFirst({ where: { id, shopId }, select: orderSelect });
  if (!order) throw orderNotFound();
  return order;
};

export const listOrders = async (
  shopId: string,
  { status, customerId, search, from, to, sortBy, sortOrder, ...pagination }: ListOrdersQuery,
) => {
  const createdAt = buildDateRange({ from, to });
  const where: Prisma.OrderWhereInput = {
    shopId,
    ...(status && { status }),
    ...(customerId && { customerId }),
    ...(search !== undefined && { invoiceNo: search }),
    ...(Object.keys(createdAt).length > 0 && { createdAt }),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
      select: { ...orderListSelect, _count: { select: { items: true } } },
      ...getPagination(pagination),
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: rows.map(({ _count, ...order }) => ({
      ...toOrderListView(order),
      itemCount: _count.items,
    })),
    meta: buildPaginationMeta({ ...pagination, total }),
  };
};

export const getOrder = async (shopId: string, id: string) =>
  toOrderView(await findOrder(shopId, id));

// The PDF is built from the saved order on every request and never stored
export const getOrderInvoice = async (shopId: string, id: string) => {
  const [order, shop] = await Promise.all([
    findOrder(shopId, id),
    prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
      select: { shopName: true, phone: true, address: true },
    }),
  ]);

  const view = toOrderView(order);
  const pdf = await buildInvoicePdf({
    shop: { name: shop.shopName, phone: shop.phone, address: shop.address },
    invoiceNumber: view.invoiceNumber,
    issuedAt: order.createdAt,
    customer: order.customer && { name: order.customer.name, phone: order.customer.phone },
    lines: order.items.map(({ product, quantity, unitPrice, lineTotal }) => ({
      name: product.name,
      quantity: `${formatQuantity(quantity, product.unit.decimalPlaces)} ${product.unit.symbol}`,
      rate: formatRatePerUnit(unitPrice, product.unit.decimalPlaces),
      amount: formatMoney(lineTotal),
    })),
    subtotal: view.subtotal,
    discount: view.discount,
    total: view.total,
    paid: view.paid,
    remaining: view.remaining,
    isCancelled: order.status === OrderStatus.CANCELLED,
    cancelReason: order.cancelReason,
  });

  return {
    fileName: `${view.invoiceNumber}.pdf`,
    invoiceNumber: view.invoiceNumber,
    shopName: shop.shopName,
    pdf,
  };
};

export const getInvoiceRecipient = async (shopId: string, id: string) => {
  const order = await prisma.order.findFirst({
    where: { id, shopId },
    select: { customer: { select: { name: true, email: true } } },
  });
  if (!order) throw orderNotFound();

  const { customer } = order;
  if (!customer?.email) {
    throw new AppError(httpStatus.BAD_REQUEST, "This order's customer has no email address saved");
  }
  return { name: customer.name, email: customer.email };
};

export const createOrder = async (
  { shopId, userId }: ShopContext,
  { customerId, discount, paid, items }: CreateOrderInput,
) => {
  const { lineTotals, subtotal, total } = computeOrderTotals(items, discount);
  if (subtotal.gt(MAX_MONEY)) throw validationError("items", "Order total is too large");
  if (discount.gt(subtotal)) {
    throw validationError("discount", "Discount cannot be more than the items total");
  }
  if (paid.gt(total)) throw validationError("paid", "Paid cannot be more than the order total");
  if (!customerId && !paid.eq(total)) {
    throw validationError("paid", "A walk-in order must be paid in full");
  }
  const unpaid = total.minus(paid);

  const orderId = await prisma.$transaction(async (tx) => {
    if (customerId) {
      await assertCustomerInShop(tx, shopId, customerId);
      if (unpaid.gt(ZERO)) await addDue(tx, "customer", { shopId, partyId: customerId }, unpaid);
    }

    // Rows are locked in a fixed order so two overlapping orders can't wait on each other
    const unitCosts = new Map<string, Prisma.Decimal>();
    const lockOrder = [...items].sort((a, b) => a.productId.localeCompare(b.productId));
    for (const { productId, quantity } of lockOrder) {
      const { avgCost } = await deductStock(tx, { shopId, productId }, quantity);
      unitCosts.set(productId, avgCost);
    }

    const order = await tx.order.create({
      data: {
        shopId,
        customerId,
        discount,
        total,
        paid,
        items: {
          create: items.map(({ productId, quantity, unitPrice }, index) => ({
            productId,
            quantity,
            unitPrice,
            unitCost: unitCosts.get(productId) ?? ZERO,
            lineTotal: lineTotals[index] ?? ZERO,
          })),
        },
      },
      select: { id: true },
    });

    await logActivity(tx, {
      shopId,
      userId,
      action: ActivityAction.ORDER_CREATE,
      entityType: ActivityEntity.ORDER,
      entityId: order.id,
      details: {
        customerId: customerId ?? null,
        discount: formatMoney(discount),
        total: formatMoney(total),
        paid: formatMoney(paid),
        itemCount: items.length,
      },
    });

    return order.id;
  });

  const order = await findOrder(shopId, orderId);
  return { order: toOrderView(order), warnings: findBelowCostWarnings(order) };
};

export const cancelOrder = async (
  { shopId, userId }: ShopContext,
  id: string,
  { reason }: CancelOrderInput,
) => {
  await prisma.$transaction(async (tx) => {
    // The status flip is the guard: of two simultaneous cancels only one can match COMPLETED
    const { count } = await tx.order.updateMany({
      where: { id, shopId, status: OrderStatus.COMPLETED },
      data: { status: OrderStatus.CANCELLED, cancelReason: reason },
    });
    if (count === 0) {
      const exists = await tx.order.findFirst({ where: { id, shopId }, select: { id: true } });
      if (!exists) throw orderNotFound();
      throw new AppError(httpStatus.CONFLICT, "Order is already cancelled");
    }

    const order = await tx.order.findUniqueOrThrow({
      where: { id },
      select: {
        customerId: true,
        total: true,
        paid: true,
        items: { select: { productId: true, quantity: true } },
      },
    });

    // Same fixed lock order as order creation
    const lockOrder = [...order.items].sort((a, b) => a.productId.localeCompare(b.productId));
    for (const { productId, quantity } of lockOrder) {
      await restoreStock(tx, { shopId, productId }, quantity);
    }

    const unpaid = order.total.minus(order.paid);
    if (order.customerId && unpaid.gt(ZERO)) {
      await cancelDue(tx, "customer", { shopId, partyId: order.customerId }, unpaid);
    }

    await logActivity(tx, {
      shopId,
      userId,
      action: ActivityAction.ORDER_CANCEL,
      entityType: ActivityEntity.ORDER,
      entityId: id,
      details: {
        customerId: order.customerId,
        reason,
        total: formatMoney(order.total),
        paid: formatMoney(order.paid),
        dueReduced: formatMoney(order.customerId ? unpaid : ZERO),
      },
    });
  });

  return toOrderView(await findOrder(shopId, id));
};
