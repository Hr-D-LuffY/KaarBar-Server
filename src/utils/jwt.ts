import jwt from "jsonwebtoken";
import { config } from "../config";

export const AUTH_COOKIE_NAME = "token";

const JWT_ALGORITHM = "HS256";
const SECONDS_PER_DAY = 24 * 60 * 60;
const MS_PER_SECOND = 1000;
const SESSION_DAYS = 1;
const REMEMBER_ME_DAYS = 7;

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
