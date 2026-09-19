import { Op } from "sequelize";
import validator from "validator";
import Enquiry, { ENQUIRY_STATUSES } from "../model/enquiryModel.js";
import { sendMail } from "../config/nodemailer.js";
import { isFilterActive, isValidId, likeTerm, parsePaging } from "../utils/helpers.js";

/** Where storefront enquiries land. Falls back to the mailer's own inbox. */
const inbox = () => process.env.CONTACT_EMAIL || process.env.EMAIL_USER;

const toEnquiryDTO = (e) => {
  if (!e) return null;
  const o = typeof e.toJSON === "function" ? e.toJSON() : e;
  return {
    _id: o.id,
    name: o.name,
    email: o.email,
    phone: o.phone,
    subject: o.subject,
    message: o.message || "",
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

// POST /api/contact/send  (public)
export const sendContactMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message = "", productName = "" } = req.body || {};

    if (!name || !email || !phone || !subject) {
      return res.status(400).json({ message: "Name, email, phone and subject are required." });
    }
    if (!validator.isEmail(String(email))) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const resolvedSubject = productName ? `Product enquiry: ${productName}` : String(subject).trim();

    const enquiry = await Enquiry.create({
      name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      subject: resolvedSubject,
      message: String(message).trim(),
    });

    const to = inbox();
    if (to) {
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;background:#f7f8fa;padding:32px">
          <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
            <div style="background:#264796;padding:20px 24px;color:#fff;font-weight:800;letter-spacing:1px">ONE SQUARE ASSOCIATES</div>
            <div style="padding:24px;color:#334155;font-size:14px;line-height:1.6">
              <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px">${enquiry.subject}</h2>
              <p><b>Name:</b> ${enquiry.name}</p>
              <p><b>Email:</b> ${enquiry.email}</p>
              <p><b>Phone:</b> ${enquiry.phone}</p>
              ${enquiry.message ? `<p style="white-space:pre-wrap"><b>Message:</b><br/>${enquiry.message}</p>` : ""}
            </div>
          </div>
        </div>`;

      sendMail({
        to,
        subject: `[Website] ${enquiry.subject}`,
        html,
        text: `${enquiry.subject}\n\nName: ${enquiry.name}\nEmail: ${enquiry.email}\nPhone: ${enquiry.phone}\n\n${enquiry.message}`,
      }).catch((e) => console.warn("[contact] send failed:", e.message));
    }

    return res.status(201).json({
      enquiry: toEnquiryDTO(enquiry),
      message: "Thanks for reaching out — our team will get back to you shortly.",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/contact/getall   (admin)
export const getAllEnquiries = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaging(req.query);
    const dbWhere = {};

    if (isFilterActive(req.query.status)) dbWhere.status = req.query.status;

    if (req.query.search) {
      const term = likeTerm(req.query.search);
      dbWhere[Op.or] = [
        { name: { [Op.like]: term } },
        { email: { [Op.like]: term } },
        { phone: { [Op.like]: term } },
        { subject: { [Op.like]: term } },
      ];
    }

    const { rows, count } = await Enquiry.findAndCountAll({
      where: dbWhere,
      order: [["createdAt", "DESC"]],
      offset: skip,
      limit,
    });

    return res.status(200).json({
      enquiries: rows.map(toEnquiryDTO),
      total: count,
      page,
      pages: Math.max(1, Math.ceil(count / limit)),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/contact/status/:id   (admin)
export const updateEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!isValidId(id)) return res.status(400).json({ message: "Invalid enquiry ID." });
    if (!ENQUIRY_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${ENQUIRY_STATUSES.join(", ")}.` });
    }

    const enquiry = await Enquiry.findByPk(id);
    if (!enquiry) return res.status(404).json({ message: "Enquiry not found." });

    enquiry.status = status;
    enquiry.handledBy = req.adminUser?.id || null;
    await enquiry.save();

    return res.status(200).json({ enquiry: toEnquiryDTO(enquiry), message: `Marked as ${status.replace("_", " ")}.` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// DELETE /api/contact/:id   (admin)
export const deleteEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid enquiry ID." });

    const enquiry = await Enquiry.findByPk(id);
    if (!enquiry) return res.status(404).json({ message: "Enquiry not found." });

    await enquiry.destroy();

    return res.status(200).json({ message: "Enquiry deleted." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
