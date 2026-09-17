import nodemailer from "nodemailer";

let transporter = null;

const isMailConfigured = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

/** Lazily created — the app must boot fine with no mail credentials. */
const getTransporter = () => {
  if (!isMailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return transporter;
};

export const verifyMailer = async () => {
  const t = getTransporter();
  if (!t) {
    console.log("[mail] EMAIL_USER/EMAIL_PASS not set — email features are disabled.");
    return false;
  }
  try {
    await t.verify();
    console.log("[mail] transport ready");
    return true;
  } catch (error) {
    console.warn("[mail] transport verification failed:", error.message);
    return false;
  }
};

const FROM = () => `"GOBOXLY" <${process.env.EMAIL_USER}>`;

/** Resolves `{ sent: false }` instead of throwing — callers are fire-and-forget. */
export const sendMail = async ({ to, subject, html, text, attachments }) => {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "mail-not-configured" };
  try {
    const info = await t.sendMail({ from: FROM(), to, subject, html, text, attachments });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.warn(`[mail] send to ${to} failed:`, error.message);
    return { sent: false, reason: error.message };
  }
};

const shell = (title, body) => `
<div style="font-family:Inter,Arial,sans-serif;background:#f7f8fa;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:#0f172a;padding:20px 24px;color:#fff;font-weight:800;letter-spacing:2px">GOBOXLY</div>
    <div style="padding:24px;color:#334155;font-size:14px;line-height:1.6">
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px">${title}</h2>
      ${body}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">
      This is an automated message from the GOBOXLY console.
    </div>
  </div>
</div>`;

export const sendOtpMail = (to, otp) =>
  sendMail({
    to,
    subject: "Your GOBOXLY verification code",
    html: shell(
      "Verification code",
      `<p>Use the code below to continue. It expires in 10 minutes.</p>
       <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#2563eb">${otp}</p>`
    ),
  });

export const sendWelcomeMail = (to, name) =>
  sendMail({
    to,
    subject: "Welcome to GOBOXLY",
    html: shell("Welcome aboard", `<p>Hi ${name || "there"}, your account is ready.</p>`),
  });

export const sendAdminInviteMail = (to, { name, email, password }) =>
  sendMail({
    to,
    subject: "Your GOBOXLY admin account",
    html: shell(
      "Admin access granted",
      `<p>Hi ${name || "there"}, an administrator created a console account for you.</p>
       <p><b>Email:</b> ${email}<br/><b>Temporary password:</b> ${password}</p>
       <p>You will be asked to choose a new password on first sign-in.</p>`
    ),
  });

export const sendCustomMail = (to, subject, body) =>
  sendMail({
    to,
    subject,
    html: shell(subject, `<p>${String(body || "").replace(/\n/g, "<br/>")}</p>`),
  });

export const sendRefundMail = (to, { orderId, amount, currency = "USD" }) =>
  sendMail({
    to,
    subject: `Refund issued for order ${orderId}`,
    html: shell(
      "Refund issued",
      `<p>We've refunded <b>${currency} ${Number(amount).toFixed(2)}</b> for order <b>${orderId}</b>.
       It should appear on your statement within 5–10 business days.</p>`
    ),
  });
