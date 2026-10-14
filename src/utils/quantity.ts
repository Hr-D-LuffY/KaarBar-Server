import { z } from "zod";
import { Prisma } from "../generated/prisma/client";
import { UNIT_COST_DECIMAL_PLACES } from "./money";

// Stock is stored in an Int column, so one line stays well below its limit
const MAX_ITEM_QUANTITY = 1_000_000_000;
const DECIMAL_BASE = 10;
const TRAILING_RATE_ZEROS = /(\.\d{2}\d*?)0+$/; // keeps at least 2 decimals

export const itemQuantitySchema = z
  .number()
  .int("Quantity must be a whole number")
  .min(1, "Quantity must be at least 1")
  .max(MAX_ITEM_QUANTITY, "Quantity is too large");

const unitScale = (decimalPlaces: number) => DECIMAL_BASE ** decimalPlaces;

// 125 with 2 decimal places is shown as "1.25"
export const formatQuantity = (quantity: number, decimalPlaces: number) =>
  new Prisma.Decimal(quantity).div(unitScale(decimalPlaces)).toFixed(decimalPlaces);

// Prices are stored per smallest step; people read them per whole unit ("per lb", not "per 0.01 lb")
export const formatRatePerUnit = (unitPrice: Prisma.Decimal, decimalPlaces: number) =>
  unitPrice
    .mul(unitScale(decimalPlaces))
    .toFixed(UNIT_COST_DECIMAL_PLACES)
    .replace(TRAILING_RATE_ZEROS, "$1");
