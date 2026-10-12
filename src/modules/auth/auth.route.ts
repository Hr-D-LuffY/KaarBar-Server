import { Router } from "express";
import { loginRateLimiter } from "../../middleware/rateLimiter";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as authController from "./auth.controller";
import { loginSchema } from "./auth.validation";

const router = Router();

router.post("/login", loginRateLimiter, validate(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.get("/me", verifyToken, authController.me);

export const AuthRoutes = router;
