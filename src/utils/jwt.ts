import jwt from "jsonwebtoken";
import { config } from "../config";

export const AUTH_COOKIE_NAME = "token";

const JWT_ALGORITHM = "HS256";
const SECONDS_PER_DAY = 24 * 60 * 60;
const MS_PER_SECOND = 1000;
const SESSION_DAYS = 1;
const REMEMBER_ME_DAYS = 7;
const PASSWORD_RESET_SECONDS = 15 * 60;
const PASSWORD_RESET_PURPOSE = "password-reset";

export const getSessionSeconds = (rememberMe: boolean) =>
  (rememberMe ? REMEMBER_ME_DAYS : SESSION_DAYS) * SECONDS_PER_DAY;

// clearCookie only matches the cookie when these options are identical to the ones it was set with
export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: config.isProduction,
  path: "/",
} as const;

export const authCookieMaxAge = (sessionSeconds: number) => sessionSeconds * MS_PER_SECOND;

export const signToken = (userId: string, expiresInSeconds: number) =>
  jwt.sign({ userId }, config.jwtSecret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: expiresInSeconds,
  });

// Returns the user id, or null when the token is expired, tampered with or malformed
export const verifyAuthToken = (token: string): string | null => {
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: [JWT_ALGORITHM] });
    if (typeof payload === "string" || typeof payload.userId !== "string") return null;
    return payload.userId;
  } catch {
    return null;
  }
};

// Signed with the user's current password hash mixed into the secret, so the link dies
// the moment the password changes and can only be used once
const resetSecret = (passwordHash: string) => `${config.jwtSecret}${passwordHash}`;

export const signPasswordResetToken = (userId: string, passwordHash: string) =>
  jwt.sign({ userId, purpose: PASSWORD_RESET_PURPOSE }, resetSecret(passwordHash), {
    algorithm: JWT_ALGORITHM,
    expiresIn: PASSWORD_RESET_SECONDS,
  });

// Unverified: only used to find which user's hash the signature must be checked against
export const readPasswordResetUserId = (token: string): string | null => {
  const payload = jwt.decode(token);
  if (!payload || typeof payload === "string" || typeof payload.userId !== "string") return null;
  return payload.userId;
};

export const isValidPasswordResetToken = (token: string, passwordHash: string) => {
  try {
    const payload = jwt.verify(token, resetSecret(passwordHash), { algorithms: [JWT_ALGORITHM] });
    return typeof payload !== "string" && payload.purpose === PASSWORD_RESET_PURPOSE;
  } catch {
    return false;
  }
};
