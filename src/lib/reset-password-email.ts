export const LOGO_CONTENT_ID = "kaarbar-logo";

const FONT_STACK = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO_STACK = "Consolas,'Courier New',monospace";
const LOGO_WIDTH_PX = 220;

// Brand teal and grey come from the logo; the button teal is darkened so white text stays readable
const COLOR = {
  brand: "#299e98",
  button: "#1d7f7a",
  ink: "#2b3038",
  body: "#3f4650",
  muted: "#6b7480",
  line: "#e3e7ea",
  panel: "#f3f6f6",
  page: "#eef2f2",
  card: "#ffffff",
} as const;

type PasswordResetEmailInput = { name: string; resetUrl: string; validMinutes: number };

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);

export const buildPasswordResetEmail = ({
  name,
  resetUrl,
  validMinutes,
}: PasswordResetEmailInput) => {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);

  const text = [
    `Hello ${name},`,
    "",
    "We received a request to reset the password for your Kaarbaar account.",
    `Use this link to choose a new one. It expires in ${validMinutes} minutes and works once:`,
    "",
    resetUrl,
    "",
    "If you did not ask for this, you can ignore this email. Your password stays the same.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Reset your Kaarbaar password</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Use this link to choose a new password. It expires in ${validMinutes} minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.page};">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${COLOR.card};border-radius:8px;overflow:hidden;">
      <tr><td height="6" style="height:6px;background:${COLOR.brand};font-size:0;line-height:0;">&nbsp;</td></tr>

      <tr><td align="center" style="padding:32px 40px 0 40px;">
        <img src="cid:${LOGO_CONTENT_ID}" width="${LOGO_WIDTH_PX}" alt="Kaarbaar" style="display:block;width:${LOGO_WIDTH_PX}px;max-width:100%;height:auto;border:0;">
      </td></tr>

      <tr><td style="padding:28px 40px 0 40px;font-family:${FONT_STACK};">
        <h1 style="margin:0;font-size:26px;line-height:32px;font-weight:700;color:${COLOR.ink};">Reset your password</h1>
        <p style="margin:16px 0 0;font-size:15px;line-height:24px;color:${COLOR.body};">Hello ${safeName},</p>
        <p style="margin:12px 0 0;font-size:15px;line-height:24px;color:${COLOR.body};">We received a request to reset the password for your Kaarbaar account. Select the button below to choose a new one.</p>
      </td></tr>

      <tr><td style="padding:26px 40px 0 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" bgcolor="${COLOR.button}" style="border-radius:6px;">
            <a href="${safeUrl}" style="display:inline-block;padding:14px 30px;font-family:${FONT_STACK};font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Reset password</a>
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:22px 40px 0 40px;font-family:${FONT_STACK};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.panel};border-radius:6px;">
          <tr><td style="padding:12px 16px;font-size:13px;line-height:20px;color:${COLOR.body};">
            <strong style="color:${COLOR.ink};">This link expires in ${validMinutes} minutes</strong> and can be used once. After that, ask for a new one from the login page.
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:22px 40px 0 40px;font-family:${FONT_STACK};">
        <p style="margin:0;font-size:12px;line-height:19px;color:${COLOR.muted};">Button not working? Copy this link into your browser:</p>
        <p style="margin:6px 0 0;font-family:${MONO_STACK};font-size:12px;line-height:18px;color:${COLOR.button};word-break:break-all;">${safeUrl}</p>
      </td></tr>

      <tr><td style="padding:28px 40px 0 40px;"><div style="border-top:1px solid ${COLOR.line};font-size:0;line-height:0;">&nbsp;</div></td></tr>

      <tr><td style="padding:20px 40px 32px 40px;font-family:${FONT_STACK};">
        <p style="margin:0;font-size:13px;line-height:20px;color:${COLOR.body};"><strong style="color:${COLOR.ink};">Did not ask for this?</strong> You can ignore this email. Your password stays the same and nobody can use this link unless they have it.</p>
      </td></tr>

      <tr><td style="padding:18px 40px;background:${COLOR.panel};font-family:${FONT_STACK};">
        <p style="margin:0;font-size:12px;line-height:18px;color:${COLOR.muted};">Sent by Kaarbaar because a password reset was requested for the account linked to this email address. This is an automated message, please do not reply.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { text, html };
};
