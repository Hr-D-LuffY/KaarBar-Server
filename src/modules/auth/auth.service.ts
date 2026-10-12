import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { config } from "../../config";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { getSessionSeconds, signToken } from "../../utils/jwt";
import type { LoginInput } from "./auth.validation";

const INVALID_CREDENTIALS_MESSAGE = "Invalid email/phone or password";

// Compared against when no user matches, so a wrong identifier takes as long as a wrong password
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("kaarbaar-dummy-password", config.bcryptSaltRounds);

const authUserSelect = {
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
