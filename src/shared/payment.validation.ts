import { z } from "zod";
import { positiveMoneySchema } from "../utils/money";

const MAX_PAYMENT_NOTE_LENGTH = 200;

// Customer and vendor payments take the same body
export const paymentBodySchema = z.object({
  amount: positiveMoneySchema,
  note: z
    .string()
    .trim()
    .max(MAX_PAYMENT_NOTE_LENGTH, `Note must be at most ${MAX_PAYMENT_NOTE_LENGTH} characters`)
    .optional(),
});
