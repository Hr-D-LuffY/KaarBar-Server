import { z } from "zod";

// Stock is stored in an Int column, so one line stays well below its limit
const MAX_ITEM_QUANTITY = 1_000_000_000;

export const itemQuantitySchema = z
  .number()
  .int("Quantity must be a whole number")
  .min(1, "Quantity must be at least 1")
  .max(MAX_ITEM_QUANTITY, "Quantity is too large");
