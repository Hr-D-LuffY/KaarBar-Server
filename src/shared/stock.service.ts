import httpStatus from "http-status";
import { type Notification, NotificationType, Prisma } from "../generated/prisma/client";
import { AppError } from "../utils/AppError";
import { computeWeightedAvgCost } from "./cost.service";

type Tx = Prisma.TransactionClient;

type StockTarget = {
  shopId: string;
  productId: string;
};

type DeductedRow = {
  stock: number;
  lowStockLevel: number;
  avgCost: Prisma.Decimal | string | number;
};

type LockedRow = {
  stock: number;
  avgCost: Prisma.Decimal | string | number;
};

const productNotFound = () => new AppError(httpStatus.NOT_FOUND, "Product not found");

// Only a move from above the line to at or below it counts, so staying low never repeats the alert
export const detectStockCrossing = (
  previousStock: number,
  newStock: number,
  lowStockLevel: number,
) => {
  if (newStock <= 0 && previousStock > 0) return NotificationType.OUT_OF_STOCK;
  if (newStock <= lowStockLevel && previousStock > lowStockLevel) return NotificationType.LOW_STOCK;
  return null;
};

const createStockNotification = async (
  tx: Tx,
  { shopId, productId }: StockTarget,
  type: NotificationType,
) => {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { name: true },
  });
  if (!product) throw productNotFound();

  const title =
    type === NotificationType.OUT_OF_STOCK
      ? `${product.name} is out of stock`
      : `${product.name} is running low`;

  return tx.notification.create({ data: { shopId, productId, type, title } });
};

// Single conditional UPDATE: the stock check and the decrement can't be split by a concurrent request.
// The row stays locked until commit, so the returned avgCost is the cost this sale is booked at.
export const deductStock = async (
  tx: Tx,
  target: StockTarget,
  quantity: number,
): Promise<{ stock: number; avgCost: Prisma.Decimal; notification: Notification | null }> => {
  const { shopId, productId } = target;
  const [row] = await tx.$queryRaw<DeductedRow[]>(Prisma.sql`
    UPDATE "shop_products"
    SET "stock" = "stock" - ${quantity}, "updatedAt" = NOW()
    WHERE "shopId" = ${shopId}
      AND "productId" = ${productId}
      AND "deletedAt" IS NULL
      AND "stock" >= ${quantity}
    RETURNING "stock", "lowStockLevel", "avgCost"
  `);

  if (!row) {
    const exists = await tx.shopProduct.findFirst({
      where: { shopId, productId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw productNotFound();
    throw new AppError(httpStatus.CONFLICT, "Not enough stock");
  }

  const crossing = detectStockCrossing(row.stock + quantity, row.stock, row.lowStockLevel);
  const notification = crossing ? await createStockNotification(tx, target, crossing) : null;
  return { stock: row.stock, avgCost: new Prisma.Decimal(row.avgCost), notification };
};

// Works on removed shop products too, so a cancelled old order can always put its stock back
export const restoreStock = async (
  tx: Tx,
  { shopId, productId }: StockTarget,
  quantity: number,
) => {
  const { stock } = await tx.shopProduct.update({
    where: { shopId_productId: { shopId, productId } },
    data: { stock: { increment: quantity } },
    select: { stock: true },
  });
  return stock;
};

// Locks the row so two restocks of the same product can't average against the same old stock
export const receiveStock = async (
  tx: Tx,
  { shopId, productId }: StockTarget,
  quantity: number,
  landedUnitCost: Prisma.Decimal,
) => {
  const [row] = await tx.$queryRaw<LockedRow[]>(Prisma.sql`
    SELECT "stock", "avgCost"
    FROM "shop_products"
    WHERE "shopId" = ${shopId} AND "productId" = ${productId} AND "deletedAt" IS NULL
    FOR UPDATE
  `);
  if (!row) throw productNotFound();

  const avgCost = computeWeightedAvgCost(
    row.stock,
    new Prisma.Decimal(row.avgCost),
    quantity,
    landedUnitCost,
  );

  return tx.shopProduct.update({
    where: { shopId_productId: { shopId, productId } },
    data: { stock: { increment: quantity }, avgCost },
    select: { stock: true, avgCost: true },
  });
};

// Manual correction in either direction; a decrease reuses deductStock so it can't go below zero
export const adjustStock = async (
  tx: Tx,
  target: StockTarget,
  change: number,
): Promise<{ stock: number; notification: Notification | null }> => {
  if (change < 0) {
    const { stock, notification } = await deductStock(tx, target, -change);
    return { stock, notification };
  }

  const { shopId, productId } = target;
  const [row] = await tx.$queryRaw<{ stock: number }[]>(Prisma.sql`
    UPDATE "shop_products"
    SET "stock" = "stock" + ${change}, "updatedAt" = NOW()
    WHERE "shopId" = ${shopId} AND "productId" = ${productId} AND "deletedAt" IS NULL
    RETURNING "stock"
  `);
  if (!row) throw productNotFound();
  return { stock: row.stock, notification: null };
};
