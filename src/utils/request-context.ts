import type { Request } from "express";
import httpStatus from "http-status";
import type { Role } from "../generated/prisma/client";
import { AppError } from "./AppError";

export type AuthUser = { userId: string; role: Role };
export type ShopContext = AuthUser & { shopId: string };

export const getAuthUser = (req: Request): AuthUser => {
  if (!req.user) throw new AppError(httpStatus.UNAUTHORIZED, "Please log in to continue");
  return { userId: req.user.userId, role: req.user.role };
};

export const getShopContext = (req: Request): ShopContext => {
  const user = getAuthUser(req);
  if (!req.shopId) throw new AppError(httpStatus.BAD_REQUEST, "No shop selected for this request");
  return { ...user, shopId: req.shopId };
};
