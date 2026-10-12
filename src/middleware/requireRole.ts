import type { RequestHandler } from "express";
import httpStatus from "http-status";
import type { Role } from "../generated/prisma/client";
import { AppError } from "../utils/AppError";
import { getAuthUser } from "../utils/request-context";

export const requireRole =
  (...allowedRoles: Role[]): RequestHandler =>
  (req, _res, next) => {
    const { role } = getAuthUser(req);
    if (!allowedRoles.includes(role)) {
      throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to do this");
    }
    next();
  };
