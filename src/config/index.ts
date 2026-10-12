import "dotenv/config";
import { z } from "zod";

const PLACEHOLDER_SECRET_MARKER = "change-me";
const MIN_JWT_SECRET_LENGTH = 32;

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]),
    PORT: z.coerce.number().int().positive(),
    DATABASE_URL: z.url(),
    JWT_SECRET: z.string().min(MIN_JWT_SECRET_LENGTH),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15),
    FRONTEND_URL: z.url(),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),
    MAIL_FROM: z.string().min(1),
    REDIS_URL: z.url().optional(),
    SEED_SUPER_ADMIN_EMAIL: z.email().optional(),
    SEED_SUPER_ADMIN_PASSWORD: z.string().min(8).optional(),
    SEED_OWNER_EMAIL: z.email().optional(),
    SEED_OWNER_PASSWORD: z.string().min(8).optional(),
    SEED_SUPER_ADMIN_NAME: z.string().min(1).optional(),
    SEED_OWNER_NAME: z.string().min(1).optional(),
    SEED_OWNER_PHONE: z.string().min(1).optional(),
    SEED_SHOP_NAME: z.string().min(1).optional(),
    SEED_SHOP_PHONE: z.string().min(1).optional(),
    SEED_SHOP_ADDRESS: z.string().min(1).optional(),
  })
  .refine(
    (env) => env.NODE_ENV !== "production" || !env.JWT_SECRET.includes(PLACEHOLDER_SECRET_MARKER),
    { path: ["JWT_SECRET"], message: "Placeholder secret is not allowed in production" },
  );

const definedEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ""),
);

const parsed = envSchema.safeParse(definedEnv);

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET,
  bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
  frontendUrl: env.FRONTEND_URL,
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  mailFrom: env.MAIL_FROM,
  redisUrl: env.REDIS_URL,
  seed: {
    superAdminEmail: env.SEED_SUPER_ADMIN_EMAIL,
    superAdminPassword: env.SEED_SUPER_ADMIN_PASSWORD,
    superAdminName: env.SEED_SUPER_ADMIN_NAME,
    ownerEmail: env.SEED_OWNER_EMAIL,
    ownerPassword: env.SEED_OWNER_PASSWORD,
    ownerName: env.SEED_OWNER_NAME,
    ownerPhone: env.SEED_OWNER_PHONE,
    shopName: env.SEED_SHOP_NAME,
    shopPhone: env.SEED_SHOP_PHONE,
    shopAddress: env.SEED_SHOP_ADDRESS,
  },
};
