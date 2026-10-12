import { catchAsync } from "../../utils/catchAsync";
import { AUTH_COOKIE_NAME, authCookieMaxAge, authCookieOptions } from "../../utils/jwt";
import { getAuthUser } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as authService from "./auth.service";
import type { LoginInput } from "./auth.validation";

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
