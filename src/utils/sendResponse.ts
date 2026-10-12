import type { Response } from "express";
import httpStatus from "http-status";
import type { ErrorDetail } from "./AppError";

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type SuccessOptions<T> = {
  statusCode?: number;
  message: string;
  data?: T;
  meta?: PaginationMeta;
};

type ErrorOptions = {
  statusCode: number;
  message: string;
  errors?: ErrorDetail[];
};

export const sendSuccess = <T>(
  res: Response,
  { statusCode = httpStatus.OK, message, data, meta }: SuccessOptions<T>,
) => {
  res.status(statusCode).json({
    success: true,
    message,
    data: data ?? {},
    ...(meta && { meta }),
  });
};

export const sendError = (res: Response, { statusCode, message, errors }: ErrorOptions) => {
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
};
