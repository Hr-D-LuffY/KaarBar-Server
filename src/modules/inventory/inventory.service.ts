import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { computeStockValue } from "../../shared/cost.service";
import { formatMoney, formatUnitCost, sumMoney } from "../../utils/money";
import { buildPaginationMeta, getPagination } from "../../utils/pagination";
import { containsSearch } from "../../utils/search";
import { buildOrderBy } from "../../utils/sort";
import type { ListInventoryQuery } from "./inventory.validation";

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
