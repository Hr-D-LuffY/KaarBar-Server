import { z } from "zod";
import { dateRangeQuerySchema, startOfDhakaDay } from "../../utils/date-range";
import { positiveMoneySchema } from "../../utils/money";
import { paginationQuerySchema } from "../../utils/pagination";
import { searchQuerySchema } from "../../utils/search";
import { sortQuerySchema } from "../../utils/sort";

const MAX_STAFF_NAME_LENGTH = 100;
const MAX_DESIGNATION_LENGTH = 100;
const MAX_SALARY_NOTE_LENGTH = 200;
const PHONE_PATTERN = /^\+?\d{7,15}$/;
const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const STAFF_SORT_FIELDS = ["name", "monthlySalary", "joinedAt", "createdAt"] as const;

export const SALARY_PAYMENT_TYPES = [
  "SALARY",
  "ADVANCE",
  "BONUS",
  "OVERTIME",
  "DEDUCTION",
] as const;

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name cannot be empty")
  .max(MAX_STAFF_NAME_LENGTH, `Name must be at most ${MAX_STAFF_NAME_LENGTH} characters`);

const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_PATTERN, "Phone must be 7-15 digits, optionally starting with +");

const designationSchema = z
  .string()
  .trim()
  .min(1, "Designation cannot be empty")
  .max(MAX_DESIGNATION_LENGTH, `Designation must be at most ${MAX_DESIGNATION_LENGTH} characters`);

const joinedAtSchema = z.iso.date().transform(startOfDhakaDay);

const periodSchema = z
  .string()
  .trim()
  .regex(PERIOD_PATTERN, "Period must be YYYY-MM, for example 2026-10");

const paymentTypeSchema = z.enum(SALARY_PAYMENT_TYPES);

const staffIdParamsSchema = z.object({ id: z.uuid("Invalid staff id") });

export const listStaffSchema = z.object({
  query: z.object({
    ...paginationQuerySchema.shape,
    ...searchQuerySchema.shape,
    ...sortQuerySchema(STAFF_SORT_FIELDS, "name", "asc").shape,
  }),
});

export const staffIdSchema = z.object({ params: staffIdParamsSchema });

export const createStaffSchema = z.object({
  body: z.object({
    name: nameSchema,
    phone: phoneSchema,
    designation: designationSchema,
    monthlySalary: positiveMoneySchema,
    joinedAt: joinedAtSchema,
  }),
});

export const updateStaffSchema = z.object({
  params: staffIdParamsSchema,
  body: z
    .object({
      name: nameSchema.optional(),
      phone: phoneSchema.optional(),
      designation: designationSchema.optional(),
      monthlySalary: positiveMoneySchema.optional(),
      joinedAt: joinedAtSchema.optional(),
    })
    .refine((body) => Object.values(body).some((value) => value !== undefined), {
      message: "Provide at least one field to update",
    }),
});

export const createSalaryPaymentSchema = z.object({
  params: staffIdParamsSchema,
  body: z
    .object({
      type: paymentTypeSchema,
      amount: positiveMoneySchema.optional(),
      period: periodSchema.optional(),
      note: z
        .string()
        .trim()
        .max(MAX_SALARY_NOTE_LENGTH, `Note must be at most ${MAX_SALARY_NOTE_LENGTH} characters`)
        .optional(),
    })
    .superRefine((body, ctx) => {
      if (body.type !== "SALARY" && body.amount === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: "Amount is required unless the type is SALARY",
        });
      }
    }),
});

export const staffLedgerSchema = z.object({
  params: staffIdParamsSchema,
  query: z.object({
    ...paginationQuerySchema.shape,
    ...dateRangeQuerySchema.shape,
    type: paymentTypeSchema.optional(),
  }),
});

// The `details` of a SALARY_PAYMENT activity-log row
export const salaryLogDetailsSchema = z.object({
  type: paymentTypeSchema,
  amount: z.string(),
  period: z.string().nullable(),
  note: z.string().nullable(),
});

export type ListStaffQuery = z.infer<typeof listStaffSchema>["query"];
export type CreateStaffInput = z.infer<typeof createStaffSchema>["body"];
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>["body"];
export type CreateSalaryPaymentInput = z.infer<typeof createSalaryPaymentSchema>["body"];
export type StaffLedgerQuery = z.infer<typeof staffLedgerSchema>["query"];
