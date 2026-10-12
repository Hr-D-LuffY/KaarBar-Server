import type { RequestHandler } from "express";
import httpStatus from "http-status";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "../utils/jwt";

// The user and shop are re-read on every request so a suspension takes effect immediately
export const verifyToken: RequestHandler = catchAsync(async (req, _res, next) => {
  const token: unknown = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== "string") {
    throw new AppError(httpStatus.UNAUTHORIZED, "Please log in to continue");
  }

  const userId = verifyAuthToken(token);
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Your session has expired, please log in again");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      shopId: true,
      isActive: true,
      shop: { select: { isActive: true } },
    },
  });

  if (!user?.isActive) {
    throw new AppError(httpStatus.UNAUTHORIZED, "This account is not active");
  }
  if (user.shop && !user.shop.isActive) {
    throw new AppError(httpStatus.UNAUTHORIZED, "This shop is suspended");
  }

  req.user = { userId: user.id, role: user.role, shopId: user.shopId };
  next();
});
