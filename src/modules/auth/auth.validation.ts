import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(1, "Email or phone is required"),
    password: z.string().min(1, "Password is required"),
    rememberMe: z.boolean().default(false),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>["body"];
