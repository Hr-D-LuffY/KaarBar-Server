import { z } from "zod";
import { moneySchema } from "../../utils/money";
import { paginationQuerySchema } from "../../utils/pagination";
import { searchQuerySchema } from "../../utils/search";
import { sortQuerySchema } from "../../utils/sort";

const MAX_CUSTOMER_NAME_LENGTH = 100;
const MAX_ADDRESS_LENGTH = 255;
const PHONE_PATTERN = /^\+?\d{7,15}$/;
const CUSTOMER_SORT_FIELDS = ["name", "due", "createdAt"] as const;

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name cannot be empty")
  .max(MAX_CUSTOMER_NAME_LENGTH, `Name must be at most ${MAX_CUSTOMER_NAME_LENGTH} characters`);

const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_PATTERN, "Phone must be 7-15 digits, optionally starting with +");

const emailSchema = z.string().trim().pipe(z.email("Enter a valid email address"));

const addressSchema = z
  .string()
  .trim()
  .min(1, "Address cannot be empty")
  .max(MAX_ADDRESS_LENGTH, `Address must be at most ${MAX_ADDRESS_LENGTH} characters`);

const customerIdParamsSchema = z.object({ id: z.uuid("Invalid customer id") });

export const listCustomersSchema = z.object({
  query: z.object({
    ...paginationQuerySchema.shape,
    ...searchQuerySchema.shape,
    ...sortQuerySchema(CUSTOMER_SORT_FIELDS, "name", "asc").shape,
    hasDue: z.stringbool().optional(),
  }),
});

export const customerIdSchema = z.object({ params: customerIdParamsSchema });

export const createCustomerSchema = z.object({
  body: z.object({
    name: nameSchema,
    phone: phoneSchema,
    email: emailSchema.optional(),
    address: addressSchema,
    due: moneySchema.optional(),
  }),
});

export const updateCustomerSchema = z.object({
  params: customerIdParamsSchema,
  body: z
    .object({
      name: nameSchema.optional(),
      phone: phoneSchema.optional(),
      email: emailSchema.nullable().optional(),
      address: addressSchema.optional(),
    })
    .refine(
      (body) =>
        body.name !== undefined ||
        body.phone !== undefined ||
        body.email !== undefined ||
        body.address !== undefined,
      { message: "Provide at least one field to update" },
    ),
});

export type ListCustomersQuery = z.infer<typeof listCustomersSchema>["query"];
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>["body"];
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>["body"];
