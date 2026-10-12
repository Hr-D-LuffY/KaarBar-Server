import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import { config } from "./config";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { notFound } from "./middleware/notFound";
// import { generalRateLimiter } from "./middleware/rateLimiter";
import { AuthRoutes } from "./modules/auth/auth.route";
import { ShopRoutes } from "./modules/shop/shop.route";
import { UserRoutes } from "./modules/user/user.route";
import { sendSuccess } from "./utils/sendResponse";

// Render puts exactly one proxy in front of the app; locally there is none
const PRODUCTION_PROXY_HOPS = 1;

const app = express();

app.set("trust proxy", config.isProduction ? PRODUCTION_PROXY_HOPS : false);
app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(generalRateLimiter);

app.get("/health", (_req: Request, res: Response) => {
  sendSuccess(res, { message: "Kaarbaar server is running" });
});

app.get("/", (_req: Request, res: Response) => {
  sendSuccess(res, { message: "Welcome to Kaarbaar - paper and printing shop management" });
});

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/users", UserRoutes);
app.use("/api/v1/shop", ShopRoutes);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
