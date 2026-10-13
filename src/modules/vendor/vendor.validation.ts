import { z } from "zod";
import { moneySchema, positiveMoneySchema } from "../../utils/money";
import { paginationQuerySchema } from "../../utils/pagination";
import { searchQuerySchema } from "../../utils/search";
import { sortQuerySchema } from "../../utils/sort";

const MAX_VENDOR_NAME_LENGTH = 100;
const MAX_PAYMENT_NOTE_LENGTH = 200;
const PHONE_PATTERN = /^\+?\d{7,15}$/;
const VENDOR_SORT_FIELDS = ["name", "due", "createdAt"] as const;

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name cannot be empty")
  .max(MAX_VENDOR_NAME_LENGTH, `Name must be at most ${MAX_VENDOR_NAME_LENGTH} characters`);

const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_PATTERN, "Phone must be 7-15 digits, optionally starting with +");

const vendorIdParamsSchema = z.object({ id: z.uuid("Invalid vendor id") });

export const listVendorsSchema = z.object({
  query: z.object({
    ...paginationQuerySchema.shape,
    ...searchQuerySchema.shape,
    ...sortQuerySchema(VENDOR_SORT_FIELDS, "name", "asc").shape,
    hasDue: z.stringbool().optional(),
  }),
});

export const vendorIdSchema = z.object({ params: vendorIdParamsSchema });

export const vendorLedgerSchema = z.object({
  params: vendorIdParamsSchema,
  query: z.object(paginationQuerySchema.shape),
});

export const createVendorSchema = z.object({
  body: z.object({ name: nameSchema, phone: phoneSchema, due: moneySchema.optional() }),
});

export const updateVendorSchema = z.object({
  params: vendorIdParamsSchema,
  body: z
    .object({ name: nameSchema.optional(), phone: phoneSchema.optional() })
    .refine((body) => body.name !== undefined || body.phone !== undefined, {
      message: "Provide at least one field to update",
    }),
});

export const createVendorPaymentSchema = z.object({
  params: vendorIdParamsSchema,
  body: z.object({
    amount: positiveMoneySchema,
    note: z
      .string()
      .trim()
      .max(MAX_PAYMENT_NOTE_LENGTH, `Note must be at most ${MAX_PAYMENT_NOTE_LENGTH} characters`)
      .optional(),
  }),
});

export type ListVendorsQuery = z.infer<typeof listVendorsSchema>["query"];
export type ListVendorLedgerQuery = z.infer<typeof vendorLedgerSchema>["query"];
export type CreateVendorInput = z.infer<typeof createVendorSchema>["body"];
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>["body"];
export type CreateVendorPaymentInput = z.infer<typeof createVendorPaymentSchema>["body"];
