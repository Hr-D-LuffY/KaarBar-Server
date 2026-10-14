import { OrderStatus, Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ActivityAction, ActivityEntity } from "../../shared/activity-log.service";
import { paymentLogDetailsSchema } from "../../shared/payment.validation";
import { buildDateRange, toDhakaDate } from "../../utils/date-range";
import { formatMoney, MONEY_DECIMAL_PLACES, sumMoney, ZERO } from "../../utils/money";
import type {
  ReportRangeQuery,
  SalesReportQuery,
  TopProductsReportQuery,
} from "./report.validation";

const MONTH_KEY_LENGTH = "YYYY-MM".length;

type SalesBucket = {
  orderCount: number;
  total: Prisma.Decimal;
  discount: Prisma.Decimal;
  paid: Prisma.Decimal;
};

// Cancelled orders never count: their stock came back and their cash was refunded
const completedOrders = (shopId: string, range: ReportRangeQuery) => ({
  shopId,
  status: OrderStatus.COMPLETED,
  createdAt: buildDateRange(range),
});

export const getDashboard = async (shopId: string) => {
  const today = toDhakaDate(new Date());
  const todayRange = { from: today, to: today };

  const [sales, customerPayments, customerDue, vendorDue, lowStockCount] =
    await prisma.$transaction([
      prisma.order.aggregate({
        where: completedOrders(shopId, todayRange),
        _sum: { total: true, paid: true },
        _count: { _all: true },
      }),
      prisma.activityLog.findMany({
        where: {
          shopId,
          action: ActivityAction.CUSTOMER_PAYMENT,
          entityType: ActivityEntity.CUSTOMER,
          createdAt: buildDateRange(todayRange),
        },
        select: { details: true },
      }),
      prisma.customer.aggregate({ where: { shopId, due: { gt: 0 } }, _sum: { due: true } }),
      prisma.vendor.aggregate({ where: { shopId, due: { gt: 0 } }, _sum: { due: true } }),
      prisma.shopProduct.count({
        where: { shopId, deletedAt: null, stock: { lte: prisma.shopProduct.fields.lowStockLevel } },
      }),
    ]);

  const paidAtSale = sales._sum.paid ?? ZERO;
  const receivedPayments = sumMoney(
    customerPayments.map(
      ({ details }) => new Prisma.Decimal(paymentLogDetailsSchema.parse(details).amount),
    ),
  );

  return {
    date: today,
    todaySales: { orderCount: sales._count._all, total: formatMoney(sales._sum.total ?? ZERO) },
    cashIn: {
      paidAtSale: formatMoney(paidAtSale),
      customerPayments: formatMoney(receivedPayments),
      total: formatMoney(paidAtSale.plus(receivedPayments)),
    },
    totalCustomerDue: formatMoney(customerDue._sum.due ?? ZERO),
    totalVendorDue: formatMoney(vendorDue._sum.due ?? ZERO),
    lowStockCount,
  };
};

// Buckets use the Dhaka date, so an order at 11pm still lands on its own day
const periodOf = (createdAt: Date, groupBy: SalesReportQuery["groupBy"]) => {
  const date = toDhakaDate(createdAt);
  return groupBy === "month" ? date.slice(0, MONTH_KEY_LENGTH) : date;
};

export const getSalesReport = async (shopId: string, { groupBy, ...range }: SalesReportQuery) => {
  const orders = await prisma.order.findMany({
    where: completedOrders(shopId, range),
    select: { createdAt: true, total: true, discount: true, paid: true },
  });

  const buckets = new Map<string, SalesBucket>();
  for (const { createdAt, total, discount, paid } of orders) {
    const period = periodOf(createdAt, groupBy);
    const bucket = buckets.get(period) ?? {
      orderCount: 0,
      total: ZERO,
      discount: ZERO,
      paid: ZERO,
    };
    buckets.set(period, {
      orderCount: bucket.orderCount + 1,
      total: bucket.total.plus(total),
      discount: bucket.discount.plus(discount),
      paid: bucket.paid.plus(paid),
    });
  }

  const rows = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, bucket]) => ({
      period,
      orderCount: bucket.orderCount,
      total: formatMoney(bucket.total),
      discount: formatMoney(bucket.discount),
      paid: formatMoney(bucket.paid),
    }));

  return {
    groupBy,
    rows,
    summary: {
      orderCount: orders.length,
      total: formatMoney(sumMoney(orders.map((order) => order.total))),
      discount: formatMoney(sumMoney(orders.map((order) => order.discount))),
      paid: formatMoney(sumMoney(orders.map((order) => order.paid))),
    },
  };
};

export const getProfitReport = async (shopId: string, range: ReportRangeQuery) => {
  const where = completedOrders(shopId, range);

  const [revenue, items] = await prisma.$transaction([
    prisma.order.aggregate({ where, _sum: { total: true }, _count: { _all: true } }),
    prisma.orderItem.findMany({
      where: { order: where },
      select: { quantity: true, unitCost: true },
    }),
  ]);

  // Cost comes from the unit cost saved on each line at sale time, so old months never change
  const cost = sumMoney(
    items.map(({ quantity, unitCost }) =>
      unitCost.mul(quantity).toDecimalPlaces(MONEY_DECIMAL_PLACES),
    ),
  );
  const totalRevenue = revenue._sum.total ?? ZERO;

  return {
    orderCount: revenue._count._all,
    revenue: formatMoney(totalRevenue),
    cost: formatMoney(cost),
    profit: formatMoney(totalRevenue.minus(cost)),
  };
};

export const getTopProducts = async (
  shopId: string,
  { limit, by, ...range }: TopProductsReportQuery,
) => {
  const totals = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: completedOrders(shopId, range) },
    _sum: { quantity: true, lineTotal: true },
    orderBy: [
      by === "quantity" ? { _sum: { quantity: "desc" } } : { _sum: { lineTotal: "desc" } },
      { productId: "asc" },
    ],
    take: limit,
  });

  const products = await prisma.product.findMany({
    where: { id: { in: totals.map(({ productId }) => productId) } },
    select: {
      id: true,
      name: true,
      packName: true,
      packSize: true,
      category: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      type: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true, symbol: true, decimalPlaces: true } },
    },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  return {
    by,
    products: totals.flatMap(({ productId, _sum }) => {
      const product = productById.get(productId);
      if (!product) return [];
      // Revenue is the line total before any order-level discount
      return [
        {
          ...product,
          quantity: _sum.quantity ?? 0,
          revenue: formatMoney(_sum.lineTotal ?? ZERO),
        },
      ];
    }),
  };
};

type DuesParty = { id: string; name: string; phone: string; due: Prisma.Decimal };

const duesSelect = { id: true, name: true, phone: true, due: true } as const;
const LARGEST_DUE_FIRST: Prisma.CustomerOrderByWithRelationInput[] = [
  { due: "desc" },
  { name: "asc" },
];

const toDuesList = (parties: DuesParty[]) => ({
  totalDue: formatMoney(sumMoney(parties.map((party) => party.due))),
  parties: parties.map((party) => ({ ...party, due: formatMoney(party.due) })),
});

export const getDuesReport = async (shopId: string) => {
  const where = { shopId, deletedAt: null, due: { gt: 0 } };

  const [customers, vendors] = await prisma.$transaction([
    prisma.customer.findMany({ where, select: duesSelect, orderBy: LARGEST_DUE_FIRST }),
    prisma.vendor.findMany({ where, select: duesSelect, orderBy: LARGEST_DUE_FIRST }),
  ]);

  return { customers: toDuesList(customers), vendors: toDuesList(vendors) };
};
