import { z } from "zod";

const sortOrderSchema = z.enum(["asc", "desc"]);

export type SortOrder = z.infer<typeof sortOrderSchema>;

// Only the listed fields can be sorted on; anything else fails validation with a 400
export const sortQuerySchema = <const Field extends readonly [string, ...string[]]>(
  allowedFields: Field,
  defaultField: Field[number],
  defaultOrder: SortOrder = "desc",
) =>
  z.object({
    sortBy: z.enum(allowedFields).default(defaultField),
    sortOrder: sortOrderSchema.default(defaultOrder),
  });

export const buildOrderBy = <Field extends string>(
  sortBy: Field,
  sortOrder: SortOrder,
): Partial<Record<Field, SortOrder>> =>
  ({ [sortBy]: sortOrder }) as Partial<Record<Field, SortOrder>>;
