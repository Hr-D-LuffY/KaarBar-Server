import nodemailer from "nodemailer";
import { config } from "../config";

const SMTPS_PORT = 465;
const RESET_PASSWORD_PATH = "/reset-password";
const RESET_LINK_MINUTES = 15;

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

  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: "Reset your Kaarbaar password",
    text: [
      `Hello ${name},`,
      "",
      `Use this link to set a new password. It expires in ${RESET_LINK_MINUTES} minutes and works once:`,
      resetUrl.toString(),
      "",
      "If you did not ask for this, you can ignore this email. Your password stays the same.",
    ].join("\n"),
  });
};
