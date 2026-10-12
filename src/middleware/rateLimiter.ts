import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import httpStatus from "http-status";
import { AppError } from "../utils/AppError";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const GENERAL_MAX_REQUESTS = 350;
const EMAIL_MAX_REQUESTS = 5;

const createLimiter = (maxRequests: number, message: string, skipSuccessfulRequests = false) =>
  rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: maxRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (_req, _res, next) => {
      next(new AppError(httpStatus.TOO_MANY_REQUESTS, message));
    },
  });

export const generalRateLimiter: RequestHandler = createLimiter(
  GENERAL_MAX_REQUESTS,
  "Too many requests, please try again later",
);

// Only failed logins count, so the shop PC is not locked out by its own successful logins
export const loginRateLimiter: RequestHandler = createLimiter(
  LOGIN_MAX_ATTEMPTS,
  "Too many login attempts, please try again in 15 minutes",
  true,
);

export const emailRateLimiter: RequestHandler = createLimiter(
  EMAIL_MAX_REQUESTS,
  "Too many email requests, please try again in 15 minutes",
);
