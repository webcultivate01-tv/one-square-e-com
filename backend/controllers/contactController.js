import validator from "validator";
import { sendMail } from "../config/nodemailer.js";

/** Where storefront enquiries land. Falls back to the mailer's own inbox. */
const inbox = () => process.env.CONTACT_EMAIL || process.env.EMAIL_USER;

// POST /api/contact/send  (public)
export const sendContactMessage = async (req, res) => {
  try {
    const { name, email, phone = "", subject = "", message, productName = "" } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email and message are required." });
    }
    if (!validator.isEmail(String(email))) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const to = inbox();
    if (to) {
      const heading = productName ? `Product enquiry: ${productName}` : subject || "Website enquiry";
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;background:#f7f8fa;padding:32px">
          <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
            <div style="background:#264796;padding:20px 24px;color:#fff;font-weight:800;letter-spacing:1px">ONE SQUARE ASSOCIATES</div>
            <div style="padding:24px;color:#334155;font-size:14px;line-height:1.6">
              <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px">${heading}</h2>
              <p><b>Name:</b> ${String(name).trim()}</p>
              <p><b>Email:</b> ${String(email).trim()}</p>
              ${phone ? `<p><b>Phone:</b> ${String(phone).trim()}</p>` : ""}
              <p style="white-space:pre-wrap"><b>Message:</b><br/>${String(message).trim()}</p>
            </div>
          </div>
        </div>`;

      sendMail({
        to,
        subject: `[Website] ${heading}`,
        html,
        text: `${heading}\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\n\n${message}`,
      }).catch((e) => console.warn("[contact] send failed:", e.message));
    }

    return res.status(200).json({
      message: "Thanks for reaching out — our team will get back to you shortly.",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
