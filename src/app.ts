import cookieParser from "cookie-parser";
import express, { type Request, type Response } from "express";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { notFound } from "./middleware/notFound";
import { sendSuccess } from "./utils/sendResponse";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (_req: Request, res: Response) => {
  sendSuccess(res, { message: "Kaarbaar server is running" });
});

app.get("/", (_req: Request, res: Response) => {
  sendSuccess(res, { message: "Welcome to Kaarbaar - paper and printing shop management" });
});

app.use(notFound);
app.use(globalErrorHandler);

export default app;
