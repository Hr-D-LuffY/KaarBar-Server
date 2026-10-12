import type { ErrorRequestHandler } from "express";
import httpStatus from "http-status";
import { config } from "../config";
import { Prisma } from "../generated/prisma/client";
import { AppError, type ErrorDetail } from "../utils/AppError";
import { logger } from "../utils/logger";
import { sendError } from "../utils/sendResponse";

const PRISMA_UNIQUE_VIOLATION = "P2002";
const PRISMA_RECORD_NOT_FOUND = "P2025";
const MIN_CLIENT_ERROR_STATUS = 400;
const MAX_CLIENT_ERROR_STATUS = 499;

type ResolvedError = {
  statusCode: number;
  message: string;
  errors?: ErrorDetail[];
};

const isClientHttpError = (error: unknown): error is Error & { status: number } =>
  error instanceof Error &&
  "status" in error &&
  typeof error.status === "number" &&
  error.status >= MIN_CLIENT_ERROR_STATUS &&
  error.status <= MAX_CLIENT_ERROR_STATUS;

const resolveError = (error: unknown): ResolvedError => {
  if (error instanceof AppError) {
    return { statusCode: error.statusCode, message: error.message, errors: error.errors };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === PRISMA_UNIQUE_VIOLATION) {
      return {
        statusCode: httpStatus.CONFLICT,
        message: "A record with this value already exists",
      };
    }
    if (error.code === PRISMA_RECORD_NOT_FOUND) {
      return { statusCode: httpStatus.NOT_FOUND, message: "Record not found" };
    }
  }

  // Malformed JSON and oversized bodies from express.json() carry their own 4xx status
  if (isClientHttpError(error)) {
    return { statusCode: error.status, message: "Invalid request" };
  }

  return { statusCode: httpStatus.INTERNAL_SERVER_ERROR, message: "Something went wrong" };
};

export const globalErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const { statusCode, message, errors } = resolveError(error);

  if (!config.isProduction || statusCode === httpStatus.INTERNAL_SERVER_ERROR) {
    logger.error(`${statusCode} ${message}`, error);
  }

  sendError(res, { statusCode, message, errors });
};
