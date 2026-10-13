import { z } from "zod";
import { Prisma } from "../generated/prisma/client";

export const MONEY_DECIMAL_PLACES = 2;
export const UNIT_COST_DECIMAL_PLACES = 4;
// Money columns are Decimal(12,2)
const MAX_MONEY = new Prisma.Decimal("9999999999.99");
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

export const ZERO = new Prisma.Decimal(0);

export const formatMoney = (amount: Prisma.Decimal) => amount.toFixed(MONEY_DECIMAL_PLACES);

// Accepts a number or a decimal string with at most 2 decimal places; parsed to Decimal so it is never a float downstream
export const moneySchema = z
  .union([z.number(), z.string()])
  .transform((value) => String(value).trim())
  .pipe(
    z
      .string()
      .regex(MONEY_PATTERN, "Amount must be a number with at most 2 decimal places, not negative"),
  )
  .transform((value) => new Prisma.Decimal(value))
  .refine((amount) => amount.lte(MAX_MONEY), "Amount is too large");

export const positiveMoneySchema = moneySchema.refine(
  (amount) => amount.gt(ZERO),
  "Amount must be greater than zero",
);

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
