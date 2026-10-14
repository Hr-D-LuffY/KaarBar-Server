import httpStatus from "http-status";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ActivityAction, ActivityEntity, logActivity } from "../../shared/activity-log.service";
import { AppError } from "../../utils/AppError";
import { buildDateRange, currentDhakaMonth } from "../../utils/date-range";
import { formatMoney } from "../../utils/money";
import { buildPaginationMeta, getPagination } from "../../utils/pagination";
import type { ShopContext } from "../../utils/request-context";
import { containsSearch } from "../../utils/search";
import { buildOrderBy } from "../../utils/sort";
import {
  type CreateSalaryPaymentInput,
  type CreateStaffInput,
  type ListStaffQuery,
  type StaffLedgerQuery,
  salaryLogDetailsSchema,
  type UpdateStaffInput,
} from "./staff.validation";

const RECENT_PAYMENT_COUNT = 10;

const staffSelect = {
  id: true,
  name: true,
  phone: true,
  designation: true,
  monthlySalary: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const salaryLogSelect = {
  id: true,
  createdAt: true,
  details: true,
  user: { select: { id: true, name: true } },
} as const;

type StaffRow = Prisma.StaffGetPayload<{ select: typeof staffSelect }>;
type SalaryLogRow = Prisma.ActivityLogGetPayload<{ select: typeof salaryLogSelect }>;

const staffNotFound = () => new AppError(httpStatus.NOT_FOUND, "Staff member not found");

const toStaffView = ({ monthlySalary, ...staff }: StaffRow) => ({
  ...staff,
  monthlySalary: formatMoney(monthlySalary),
});

const salaryLogWhere = (shopId: string, staffId: string): Prisma.ActivityLogWhereInput => ({
  shopId,
  action: ActivityAction.SALARY_PAYMENT,
  entityType: ActivityEntity.STAFF,
  entityId: staffId,
});

const toSalaryEntry = ({ id, createdAt, details, user }: SalaryLogRow) => ({
  id,
  createdAt,
  ...salaryLogDetailsSchema.parse(details),
  recordedBy: user,
});

// Row lock: two salary payments for the same staff member run one after the other, so the
// one-SALARY-per-period check below can't be passed by both
const lockStaff = async (tx: Prisma.TransactionClient, shopId: string, id: string) => {
  const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM staff WHERE id = ${id} AND "shopId" = ${shopId} AND "deletedAt" IS NULL FOR UPDATE`;
  if (locked.length === 0) throw staffNotFound();

  return tx.staff.findUniqueOrThrow({ where: { id }, select: { monthlySalary: true } });
};

const assertSalaryNotPaid = async (
  tx: Prisma.TransactionClient,
  shopId: string,
  staffId: string,
  period: string,
) => {
  const existing = await tx.activityLog.findFirst({
    where: {
      ...salaryLogWhere(shopId, staffId),
      AND: [
        { details: { path: ["type"], equals: "SALARY" } },
        { details: { path: ["period"], equals: period } },
      ],
    },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Salary for ${period} has already been paid to this staff member`,
    );
  }
};

export const listStaff = async (
  shopId: string,
  { search, sortBy, sortOrder, ...pagination }: ListStaffQuery,
) => {
  const where: Prisma.StaffWhereInput = {
    shopId,
    deletedAt: null,
    ...(search && {
      OR: [{ name: containsSearch(search) }, { phone: containsSearch(search) }],
    }),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.staff.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
      select: staffSelect,
      ...getPagination(pagination),
    }),
    prisma.staff.count({ where }),
  ]);

  return { staff: rows.map(toStaffView), meta: buildPaginationMeta({ ...pagination, total }) };
};

export const getStaff = async (shopId: string, id: string) => {
  const [staff, payments] = await prisma.$transaction([
    prisma.staff.findFirst({ where: { id, shopId, deletedAt: null }, select: staffSelect }),
    prisma.activityLog.findMany({
      where: salaryLogWhere(shopId, id),
      orderBy: { createdAt: "desc" },
      take: RECENT_PAYMENT_COUNT,
      select: salaryLogSelect,
    }),
  ]);
  if (!staff) throw staffNotFound();

  return { ...toStaffView(staff), recentPayments: payments.map(toSalaryEntry) };
};

export const createStaff = async (
  shopId: string,
  { name, phone, designation, monthlySalary, joinedAt }: CreateStaffInput,
) => {
  const staff = await prisma.staff.create({
    data: { shopId, name, phone, designation, monthlySalary, joinedAt },
    select: staffSelect,
  });
  return toStaffView(staff);
};

export const updateStaff = async (
  shopId: string,
  id: string,
  { name, phone, designation, monthlySalary, joinedAt }: UpdateStaffInput,
) => {
  const { count } = await prisma.staff.updateMany({
    where: { id, shopId, deletedAt: null },
    data: { name, phone, designation, monthlySalary, joinedAt },
  });
  if (count === 0) throw staffNotFound();

  return getStaff(shopId, id);
};

export const deleteStaff = async (shopId: string, id: string) => {
  const { count } = await prisma.staff.updateMany({
    where: { id, shopId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (count === 0) throw staffNotFound();
};

export const createSalaryPayment = async (
  { shopId, userId }: ShopContext,
  id: string,
  { type, amount, period, note }: CreateSalaryPaymentInput,
) => {
  const payment = await prisma.$transaction(async (tx) => {
    const { monthlySalary } = await lockStaff(tx, shopId, id);
    const paidAmount = amount ?? monthlySalary;
    const paidPeriod = period ?? (type === "SALARY" ? currentDhakaMonth() : null);
    if (type === "SALARY" && paidPeriod) await assertSalaryNotPaid(tx, shopId, id, paidPeriod);

    const details = {
      type,
      amount: formatMoney(paidAmount),
      period: paidPeriod,
      note: note ?? null,
    };
    const log = await logActivity(tx, {
      shopId,
      userId,
      action: ActivityAction.SALARY_PAYMENT,
      entityType: ActivityEntity.STAFF,
      entityId: id,
      details,
    });
    return { id: log.id, createdAt: log.createdAt, ...details };
  });

  return { ...payment, staffId: id };
};

export const getStaffLedger = async (
  shopId: string,
  id: string,
  { type, from, to, ...pagination }: StaffLedgerQuery,
) => {
  const createdAt = buildDateRange({ from, to });
  const where: Prisma.ActivityLogWhereInput = {
    ...salaryLogWhere(shopId, id),
    ...(type && { details: { path: ["type"], equals: type } }),
    ...(Object.keys(createdAt).length > 0 && { createdAt }),
  };

  const [staff, logs, total] = await prisma.$transaction([
    prisma.staff.findFirst({ where: { id, shopId, deletedAt: null }, select: staffSelect }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: salaryLogSelect,
      ...getPagination(pagination),
    }),
    prisma.activityLog.count({ where }),
  ]);
  if (!staff) throw staffNotFound();

  return {
    staff: toStaffView(staff),
    entries: logs.map(toSalaryEntry),
    meta: buildPaginationMeta({ ...pagination, total }),
  };
};
