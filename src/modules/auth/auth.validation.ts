import { z } from "zod";

const MIN_PASSWORD_LENGTH = 8;
// bcrypt ignores everything past 72 bytes
const MAX_PASSWORD_LENGTH = 72;

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(1, "Email or phone is required"),
    password: z.string().min(1, "Password is required"),
    rememberMe: z.boolean().default(false),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>["body"];

const newPasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`);

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: newPasswordSchema,
    })
    .refine((body) => body.newPassword !== body.currentPassword, {
      path: ["newPassword"],
      message: "New password must be different from the current password",
    }),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>["body"];

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().pipe(z.email("Enter a valid email address")),
  }),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>["body"];

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: newPasswordSchema,
  }),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>["body"];
