import Enquiry from "../model/enquiryModel.js";
import OrderRequest from "../model/orderRequestModel.js";
import LeadNote, { LEAD_SOURCES } from "../model/leadNoteModel.js";
import SalesOrder from "../model/salesOrderModel.js";
import { permits } from "../middleware/hasPermission.js";
import { isValidId } from "../utils/helpers.js";

/**
 * Each lead type is guarded by the permission of the module it lives in.
 * `firstContact` = [untouched status, "being worked on" status].
 */
export const SOURCES = {
  enquiry: { model: Enquiry, permission: "enquiries", firstContact: ["new", "in_progress"], converted: "resolved" },
  order_request: { model: OrderRequest, permission: "orders", firstContact: ["pending", "contacted"], converted: "converted" },
};

const toNoteDTO = (n) => {
  const o = typeof n.toJSON === "function" ? n.toJSON() : n;
  return {
    _id: o.id,
    type: o.type,
    text: o.text,
    followUpAt: o.followUpAt,
    authorName: o.authorName,
    authorRole: o.authorRole,
    createdAt: o.createdAt,
  };
};

/** Resolves + authorises `:type/:id`; sends the error response itself and returns null on failure. */
export const loadLead = async (req, res, type = req.params.type, id = req.params.id) => {
  const source = SOURCES[type];
  if (!source || !LEAD_SOURCES.includes(type)) {
    res.status(400).json({ message: "Unknown lead type." });
    return null;
  }
  if (!permits(req.adminUser, source.permission)) {
    res.status(403).json({ message: `Access denied. The "${source.permission}" permission is required.` });
    return null;
  }
  if (!isValidId(id)) {
    res.status(400).json({ message: "Invalid ID." });
    return null;
  }
  const lead = await source.model.findByPk(id);
  if (!lead) {
    res.status(404).json({ message: "Lead not found." });
    return null;
  }
  return { lead, source };
};

// GET /api/lead/:type/:id/notes
export const getLeadNotes = async (req, res) => {
  try {
    const found = await loadLead(req, res);
    if (!found) return undefined;

    const notes = await LeadNote.findAll({
      where: { sourceType: req.params.type, sourceId: req.params.id },
      order: [["createdAt", "DESC"]],
    });
    const order = await SalesOrder.findOne({
      where: { sourceType: req.params.type, sourceId: req.params.id },
      attributes: ["id", "invoiceNumber", "paymentStatus"],
    });

    return res.status(200).json({
      notes: notes.map(toNoteDTO),
      order: order ? { _id: order.id, invoiceNumber: order.invoiceNumber, paymentStatus: order.paymentStatus } : null,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/lead/:type/:id/notes   { text, type?, followUpAt? }
export const addLeadNote = async (req, res) => {
  try {
    const found = await loadLead(req, res);
    if (!found) return undefined;
    const { lead, source } = found;

    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ message: "Write a note first." });
    if (text.length > 4000) return res.status(400).json({ message: "Note is too long (max 4000 characters)." });

    const type = ["call", "follow_up", "note"].includes(req.body?.type) ? req.body.type : "call";

    let followUpAt = null;
    if (req.body?.followUpAt) {
      followUpAt = new Date(req.body.followUpAt);
      if (Number.isNaN(followUpAt.getTime())) {
        return res.status(400).json({ message: "Follow-up date is invalid." });
      }
    }

    const note = await LeadNote.create({
      sourceType: req.params.type,
      sourceId: lead.id,
      type,
      text,
      followUpAt,
      authorId: req.adminUser.id,
      authorName: req.adminUser.name,
      authorRole: req.adminUser.role,
    });

    // First touch moves a fresh lead into "being worked on".
    const [fresh, working] = source.firstContact;
    let status;
    if (lead.status === fresh) {
      lead.status = working;
      lead.handledBy = req.adminUser.id;
      status = lead.status;
    }
    // Buy Now requests remember the newest scheduled follow-up for the Follow-up tab.
    const tracksFollowUp = req.params.type === "order_request" && followUpAt;
    if (tracksFollowUp) lead.nextFollowUpAt = followUpAt;
    if (status || tracksFollowUp) await lead.save();

    return res.status(201).json({
      note: toNoteDTO(note),
      status,
      nextFollowUpAt: tracksFollowUp ? followUpAt : undefined,
      message: "Note added.",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
