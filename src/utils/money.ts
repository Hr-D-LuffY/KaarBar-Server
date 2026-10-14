import { z } from "zod";
import { Prisma } from "../generated/prisma/client";

export const MONEY_DECIMAL_PLACES = 2;
export const UNIT_COST_DECIMAL_PLACES = 4;
// Money columns are Decimal(12,2), per-unit costs Decimal(12,4)
export const MAX_MONEY = new Prisma.Decimal("9999999999.99");
const MAX_UNIT_COST = new Prisma.Decimal("99999999.9999");

export const ZERO = new Prisma.Decimal(0);

export const formatMoney = (amount: Prisma.Decimal) => amount.toFixed(MONEY_DECIMAL_PLACES);
export const formatUnitCost = (cost: Prisma.Decimal) => cost.toFixed(UNIT_COST_DECIMAL_PLACES);

// Accepts a number or a decimal string; parsed to Decimal so it is never a float downstream
const decimalSchema = (decimalPlaces: number, max: Prisma.Decimal) =>
  z
    .union([z.number(), z.string()])
    .transform((value) => String(value).trim())
    .pipe(
      z
        .string()
        .regex(
          new RegExp(`^\\d+(\\.\\d{1,${decimalPlaces}})?$`),
          `Amount must be a number with at most ${decimalPlaces} decimal places, not negative`,
        ),
    )
    .transform((value) => new Prisma.Decimal(value))
    .refine((amount) => amount.lte(max), "Amount is too large");

export const moneySchema = decimalSchema(MONEY_DECIMAL_PLACES, MAX_MONEY);
export const unitCostSchema = decimalSchema(UNIT_COST_DECIMAL_PLACES, MAX_UNIT_COST);

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
