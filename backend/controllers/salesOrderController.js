import { randomInt } from "crypto";
import { sequelize } from "../config/db.js";
import SalesOrder, { PAYMENT_METHODS, PAYMENT_TYPES } from "../model/salesOrderModel.js";
import LeadNote from "../model/leadNoteModel.js";
import { permits } from "../middleware/hasPermission.js";
import { isValidId } from "../utils/helpers.js";
import { SOURCES, loadLead } from "./leadController.js";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const toSalesOrderDTO = (s) => {
  const o = typeof s.toJSON === "function" ? s.toJSON() : s;
  return {
    _id: o.id,
    invoiceNumber: o.invoiceNumber,
    sourceType: o.sourceType,
    sourceId: o.sourceId,
    customer: { name: o.customerName, email: o.customerEmail, phone: o.customerPhone, address: o.customerAddress },
    items: o.items || [],
    subtotal: o.subtotal,
    taxPercent: o.taxPercent,
    tax: o.tax,
    total: o.total,
    paymentType: o.paymentType,
    paymentMethod: o.paymentMethod,
    paymentReference: o.paymentReference,
    amountPaid: o.amountPaid,
    balanceDue: o.balanceDue,
    paymentStatus: o.paymentStatus,
    status: o.status,
    paidAt: o.paidAt,
    createdByName: o.createdByName,
    createdAt: o.createdAt,
  };
};

const newInvoiceNumber = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `INV-${ymd}-${randomInt(10000, 99999)}`;
};

// POST /api/sales-order/create
// { sourceType, sourceId, items:[{product?, name, quantity, price}], taxPercent?,
//   paymentType: "advance"|"full", advanceAmount?, paymentMethod, paymentReference? }
export const createSalesOrder = async (req, res) => {
  try {
    const body = req.body || {};
    const found = await loadLead(req, res, body.sourceType, body.sourceId);
    if (!found) return undefined;
    const { lead, source } = found;

    if (await SalesOrder.findOne({ where: { sourceId: lead.id }, attributes: ["id"] })) {
      return res.status(409).json({ message: "An order has already been confirmed for this lead." });
    }

    const items = (Array.isArray(body.items) ? body.items : []).map((i) => {
      const quantity = Number.parseInt(i?.quantity, 10);
      const price = Number(i?.price);
      return {
        product: isValidId(i?.product) ? i.product : null,
        name: String(i?.name || "").trim(),
        quantity,
        price,
        amount: round2(quantity * price),
      };
    });
    if (!items.length) return res.status(400).json({ message: "Add at least one product." });
    if (items.some((i) => !i.name || !Number.isInteger(i.quantity) || i.quantity < 1 || !Number.isFinite(i.price) || i.price < 0)) {
      return res.status(400).json({ message: "Every item needs a name, a quantity of at least 1 and a valid price." });
    }

    const taxPercent = body.taxPercent === undefined || body.taxPercent === "" ? 0 : Number(body.taxPercent);
    if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
      return res.status(400).json({ message: "Tax must be between 0 and 100%." });
    }

    const subtotal = round2(items.reduce((sum, i) => sum + i.amount, 0));
    const tax = round2((subtotal * taxPercent) / 100);
    const total = round2(subtotal + tax);
    if (total <= 0) return res.status(400).json({ message: "Order total must be greater than zero." });

    if (!PAYMENT_TYPES.includes(body.paymentType)) {
      return res.status(400).json({ message: "Choose advance payment or full payment." });
    }
    if (!PAYMENT_METHODS.includes(body.paymentMethod)) {
      return res.status(400).json({ message: `Payment method must be one of: ${PAYMENT_METHODS.join(", ")}.` });
    }

    let amountPaid = total;
    if (body.paymentType === "advance") {
      amountPaid = round2(Number(body.advanceAmount));
      if (!Number.isFinite(amountPaid) || amountPaid <= 0 || amountPaid >= total) {
        return res.status(400).json({ message: "Advance must be more than 0 and less than the order total." });
      }
    }
    const balanceDue = round2(total - amountPaid);

    const paymentReference = String(body.paymentReference || "").trim().slice(0, 120);
    const label = lead.name;
    const author = req.adminUser;

    const order = await sequelize.transaction(async (transaction) => {
      const created = await SalesOrder.create(
        {
          invoiceNumber: newInvoiceNumber(),
          sourceType: body.sourceType,
          sourceId: lead.id,
          customerName: label,
          customerEmail: lead.email,
          customerPhone: lead.phone,
          customerAddress: lead.address || "",
          items,
          subtotal,
          taxPercent,
          tax,
          total,
          paymentType: body.paymentType,
          paymentMethod: body.paymentMethod,
          paymentReference,
          amountPaid,
          balanceDue,
          paymentStatus: balanceDue > 0 ? "advance_paid" : "paid",
          createdBy: author.id,
          createdByName: author.name,
        },
        { transaction }
      );

      lead.status = source.converted;
      lead.handledBy = author.id;
      await lead.save({ transaction });

      await LeadNote.create(
        {
          sourceType: body.sourceType,
          sourceId: lead.id,
          type: "system",
          text:
            balanceDue > 0
              ? `Order confirmed — invoice ${created.invoiceNumber}. Advance ₹${amountPaid} received via ${body.paymentMethod}; ₹${balanceDue} balance due.`
              : `Order confirmed — invoice ${created.invoiceNumber}. Paid in full (₹${total}) via ${body.paymentMethod}.`,
          authorId: author.id,
          authorName: author.name,
          authorRole: author.role,
        },
        { transaction }
      );

      return created;
    });

    return res.status(201).json({
      order: toSalesOrderDTO(order),
      status: lead.status,
      message: `Order confirmed. Bill ${order.invoiceNumber} generated.`,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/sales-order/:id   — the bill
export const getSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid order ID." });

    const order = await SalesOrder.findByPk(id);
    if (!order) return res.status(404).json({ message: "Order not found." });

    if (!permits(req.adminUser, SOURCES[order.sourceType]?.permission)) {
      return res.status(403).json({ message: "Access denied." });
    }

    return res.status(200).json({ order: toSalesOrderDTO(order) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
