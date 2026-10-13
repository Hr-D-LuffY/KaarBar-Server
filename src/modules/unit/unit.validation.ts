import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { searchQuerySchema } from "../../utils/search";
import { sortQuerySchema } from "../../utils/sort";

const MAX_UNIT_NAME_LENGTH = 50;
const MAX_UNIT_SYMBOL_LENGTH = 10;
// Stored stock is an Int, so more than 3 decimal places would overflow it on large quantities
const MAX_DECIMAL_PLACES = 3;
const UNIT_SORT_FIELDS = ["name", "createdAt"] as const;

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name cannot be empty")
  .max(MAX_UNIT_NAME_LENGTH, `Name must be at most ${MAX_UNIT_NAME_LENGTH} characters`);

const symbolSchema = z
  .string()
  .trim()
  .min(1, "Symbol cannot be empty")
  .max(MAX_UNIT_SYMBOL_LENGTH, `Symbol must be at most ${MAX_UNIT_SYMBOL_LENGTH} characters`);

const decimalPlacesSchema = z
  .number()
  .int("Decimal places must be a whole number")
  .min(0, "Decimal places cannot be negative")
  .max(MAX_DECIMAL_PLACES, `Decimal places must be at most ${MAX_DECIMAL_PLACES}`);

const unitIdParamsSchema = z.object({ id: z.uuid("Invalid unit id") });

export const listUnitsSchema = z.object({
  query: z.object({
    ...paginationQuerySchema.shape,
    ...searchQuerySchema.shape,
    ...sortQuerySchema(UNIT_SORT_FIELDS, "name", "asc").shape,
  }),
});

export const createUnitSchema = z.object({
  body: z.object({
    name: nameSchema,
    symbol: symbolSchema,
    decimalPlaces: decimalPlacesSchema,
  }),
});

export const updateUnitSchema = z.object({
  params: unitIdParamsSchema,
  body: z
    .object({
      name: nameSchema.optional(),
      symbol: symbolSchema.optional(),
      decimalPlaces: decimalPlacesSchema.optional(),
    })
    .refine(
      (body) =>
        body.name !== undefined || body.symbol !== undefined || body.decimalPlaces !== undefined,
      { message: "Provide at least one field to update" },
    ),
});

export const deleteUnitSchema = z.object({ params: unitIdParamsSchema });

export type ListUnitsQuery = z.infer<typeof listUnitsSchema>["query"];
export type CreateUnitInput = z.infer<typeof createUnitSchema>["body"];
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>["body"];
