import httpStatus from "http-status";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ActivityAction, ActivityEntity, logActivity } from "../../shared/activity-log.service";
import { applyPayment } from "../../shared/due.service";
import { AppError } from "../../utils/AppError";
import { formatMoney, ZERO } from "../../utils/money";
import { buildPaginationMeta, getPagination } from "../../utils/pagination";
import type { ShopContext } from "../../utils/request-context";
import { containsSearch } from "../../utils/search";
import { buildOrderBy } from "../../utils/sort";
import type {
  CreateVendorInput,
  CreateVendorPaymentInput,
  ListVendorsQuery,
  UpdateVendorInput,
} from "./vendor.validation";

const RECENT_RESTOCK_COUNT = 5;

const vendorSelect = {
  id: true,
  name: true,
  phone: true,
  due: true,
  createdAt: true,
  updatedAt: true,
} as const;

const recentRestockSelect = {
  id: true,
  transportCost: true,
  total: true,
  paid: true,
  createdAt: true,
} as const;

type VendorRow = Prisma.VendorGetPayload<{ select: typeof vendorSelect }>;

const vendorNotFound = () => new AppError(httpStatus.NOT_FOUND, "Vendor not found");

const toVendorView = ({ due, ...vendor }: VendorRow) => ({ ...vendor, due: formatMoney(due) });

export const listVendors = async (
  shopId: string,
  { search, hasDue, sortBy, sortOrder, ...pagination }: ListVendorsQuery,
) => {
  const where: Prisma.VendorWhereInput = {
    shopId,
    deletedAt: null,
    ...(hasDue && { due: { not: ZERO } }),
    ...(search && {
      OR: [{ name: containsSearch(search) }, { phone: containsSearch(search) }],
    }),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.vendor.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
      select: vendorSelect,
      ...getPagination(pagination),
    }),
    prisma.vendor.count({ where }),
  ]);

  return { vendors: rows.map(toVendorView), meta: buildPaginationMeta({ ...pagination, total }) };
};

export const getVendor = async (shopId: string, id: string) => {
  const vendor = await prisma.vendor.findFirst({
    where: { id, shopId, deletedAt: null },
    select: {
      ...vendorSelect,
      restockSessions: {
        orderBy: { createdAt: "desc" },
        take: RECENT_RESTOCK_COUNT,
        select: recentRestockSelect,
      },
    },
  });
  if (!vendor) throw vendorNotFound();

  const { restockSessions, ...rest } = vendor;
  return {
    ...toVendorView(rest),
    recentRestocks: restockSessions.map(({ transportCost, total, paid, ...restock }) => ({
      ...restock,
      transportCost: formatMoney(transportCost),
      total: formatMoney(total),
      paid: formatMoney(paid),
    })),
  };
};

export const createVendor = async (shopId: string, { name, phone, due }: CreateVendorInput) => {
  const vendor = await prisma.vendor.create({
    data: { shopId, name, phone, due },
    select: vendorSelect,
  });
  return toVendorView(vendor);
};

export const updateVendor = async (
  shopId: string,
  id: string,
  { name, phone }: UpdateVendorInput,
) => {
  const { count } = await prisma.vendor.updateMany({
    where: { id, shopId, deletedAt: null },
    data: { name, phone },
  });
  if (count === 0) throw vendorNotFound();

  return getVendor(shopId, id);
};

export const deleteVendor = async (shopId: string, id: string) => {
  // The due check is part of the UPDATE, so a payment or restock racing this call can't slip past it
  const { count } = await prisma.vendor.updateMany({
    where: { id, shopId, deletedAt: null, due: ZERO },
    data: { deletedAt: new Date() },
  });
  if (count > 0) return;

  const exists = await prisma.vendor.findFirst({
    where: { id, shopId, deletedAt: null },
    select: { id: true },
  });
  if (!exists) throw vendorNotFound();
  throw new AppError(httpStatus.CONFLICT, "Vendor cannot be deleted while a due is outstanding");
};

export const createVendorPayment = async (
  { shopId, userId }: ShopContext,
  id: string,
  { amount, note }: CreateVendorPaymentInput,
) => {
  const due = await prisma.$transaction(async (tx) => {
    const remainingDue = await applyPayment(tx, "vendor", { shopId, partyId: id }, amount);
    await logActivity(tx, {
      shopId,
      userId,
      action: ActivityAction.VENDOR_PAYMENT,
      entityType: ActivityEntity.VENDOR,
      entityId: id,
      details: { amount: formatMoney(amount), note: note ?? null },
    });
    return remainingDue;
  });

  return { vendorId: id, amount: formatMoney(amount), note: note ?? null, due: formatMoney(due) };
};
