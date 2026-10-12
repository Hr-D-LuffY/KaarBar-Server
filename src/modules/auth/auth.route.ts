import { Router } from "express";
import { emailRateLimiter, loginRateLimiter } from "../../middleware/rateLimiter";
import { validate } from "../../middleware/validate";
import { verifyToken } from "../../middleware/verifyToken";
import * as authController from "./auth.controller";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "./auth.validation";

const router = Router();

router.post("/login", loginRateLimiter, validate(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.get("/me", verifyToken, authController.me);
router.patch(
  "/change-password",
  verifyToken,
  loginRateLimiter,
  validate(changePasswordSchema),
  authController.changePassword,
);
router.post(
  "/forgot-password",
  emailRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  loginRateLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

export const AuthRoutes = router;
