import type { NextFunction, Request, RequestHandler, Response } from "express";
import httpStatus from "http-status";
import type { z } from "zod";
import { AppError, type ErrorDetail } from "../utils/AppError";

type RequestParts = {
  body?: unknown;
  params?: unknown;
  query?: unknown;
};

const toErrorDetails = (issues: z.core.$ZodIssue[]): ErrorDetail[] =>
  issues.map((issue) => {
    const [part, ...field] = issue.path.map(String);
    return { field: field.join(".") || part || "request", message: issue.message };
  });

export const validate =
  (schema: z.ZodType<RequestParts>): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });

    if (!result.success) {
      next(
        new AppError(
          httpStatus.BAD_REQUEST,
          "Validation failed",
          toErrorDetails(result.error.issues),
        ),
      );
      return;
    }

    const { body, params, query } = result.data;
    if (body !== undefined) req.body = body;
    if (params !== undefined) req.params = params as Request["params"];
    // Express 5 exposes req.query as a read-only getter, so it has to be redefined
    if (query !== undefined) {
      Object.defineProperty(req, "query", { value: query, writable: true, configurable: true });
    }

    next();
  };
