import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { buildDateRange } from "../../utils/date-range";
import { buildPaginationMeta, getPagination } from "../../utils/pagination";
import { buildOrderBy } from "../../utils/sort";
import type { ListActivityLogsQuery } from "./activity-log.validation";

const activityLogSelect = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  details: true,
  createdAt: true,
  user: { select: { id: true, name: true, role: true } },
} as const;

export const listActivityLogs = async (
  shopId: string,
  { action, entityType, userId, from, to, sortBy, sortOrder, ...pagination }: ListActivityLogsQuery,
) => {
  const createdAt = buildDateRange({ from, to });
  const where: Prisma.ActivityLogWhereInput = {
    shopId,
    ...(action && { action }),
    ...(entityType && { entityType }),
    ...(userId && { userId }),
    ...(Object.keys(createdAt).length > 0 && { createdAt }),
  };

  const [logs, total] = await prisma.$transaction([
    prisma.activityLog.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
      select: activityLogSelect,
      ...getPagination(pagination),
    }),
    prisma.activityLog.count({ where }),
  ]);

  return { logs, meta: buildPaginationMeta({ ...pagination, total }) };
};
