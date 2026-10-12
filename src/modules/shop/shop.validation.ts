import { z } from "zod";

const MAX_SHOP_NAME_LENGTH = 100;
const MAX_ADDRESS_LENGTH = 255;
const SHOP_PHONE_PATTERN = /^\+?[\d\s-]{5,20}$/;

export const updateShopSchema = z.object({
  body: z
    .object({
      shopName: z
        .string()
        .trim()
        .min(1, "Shop name cannot be empty")
        .max(MAX_SHOP_NAME_LENGTH, `Shop name must be at most ${MAX_SHOP_NAME_LENGTH} characters`)
        .optional(),
      phone: z
        .string()
        .trim()
        .regex(
          SHOP_PHONE_PATTERN,
          "Phone must be 5-20 digits, spaces or dashes, optionally starting with +",
        )
        .optional(),
      address: z
        .string()
        .trim()
        .min(1, "Address cannot be empty")
        .max(MAX_ADDRESS_LENGTH, `Address must be at most ${MAX_ADDRESS_LENGTH} characters`)
        .optional(),
    })
    .refine(
      (body) =>
        body.shopName !== undefined || body.phone !== undefined || body.address !== undefined,
      { message: "Provide at least one field to update" },
    ),
});

export type UpdateShopInput = z.infer<typeof updateShopSchema>["body"];
