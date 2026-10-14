import path from "node:path";
import nodemailer from "nodemailer";
import httpStatus from "http-status";
import { config } from "../config";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { buildPasswordResetEmail, LOGO_CONTENT_ID } from "./reset-password-email";

const SMTPS_PORT = 465;
const RESET_PASSWORD_PATH = "/reset-password";
const RESET_LINK_MINUTES = 15;
// Relative to the server root, where `npm run dev` and `npm start` both run
const LOGO_PATH = path.resolve(process.cwd(), "assets", "email-logo.png");

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === SMTPS_PORT,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

type PasswordResetEmail = { name: string; email: string; token: string };

export const sendPasswordResetEmail = async ({ name, email, token }: PasswordResetEmail) => {
  const resetUrl = new URL(RESET_PASSWORD_PATH, config.frontendUrl);
  resetUrl.searchParams.set("token", token);

  const { text, html } = buildPasswordResetEmail({
    name,
    resetUrl: resetUrl.toString(),
    validMinutes: RESET_LINK_MINUTES,
  });

  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: "Reset your Kaarbaar password",
    text,
    html,
    attachments: [{ filename: "kaarbaar-logo.png", path: LOGO_PATH, cid: LOGO_CONTENT_ID }],
  });
};

type InvoiceEmail = {
  to: string;
  customerName: string;
  shopName: string;
  invoiceNumber: string;
  fileName: string;
  pdf: Buffer;
};

// A failed send is reported to the caller: unlike a password reset, the owner is waiting on this one
export const sendInvoiceEmail = async ({
  to,
  customerName,
  shopName,
  invoiceNumber,
  fileName,
  pdf,
}: InvoiceEmail) => {
  const text = [
    `Hello ${customerName},`,
    "",
    `Please find your invoice ${invoiceNumber} from ${shopName} attached.`,
    "",
    `Thank you,`,
    shopName,
  ].join("\n");

  try {
    await transporter.sendMail({
      from: config.mailFrom,
      to,
      subject: `Invoice ${invoiceNumber} from ${shopName}`,
      text,
      attachments: [{ filename: fileName, content: pdf, contentType: "application/pdf" }],
    });
  } catch (error) {
    logger.error("Failed to send invoice email", error);
    throw new AppError(httpStatus.BAD_GATEWAY, "Could not send the email, please try again later");
  }
};
