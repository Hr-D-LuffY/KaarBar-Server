import type { Prisma } from "../generated/prisma/client";
import {
  MONEY_DECIMAL_PLACES,
  splitProportionally,
  sumMoney,
  UNIT_COST_DECIMAL_PLACES,
  ZERO,
} from "../utils/money";

export type RestockLineInput = {
  quantity: number;
  buyPrice: Prisma.Decimal;
};

export type RestockLineCost = {
  lineCost: Prisma.Decimal;
  transportShare: Prisma.Decimal;
  landedUnitCost: Prisma.Decimal;
};

export type RestockCosts = {
  lines: RestockLineCost[];
  itemsTotal: Prisma.Decimal;
  total: Prisma.Decimal;
};

// Transport is shared across lines in proportion to line value; total includes transport
export const computeRestockCosts = (
  items: RestockLineInput[],
  transportCost: Prisma.Decimal,
): RestockCosts => {
  const lineCosts = items.map(({ quantity, buyPrice }) =>
    buyPrice.mul(quantity).toDecimalPlaces(MONEY_DECIMAL_PLACES),
  );
  const transportShares = splitProportionally(transportCost, lineCosts);

  const lines = items.map(({ quantity }, index) => {
    const lineCost = lineCosts[index] ?? ZERO;
    const transportShare = transportShares[index] ?? ZERO;
    return {
      lineCost,
      transportShare,
      landedUnitCost: lineCost
        .plus(transportShare)
        .div(quantity)
        .toDecimalPlaces(UNIT_COST_DECIMAL_PLACES),
    };
  });

  const itemsTotal = sumMoney(lineCosts);
  return { lines, itemsTotal, total: itemsTotal.plus(transportCost) };
};

export const computeWeightedAvgCost = (
  oldStock: number,
  oldAvgCost: Prisma.Decimal,
  addedQuantity: number,
  landedUnitCost: Prisma.Decimal,
) => {
  const newStock = oldStock + addedQuantity;
  if (newStock <= 0) return oldAvgCost;

  return oldAvgCost
    .mul(oldStock)
    .plus(landedUnitCost.mul(addedQuantity))
    .div(newStock)
    .toDecimalPlaces(UNIT_COST_DECIMAL_PLACES);
};

export const computeStockValue = (stock: number, avgCost: Prisma.Decimal) =>
  avgCost.mul(stock).toDecimalPlaces(MONEY_DECIMAL_PLACES);
