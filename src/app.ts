import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import { config } from "./config";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { notFound } from "./middleware/notFound";
// import { generalRateLimiter } from "./middleware/rateLimiter";
import { ActivityLogRoutes } from "./modules/activity-log/activity-log.route";
import { AuthRoutes } from "./modules/auth/auth.route";
import { CategoryRoutes } from "./modules/category/category.route";
import { CompanyRoutes } from "./modules/company/company.route";
import { CustomerRoutes } from "./modules/customer/customer.route";
import { InventoryRoutes } from "./modules/inventory/inventory.route";
import { NotificationRoutes } from "./modules/notification/notification.route";
import { OrderRoutes } from "./modules/order/order.route";
import { ProductRoutes } from "./modules/product/product.route";
import { ProductTypeRoutes } from "./modules/product-type/product-type.route";
import { RestockRoutes } from "./modules/restock/restock.route";
import { ShopRoutes } from "./modules/shop/shop.route";
import { UnitRoutes } from "./modules/unit/unit.route";
import { UserRoutes } from "./modules/user/user.route";
import { VendorRoutes } from "./modules/vendor/vendor.route";
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
app.use("/api/v1/categories", CategoryRoutes);
app.use("/api/v1/units", UnitRoutes);
app.use("/api/v1/companies", CompanyRoutes);
app.use("/api/v1/product-types", ProductTypeRoutes);
app.use("/api/v1/products", ProductRoutes);
app.use("/api/v1/vendors", VendorRoutes);
app.use("/api/v1/restocks", RestockRoutes);
app.use("/api/v1/inventory", InventoryRoutes);
app.use("/api/v1/customers", CustomerRoutes);
app.use("/api/v1/orders", OrderRoutes);
app.use("/api/v1/notifications", NotificationRoutes);
app.use("/api/v1/activity-logs", ActivityLogRoutes);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
