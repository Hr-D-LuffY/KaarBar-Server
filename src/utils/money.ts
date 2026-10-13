import { Prisma } from "../generated/prisma/client";

export const MONEY_DECIMAL_PLACES = 2;
export const UNIT_COST_DECIMAL_PLACES = 4;

export const ZERO = new Prisma.Decimal(0);

export const sumMoney = (amounts: Prisma.Decimal[]) =>
  amounts.reduce((sum, amount) => sum.plus(amount), ZERO);

// Shares are rounded to money precision and the rounding remainder goes to the last one, so they always add up to total
export const splitProportionally = (total: Prisma.Decimal, weights: Prisma.Decimal[]) => {
  if (weights.length === 0) return [];

  const weightSum = sumMoney(weights);
  const shares = weights.map((weight) =>
    weightSum.isZero()
      ? total.div(weights.length).toDecimalPlaces(MONEY_DECIMAL_PLACES)
      : total.mul(weight).div(weightSum).toDecimalPlaces(MONEY_DECIMAL_PLACES),
  );

  const lastIndex = shares.length - 1;
  const allocatedBeforeLast = sumMoney(shares.slice(0, lastIndex));
  shares[lastIndex] = total.minus(allocatedBeforeLast);
  return shares;
};
