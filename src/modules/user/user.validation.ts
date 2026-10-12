import { z } from "zod";

const PHONE_PATTERN = /^\+?\d{7,15}$/;

export const updateMeSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1, "Name cannot be empty").optional(),
      phone: z
        .string()
        .trim()
        .regex(PHONE_PATTERN, "Phone must be 7-15 digits, optionally starting with +")
        .optional(),
    })
    .refine((body) => body.name !== undefined || body.phone !== undefined, {
      message: "Provide at least one field to update",
    }),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>["body"];
