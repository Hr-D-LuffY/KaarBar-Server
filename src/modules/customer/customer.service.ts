import httpStatus from "http-status";
import { OrderStatus, Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ActivityAction, ActivityEntity } from "../../shared/activity-log.service";
import { recordPayment } from "../../shared/due.service";
import { paginateLedger } from "../../shared/ledger.service";
import { paymentLogDetailsSchema } from "../../shared/payment.validation";
import { AppError } from "../../utils/AppError";
import { formatInvoiceNo } from "../../utils/invoice-no";
import { formatMoney, ZERO } from "../../utils/money";
import { buildPaginationMeta, getPagination } from "../../utils/pagination";
import type { ShopContext } from "../../utils/request-context";
import { containsSearch } from "../../utils/search";
import { buildOrderBy } from "../../utils/sort";
import type {
  CreateCustomerInput,
  CreateCustomerPaymentInput,
  ListCustomerLedgerQuery,
  ListCustomersQuery,
  UpdateCustomerInput,
} from "./customer.validation";

const RECENT_ORDER_COUNT = 5;

type LedgerEntry = {
  id: string;
  type: "ORDER" | "ORDER_CANCEL" | "PAYMENT";
  createdAt: Date;
  invoiceNumber: string | null;
  total: string | null;
  paid: string;
  change: Prisma.Decimal;
  note: string | null;
};

const customerSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  due: true,
  createdAt: true,
  updatedAt: true,
} as const;

const recentOrderSelect = {
  id: true,
  invoiceNo: true,
  total: true,
  paid: true,
  status: true,
  createdAt: true,
} as const;

type CustomerRow = Prisma.CustomerGetPayload<{ select: typeof customerSelect }>;

const customerNotFound = () => new AppError(httpStatus.NOT_FOUND, "Customer not found");

const toCustomerView = ({ due, ...customer }: CustomerRow) => ({
  ...customer,
  due: formatMoney(due),
});

// Soft-deleted customers are checked too: they still hold their phone in the (shopId, phone) unique index
const assertPhoneFree = async (shopId: string, phone: string, excludeId?: string) => {
  const existing = await prisma.customer.findFirst({
    where: { shopId, phone, ...(excludeId && { id: { not: excludeId } }) },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, "A customer with this phone number already exists");
  }
};

export const listCustomers = async (
  shopId: string,
  { search, hasDue, sortBy, sortOrder, ...pagination }: ListCustomersQuery,
) => {
  const where: Prisma.CustomerWhereInput = {
    shopId,
    deletedAt: null,
    ...(hasDue && { due: { not: ZERO } }),
    ...(search && {
      OR: [{ name: containsSearch(search) }, { phone: containsSearch(search) }],
    }),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
      select: customerSelect,
      ...getPagination(pagination),
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers: rows.map(toCustomerView),
    meta: buildPaginationMeta({ ...pagination, total }),
  };
};

export const getCustomer = async (shopId: string, id: string) => {
  const customer = await prisma.customer.findFirst({
    where: { id, shopId, deletedAt: null },
    select: {
      ...customerSelect,
      orders: {
        orderBy: { createdAt: "desc" },
        take: RECENT_ORDER_COUNT,
        select: recentOrderSelect,
      },
    },
  });
  if (!customer) throw customerNotFound();

  const { orders, ...rest } = customer;
  return {
    ...toCustomerView(rest),
    recentOrders: orders.map(({ total, paid, ...order }) => ({
      ...order,
      total: formatMoney(total),
      paid: formatMoney(paid),
    })),
  };
};

export const createCustomer = async (
  shopId: string,
  { name, phone, email, address, due }: CreateCustomerInput,
) => {
  await assertPhoneFree(shopId, phone);

  const customer = await prisma.customer.create({
    data: { shopId, name, phone, email, address, due },
    select: customerSelect,
  });
  return toCustomerView(customer);
};

export const updateCustomer = async (
  shopId: string,
  id: string,
  { name, phone, email, address }: UpdateCustomerInput,
) => {
  if (phone !== undefined) await assertPhoneFree(shopId, phone, id);

  const { count } = await prisma.customer.updateMany({
    where: { id, shopId, deletedAt: null },
    data: { name, phone, email, address },
  });
  if (count === 0) throw customerNotFound();

  return getCustomer(shopId, id);
};

export const deleteCustomer = async (shopId: string, id: string) => {
  // The due check is part of the UPDATE, so a payment or sale racing this call can't slip past it
  const { count } = await prisma.customer.updateMany({
    where: { id, shopId, deletedAt: null, due: ZERO },
    data: { deletedAt: new Date() },
  });
  if (count > 0) return;

  const exists = await prisma.customer.findFirst({
    where: { id, shopId, deletedAt: null },
    select: { id: true },
  });
  if (!exists) throw customerNotFound();
  throw new AppError(httpStatus.CONFLICT, "Customer cannot be deleted while a due is outstanding");
};

export const createCustomerPayment = async (
  { shopId, userId }: ShopContext,
  id: string,
  { amount, note }: CreateCustomerPaymentInput,
) => {
  const due = await prisma.$transaction((tx) =>
    recordPayment(tx, "customer", { shopId, userId, partyId: id, amount, note }),
  );

  return {
    customerId: id,
    amount: formatMoney(amount),
    note: note ?? null,
    due: formatMoney(due),
  };
};

export const getCustomerLedger = async (
  shopId: string,
  id: string,
  pagination: ListCustomerLedgerQuery,
) => {
  const [customer, orders, payments] = await prisma.$transaction([
    prisma.customer.findFirst({
      where: { id, shopId, deletedAt: null },
      select: { id: true, name: true, phone: true, due: true },
    }),
    prisma.order.findMany({
      where: { shopId, customerId: id },
      select: {
        id: true,
        invoiceNo: true,
        total: true,
        paid: true,
        status: true,
        cancelReason: true,
        createdAt: true,
      },
    }),
    prisma.activityLog.findMany({
      where: {
        shopId,
        action: ActivityAction.CUSTOMER_PAYMENT,
        entityType: ActivityEntity.CUSTOMER,
        entityId: id,
      },
      select: { id: true, createdAt: true, details: true },
    }),
  ]);
  if (!customer) throw customerNotFound();

  const cancelledIds = orders
    .filter((order) => order.status === OrderStatus.CANCELLED)
    .map((order) => order.id);
  const cancellations = await prisma.activityLog.findMany({
    where: {
      shopId,
      action: ActivityAction.ORDER_CANCEL,
      entityType: ActivityEntity.ORDER,
      entityId: { in: cancelledIds },
    },
    select: { entityId: true, createdAt: true },
  });
  const cancelledAt = new Map(cancellations.map((log) => [log.entityId, log.createdAt]));

  const entries: LedgerEntry[] = [
    ...orders.flatMap((order): LedgerEntry[] => {
      const unpaid = order.total.minus(order.paid);
      const base = {
        invoiceNumber: formatInvoiceNo(order.invoiceNo),
        total: formatMoney(order.total),
        paid: formatMoney(order.paid),
      };
      const sale: LedgerEntry = {
        ...base,
        id: order.id,
        type: "ORDER",
        createdAt: order.createdAt,
        change: unpaid,
        note: null,
      };
      // A cancelled order takes back what it added to the due, as its own entry at the time of cancelling
      if (order.status !== OrderStatus.CANCELLED) return [sale];
      return [
        sale,
        {
          ...base,
          id: `${order.id}:cancel`,
          type: "ORDER_CANCEL",
          createdAt: cancelledAt.get(order.id) ?? order.createdAt,
          change: unpaid.neg(),
          note: order.cancelReason,
        },
      ];
    }),
    ...payments.map((payment): LedgerEntry => {
      const { amount, note } = paymentLogDetailsSchema.parse(payment.details);
      return {
        id: payment.id,
        type: "PAYMENT",
        createdAt: payment.createdAt,
        invoiceNumber: null,
        total: null,
        paid: amount,
        change: new Prisma.Decimal(amount).neg(),
        note,
      };
    }),
  ];

  const { entries: page, meta } = paginateLedger(customer.due, entries, pagination);
  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      due: formatMoney(customer.due),
    },
    entries: page,
    meta,
  };
};
