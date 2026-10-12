import jwt from "jsonwebtoken";
import { config } from "../config";

export const AUTH_COOKIE_NAME = "token";

const JWT_ALGORITHM = "HS256";

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
