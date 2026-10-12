import type { RequestHandler } from "express";
import httpStatus from "http-status";
import { prisma } from "../lib/prisma";
import { Role } from "../generated/prisma/client";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { getAuthUser } from "../utils/request-context";

const SHOP_ID_HEADER = "x-shop-id";

// shopId comes from the logged-in user; only SUPER_ADMIN may pick a shop, via X-Shop-Id
export const shopContext: RequestHandler = catchAsync(async (req, _res, next) => {
  const { role } = getAuthUser(req);

  if (role !== Role.SUPER_ADMIN) {
    if (!req.user?.shopId)
      throw new AppError(httpStatus.FORBIDDEN, "No shop is assigned to this account");
    req.shopId = req.user.shopId;
    next();
    return;
  }

  const requestedShopId = req.get(SHOP_ID_HEADER);
  if (!requestedShopId) {
    throw new AppError(httpStatus.BAD_REQUEST, "X-Shop-Id header is required");
  }

  const shop = await prisma.shop.findUnique({
    where: { id: requestedShopId },
    select: { id: true },
  });
  if (!shop) throw new AppError(httpStatus.NOT_FOUND, "Shop not found");

  req.shopId = shop.id;
  next();
});
