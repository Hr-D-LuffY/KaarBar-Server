import httpStatus from "http-status";
import { OrderStatus, type Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ActivityAction, ActivityEntity, logActivity } from "../../shared/activity-log.service";
import { AppError } from "../../utils/AppError";
import { buildDateRange, currentDhakaMonth } from "../../utils/date-range";
import { buildPaginationMeta, getPagination } from "../../utils/pagination";
import type { ShopContext } from "../../utils/request-context";
import { containsSearch } from "../../utils/search";
import { buildOrderBy } from "../../utils/sort";
import { activityLogSelect } from "../activity-log/activity-log.service";
import type {
  ListAllActivityLogsQuery,
  ListShopsQuery,
  UpdateShopStatusInput,
} from "./admin.validation";

const shopSelect = {
  id: true,
  shopName: true,
  phone: true,
  address: true,
  isActive: true,
  createdAt: true,
} as const;

const listSelect = { ...shopSelect, _count: { select: { users: true } } } as const;

const toShopRow = ({ _count, ...shop }: Prisma.ShopGetPayload<{ select: typeof listSelect }>) => ({
  ...shop,
  userCount: _count.users,
});

export const listShops = async ({
  search,
  isActive,
  sortBy,
  sortOrder,
  ...pagination
}: ListShopsQuery) => {
  const where: Prisma.ShopWhereInput = {
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [{ shopName: containsSearch(search) }, { phone: containsSearch(search) }],
    }),
  };

  const [shops, total] = await prisma.$transaction([
    prisma.shop.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
      select: listSelect,
      ...getPagination(pagination),
    }),
    prisma.shop.count({ where }),
  ]);

  return { shops: shops.map(toShopRow), meta: buildPaginationMeta({ ...pagination, total }) };
};

export const updateShopStatus = async (
  { userId }: Pick<ShopContext, "userId">,
  shopId: string,
  { isActive }: UpdateShopStatusInput,
) => {
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: shopSelect });
  if (!shop) throw new AppError(httpStatus.NOT_FOUND, "Shop not found");
  if (shop.isActive === isActive) return shop;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.shop.update({
      where: { id: shopId },
      data: { isActive },
      select: shopSelect,
    });
    await logActivity(tx, {
      shopId,
      userId,
      action: ActivityAction.SHOP_STATUS_CHANGE,
      entityType: ActivityEntity.SHOP,
      entityId: shopId,
      details: { isActive },
    });
    return updated;
  });
};

export const getStats = async () => {
  const thisMonth = buildDateRange({ from: `${currentDhakaMonth()}-01` });

  const [shops, activeShops, users, activeUsers, ordersThisMonth] = await prisma.$transaction([
    prisma.shop.count(),
    prisma.shop.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.order.count({ where: { status: OrderStatus.COMPLETED, createdAt: thisMonth } }),
  ]);

  return {
    shops: { total: shops, active: activeShops },
    users: { total: users, active: activeUsers },
    ordersThisMonth,
  };
};

export const listAllActivityLogs = async ({
  shopId,
  action,
  from,
  to,
  sortBy,
  sortOrder,
  ...pagination
}: ListAllActivityLogsQuery) => {
  const createdAt = buildDateRange({ from, to });
  const where: Prisma.ActivityLogWhereInput = {
    ...(shopId && { shopId }),
    ...(action && { action }),
    ...(Object.keys(createdAt).length > 0 && { createdAt }),
  };

  const [logs, total] = await prisma.$transaction([
    prisma.activityLog.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
      select: { ...activityLogSelect, shop: { select: { id: true, shopName: true } } },
      ...getPagination(pagination),
    }),
    prisma.activityLog.count({ where }),
  ]);

  return { logs, meta: buildPaginationMeta({ ...pagination, total }) };
};
