import httpStatus from "http-status";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ActivityAction, ActivityEntity, logActivity } from "../../shared/activity-log.service";
import { computeRestockCosts } from "../../shared/cost.service";
import { addDue } from "../../shared/due.service";
import { receiveStock } from "../../shared/stock.service";
import { AppError } from "../../utils/AppError";
import { buildDateRange } from "../../utils/date-range";
import { formatMoney, formatUnitCost, ZERO } from "../../utils/money";
import { buildPaginationMeta, getPagination } from "../../utils/pagination";
import type { ShopContext } from "../../utils/request-context";
import { buildOrderBy } from "../../utils/sort";
import type { CreateRestockInput, ListRestocksQuery } from "./restock.validation";

const sessionSelect = {
  id: true,
  vendorId: true,
  vendor: { select: { id: true, name: true } },
  isOpeningStock: true,
  transportCost: true,
  total: true,
  paid: true,
  note: true,
  createdAt: true,
} as const;

const sessionWithItemsSelect = {
  ...sessionSelect,
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
      buyPrice: true,
      landedUnitCost: true,
    },
  },
} satisfies Prisma.RestockSessionSelect;

type SessionRow = Prisma.RestockSessionGetPayload<{ select: typeof sessionSelect }>;
type SessionWithItemsRow = Prisma.RestockSessionGetPayload<{
  select: typeof sessionWithItemsSelect;
}>;

const toSessionView = ({ transportCost, total, paid, ...session }: SessionRow) => ({
  ...session,
  transportCost: formatMoney(transportCost),
  total: formatMoney(total),
  paid: formatMoney(paid),
  // Opening stock was never bought on credit, so it adds nothing to a vendor's due
  due: formatMoney(session.isOpeningStock ? ZERO : total.minus(paid)),
});

const toSessionWithItemsView = ({ items, ...session }: SessionWithItemsRow) => ({
  ...toSessionView(session),
  items: items.map(({ buyPrice, landedUnitCost, ...item }) => ({
    ...item,
    buyPrice: formatUnitCost(buyPrice),
    landedUnitCost: formatUnitCost(landedUnitCost),
  })),
});

const restockNotFound = () => new AppError(httpStatus.NOT_FOUND, "Restock not found");

export const listRestocks = async (
  shopId: string,
  { vendorId, isOpeningStock, from, to, sortBy, sortOrder, ...pagination }: ListRestocksQuery,
) => {
  const createdAt = buildDateRange({ from, to });
  const where: Prisma.RestockSessionWhereInput = {
    shopId,
    ...(vendorId && { vendorId }),
    ...(isOpeningStock !== undefined && { isOpeningStock }),
    ...(Object.keys(createdAt).length > 0 && { createdAt }),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.restockSession.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
      select: sessionSelect,
      ...getPagination(pagination),
    }),
    prisma.restockSession.count({ where }),
  ]);

  return { restocks: rows.map(toSessionView), meta: buildPaginationMeta({ ...pagination, total }) };
};

export const getRestock = async (shopId: string, id: string) => {
  const restock = await prisma.restockSession.findFirst({
    where: { id, shopId },
    select: sessionWithItemsSelect,
  });
  if (!restock) throw restockNotFound();
  return toSessionWithItemsView(restock);
};

const assertVendorInShop = async (tx: Prisma.TransactionClient, shopId: string, id: string) => {
  const vendor = await tx.vendor.findFirst({
    where: { id, shopId, deletedAt: null },
    select: { id: true },
  });
  if (!vendor) throw new AppError(httpStatus.NOT_FOUND, "Vendor not found");
};

export const createRestock = async (
  { shopId, userId }: ShopContext,
  { vendorId, isOpeningStock, transportCost, paid, note, items }: CreateRestockInput,
) => {
  const costs = computeRestockCosts(items, transportCost);
  if (paid.gt(costs.total)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Validation failed", [
      { field: "paid", message: "Paid cannot be more than the restock total" },
    ]);
  }
  const unpaid = costs.total.minus(paid);

  const sessionId = await prisma.$transaction(async (tx) => {
    if (vendorId) {
      await assertVendorInShop(tx, shopId, vendorId);
      if (unpaid.gt(ZERO)) await addDue(tx, "vendor", { shopId, partyId: vendorId }, unpaid);
    }

    const session = await tx.restockSession.create({
      data: {
        shopId,
        vendorId,
        isOpeningStock,
        transportCost,
        total: costs.total,
        paid,
        note,
        items: {
          create: items.map(({ productId, quantity, buyPrice }, index) => ({
            productId,
            quantity,
            buyPrice,
            landedUnitCost: costs.lines[index]?.landedUnitCost ?? ZERO,
          })),
        },
      },
      select: { id: true },
    });

    // Rows are locked in a fixed order so two overlapping restocks can't wait on each other
    const lockOrder = items
      .map((item, index) => ({ ...item, index }))
      .sort((a, b) => a.productId.localeCompare(b.productId));
    for (const { productId, quantity, index } of lockOrder) {
      await receiveStock(
        tx,
        { shopId, productId },
        quantity,
        costs.lines[index]?.landedUnitCost ?? ZERO,
      );
    }

    await logActivity(tx, {
      shopId,
      userId,
      action: ActivityAction.RESTOCK_CREATE,
      entityType: ActivityEntity.RESTOCK,
      entityId: session.id,
      details: {
        vendorId: vendorId ?? null,
        isOpeningStock,
        total: formatMoney(costs.total),
        paid: formatMoney(paid),
        itemCount: items.length,
      },
    });

    return session.id;
  });

  return getRestock(shopId, sessionId);
};
