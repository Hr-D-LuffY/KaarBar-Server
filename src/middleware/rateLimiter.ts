import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import httpStatus from "http-status";
import { AppError } from "../utils/AppError";

const MS_PER_MINUTE = 60 * 1000;
const DEFAULT_WINDOW_MINUTES = 15;
const LOGIN_MAX_ATTEMPTS = 10;
const GENERAL_MAX_REQUESTS = 350;
const EMAIL_MAX_REQUESTS = 5;
const INVOICE_EMAIL_MAX_REQUESTS = 10;
const INVOICE_EMAIL_WINDOW_MINUTES = 20;

type LimiterOptions = {
  maxRequests: number;
  message: string;
  windowMinutes?: number;
  skipSuccessfulRequests?: boolean;
};

const createLimiter = ({
  maxRequests,
  message,
  windowMinutes = DEFAULT_WINDOW_MINUTES,
  skipSuccessfulRequests = false,
}: LimiterOptions) =>
  rateLimit({
    windowMs: windowMinutes * MS_PER_MINUTE,
    limit: maxRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (_req, _res, next) => {
      next(new AppError(httpStatus.TOO_MANY_REQUESTS, message));
    },
  });

export const generalRateLimiter: RequestHandler = createLimiter({
  maxRequests: GENERAL_MAX_REQUESTS,
  message: "Too many requests, please try again later",
});

// Only failed logins count, so the shop PC is not locked out by its own successful logins
export const loginRateLimiter: RequestHandler = createLimiter({
  maxRequests: LOGIN_MAX_ATTEMPTS,
  message: "Too many login attempts, please try again in 15 minutes",
  skipSuccessfulRequests: true,
});

export const emailRateLimiter: RequestHandler = createLimiter({
  maxRequests: EMAIL_MAX_REQUESTS,
  message: "Too many email requests, please try again in 15 minutes",
});

// Its own counter, so password-reset emails and invoice emails never block each other
export const invoiceEmailRateLimiter: RequestHandler = createLimiter({
  maxRequests: INVOICE_EMAIL_MAX_REQUESTS,
  windowMinutes: INVOICE_EMAIL_WINDOW_MINUTES,
  message: "Too many invoice emails sent, please try again in 20 minutes",
});
