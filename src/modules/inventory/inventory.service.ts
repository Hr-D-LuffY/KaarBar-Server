import httpStatus from "http-status";
import { OrderStatus, type Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ActivityAction, ActivityEntity, logActivity } from "../../shared/activity-log.service";
import { computeStockValue } from "../../shared/cost.service";
import { pushNotifications } from "../../shared/notification-push";
import { adjustStock } from "../../shared/stock.service";
import { AppError } from "../../utils/AppError";
import { formatInvoiceNo } from "../../utils/invoice-no";
import { formatMoney, formatUnitCost, sumMoney } from "../../utils/money";
import { buildPaginationMeta, getPagination } from "../../utils/pagination";
import type { ShopContext } from "../../utils/request-context";
import { containsSearch } from "../../utils/search";
import { buildOrderBy } from "../../utils/sort";
import {
  type CreateStockAdjustmentInput,
  type ListInventoryQuery,
  type ListStockMovementsQuery,
  stockAdjustmentLogDetailsSchema,
} from "./inventory.validation";

type StockMovement = {
  id: string;
  type: "OPENING_STOCK" | "RESTOCK" | "SALE" | "SALE_CANCELLED" | "ADJUSTMENT";
  createdAt: Date;
  // Signed smallest-step count: positive adds stock, negative removes it
  change: number;
  reference: { id: string; invoiceNo?: string } | null;
  reason: string | null;
  note: string | null;
};

const inventorySelect = {
  productId: true,
  stock: true,
  lowStockLevel: true,
  avgCost: true,
  product: {
    select: {
      name: true,
      packName: true,
      packSize: true,
      category: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      type: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true, symbol: true, decimalPlaces: true } },
    },
  },
} as const;

type InventoryRow = Prisma.ShopProductGetPayload<{ select: typeof inventorySelect }>;

const toInventoryItem = ({ product, stock, lowStockLevel, avgCost, ...rest }: InventoryRow) => ({
  ...rest,
  ...product,
  stock,
  lowStockLevel,
  isLowStock: stock <= lowStockLevel,
  avgCost: formatUnitCost(avgCost),
  stockValue: formatMoney(computeStockValue(stock, avgCost)),
});

const buildOrder = (
  sortBy: ListInventoryQuery["sortBy"],
  sortOrder: ListInventoryQuery["sortOrder"],
): Prisma.ShopProductOrderByWithRelationInput =>
  sortBy === "name" ? { product: { name: sortOrder } } : buildOrderBy(sortBy, sortOrder);

export const listInventory = async (
  shopId: string,
  { search, categoryId, lowStock, sortBy, sortOrder, ...pagination }: ListInventoryQuery,
) => {
  const where: Prisma.ShopProductWhereInput = {
    shopId,
    deletedAt: null,
    ...(lowStock && { stock: { lte: prisma.shopProduct.fields.lowStockLevel } }),
    product: {
      ...(categoryId && { categoryId }),
      ...(search && { name: containsSearch(search) }),
    },
  };

  const [rows, total, valued] = await prisma.$transaction([
    prisma.shopProduct.findMany({
      where,
      orderBy: buildOrder(sortBy, sortOrder),
      select: inventorySelect,
      ...getPagination(pagination),
    }),
    prisma.shopProduct.count({ where }),
    prisma.shopProduct.findMany({ where, select: { stock: true, avgCost: true } }),
  ]);

  // Sum of the rounded per-row values, so the total always matches the rows shown
  const totalStockValue = sumMoney(
    valued.map(({ stock, avgCost }) => computeStockValue(stock, avgCost)),
  );

  return {
    products: rows.map(toInventoryItem),
    summary: { totalStockValue: formatMoney(totalStockValue) },
    meta: buildPaginationMeta({ ...pagination, total }),
  };
};

export const createStockAdjustment = async (
  { shopId, userId }: ShopContext,
  { productId, change, reason, note }: CreateStockAdjustmentInput,
) => {
  const { stock, notification } = await prisma.$transaction(async (tx) => {
    const result = await adjustStock(tx, { shopId, productId }, change);
    await logActivity(tx, {
      shopId,
      userId,
      action: ActivityAction.STOCK_ADJUSTMENT,
      entityType: ActivityEntity.PRODUCT,
      entityId: productId,
      details: { change, reason, note: note ?? null },
    });
    return result;
  });

  if (notification) pushNotifications(shopId, [notification]);

  return { productId, change, reason, note: note ?? null, stock };
};

export const getStockMovements = async (
  shopId: string,
  productId: string,
  pagination: ListStockMovementsQuery,
) => {
  const [shopProduct, restockItems, orderItems, adjustments] = await prisma.$transaction([
    prisma.shopProduct.findUnique({
      where: { shopId_productId: { shopId, productId } },
      select: {
        stock: true,
        product: {
          select: {
            id: true,
            name: true,
            unit: { select: { id: true, name: true, symbol: true, decimalPlaces: true } },
          },
        },
      },
    }),
    prisma.restockItem.findMany({
      where: { productId, session: { shopId } },
      select: {
        id: true,
        quantity: true,
        session: { select: { id: true, createdAt: true, isOpeningStock: true, note: true } },
      },
    }),
    prisma.orderItem.findMany({
      where: { productId, order: { shopId } },
      select: {
        id: true,
        quantity: true,
        order: {
          select: { id: true, invoiceNo: true, status: true, createdAt: true, updatedAt: true },
        },
      },
    }),
    prisma.activityLog.findMany({
      where: {
        shopId,
        action: ActivityAction.STOCK_ADJUSTMENT,
        entityType: ActivityEntity.PRODUCT,
        entityId: productId,
      },
      select: { id: true, createdAt: true, details: true },
    }),
  ]);
  if (!shopProduct) throw new AppError(httpStatus.NOT_FOUND, "Product not found");

  const movements: StockMovement[] = [
    ...restockItems.map(
      ({ id, quantity, session }): StockMovement => ({
        id,
        type: session.isOpeningStock ? "OPENING_STOCK" : "RESTOCK",
        createdAt: session.createdAt,
        change: quantity,
        reference: { id: session.id },
        reason: null,
        note: session.note,
      }),
    ),
    ...orderItems.flatMap(({ id, quantity, order }): StockMovement[] => {
      const reference = { id: order.id, invoiceNo: formatInvoiceNo(order.invoiceNo) };
      const sale: StockMovement = {
        id,
        type: "SALE",
        createdAt: order.createdAt,
        change: -quantity,
        reference,
        reason: null,
        note: null,
      };
      if (order.status !== OrderStatus.CANCELLED) return [sale];
      // An order is only ever modified by cancelling it, so updatedAt is the cancel time
      const cancel: StockMovement = {
        ...sale,
        id: `${id}:cancel`,
        type: "SALE_CANCELLED",
        createdAt: order.updatedAt,
        change: quantity,
      };
      return [sale, cancel];
    }),
    ...adjustments.map(({ id, createdAt, details }): StockMovement => {
      const { change, reason, note } = stockAdjustmentLogDetailsSchema.parse(details);
      return { id, type: "ADJUSTMENT", createdAt, change, reference: null, reason, note };
    }),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id));

  // Current stock is the balance after the newest movement; walking back undoes one at a time
  let stockAfter = shopProduct.stock;
  const timeline = movements.map((movement) => {
    const row = { ...movement, stockAfter };
    stockAfter -= movement.change;
    return row;
  });

  const { skip, take } = getPagination(pagination);
  return {
    product: { ...shopProduct.product, stock: shopProduct.stock },
    movements: timeline.slice(skip, skip + take),
    meta: buildPaginationMeta({ ...pagination, total: timeline.length }),
  };
};
