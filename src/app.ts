import express, { type Request, type Response } from "express";
import httpStatus from "http-status";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: "Kaarbaar server is running",
    data: {},
  });
});

app.get("/", (_req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: "Welcome to Kaarbaar - paper and printing shop management",
    data: {},
  });
});

export default app;
