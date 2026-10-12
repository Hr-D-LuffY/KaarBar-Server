import { sendPasswordResetEmail } from "../../lib/mailer";
import { catchAsync } from "../../utils/catchAsync";
import { AUTH_COOKIE_NAME, authCookieMaxAge, authCookieOptions } from "../../utils/jwt";
import { getAuthUser } from "../../utils/request-context";
import { logger } from "../../utils/logger";
import { sendSuccess } from "../../utils/sendResponse";
import * as authService from "./auth.service";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
} from "./auth.validation";

export const login = catchAsync(async (req, res) => {
  const { token, sessionSeconds, user } = await authService.login(req.body as LoginInput);

  res.cookie(AUTH_COOKIE_NAME, token, {
    ...authCookieOptions,
    maxAge: authCookieMaxAge(sessionSeconds),
  });
  sendSuccess(res, { message: "Logged in successfully", data: { user } });
});

export const logout = catchAsync(async (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
  sendSuccess(res, { message: "Logged out successfully" });
});

export const me = catchAsync(async (req, res) => {
  const { userId } = getAuthUser(req);
  const user = await authService.getCurrentUser(userId);
  sendSuccess(res, { message: "Current user fetched successfully", data: { user } });
});

export const changePassword = catchAsync(async (req, res) => {
  const { userId } = getAuthUser(req);
  await authService.changePassword(userId, req.body as ChangePasswordInput);
  sendSuccess(res, { message: "Password changed successfully" });
});

const FORGOT_PASSWORD_MESSAGE = "If an account exists for this email, a reset link has been sent";

export const forgotPassword = catchAsync(async (req, res) => {
  const reset = await authService.createPasswordResetToken(req.body as ForgotPasswordInput);

  // Not awaited: the response time must not reveal whether the email has an account
  if (reset) {
    sendPasswordResetEmail(reset).catch((error: unknown) => {
      logger.error("Failed to send password reset email", error);
    });
  }
  sendSuccess(res, { message: FORGOT_PASSWORD_MESSAGE });
});

export const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body as ResetPasswordInput);
  sendSuccess(res, { message: "Password reset successfully, please log in" });
});
