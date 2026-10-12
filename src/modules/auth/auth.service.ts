import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { config } from "../../config";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  getSessionSeconds,
  isValidPasswordResetToken,
  readPasswordResetUserId,
  signPasswordResetToken,
  signToken,
} from "../../utils/jwt";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
} from "./auth.validation";

const INVALID_RESET_TOKEN_MESSAGE = "This reset link is invalid or has expired";
const INVALID_CREDENTIALS_MESSAGE = "Invalid email/phone or password";

// Compared against when no user matches, so a wrong identifier takes as long as a wrong password
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("kaarbaar-dummy-password", config.bcryptSaltRounds);

export const authUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  photoUrl: true,
  shopId: true,
  shop: { select: { id: true, shopName: true } },
} as const;

export const login = async ({ identifier, password, rememberMe }: LoginInput) => {
  const found = await prisma.user.findFirst({
    where: { OR: [{ email: { equals: identifier, mode: "insensitive" } }, { phone: identifier }] },
    select: {
      ...authUserSelect,
      passwordHash: true,
      isActive: true,
      shop: { select: { id: true, shopName: true, isActive: true } },
    },
  });

  const passwordMatches = await bcrypt.compare(
    password,
    found?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  if (!found || !passwordMatches) {
    throw new AppError(httpStatus.UNAUTHORIZED, INVALID_CREDENTIALS_MESSAGE);
  }

  const { passwordHash: _passwordHash, isActive, shop, ...user } = found;
  if (!isActive) throw new AppError(httpStatus.UNAUTHORIZED, "This account is not active");
  if (shop && !shop.isActive) throw new AppError(httpStatus.UNAUTHORIZED, "This shop is suspended");

  const sessionSeconds = getSessionSeconds(rememberMe);
  return {
    token: signToken(user.id, sessionSeconds),
    sessionSeconds,
    user: { ...user, shop: shop && { id: shop.id, shopName: shop.shopName } },
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: authUserSelect });
  if (!user) throw new AppError(httpStatus.UNAUTHORIZED, "This account is not active");
  return user;
};

export const changePassword = async (
  userId: string,
  { currentPassword, newPassword }: ChangePasswordInput,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw new AppError(httpStatus.UNAUTHORIZED, "This account is not active");

  const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!currentMatches) {
    throw new AppError(httpStatus.BAD_REQUEST, "Current password is incorrect", [
      { field: "currentPassword", message: "Current password is incorrect" },
    ]);
  }

  const passwordHash = await bcrypt.hash(newPassword, config.bcryptSaltRounds);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
};

// Returns null for unknown or inactive accounts so the caller can answer identically either way
export const createPasswordResetToken = async ({ email }: ForgotPasswordInput) => {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      isActive: true,
      shop: { select: { isActive: true } },
    },
  });
  if (!user?.isActive || (user.shop && !user.shop.isActive)) return null;

  return {
    name: user.name,
    email: user.email,
    token: signPasswordResetToken(user.id, user.passwordHash),
  };
};

export const resetPassword = async ({ token, newPassword }: ResetPasswordInput) => {
  const userId = readPasswordResetUserId(token);
  if (!userId) throw new AppError(httpStatus.BAD_REQUEST, INVALID_RESET_TOKEN_MESSAGE);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, isActive: true, shop: { select: { isActive: true } } },
  });
  const canReset = user?.isActive && (!user.shop || user.shop.isActive);
  if (!user || !canReset || !isValidPasswordResetToken(token, user.passwordHash)) {
    throw new AppError(httpStatus.BAD_REQUEST, INVALID_RESET_TOKEN_MESSAGE);
  }

  const passwordHash = await bcrypt.hash(newPassword, config.bcryptSaltRounds);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
};
