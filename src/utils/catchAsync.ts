import type { NextFunction, Request, RequestHandler, Response } from "express";

export const catchAsync =
  (handler: RequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
