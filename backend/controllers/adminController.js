import { Op, fn, col } from "sequelize";
import Order, { ORDER_STATUSES } from "../model/orderModel.js";
import User, { STAFF_ROLES } from "../model/userModel.js";
import { getStripe, isStripeConfigured } from "../config/stripe.js";
import { sendRefundMail } from "../config/nodemailer.js";
import { logActivity } from "../utils/activity.js";
import { getRequestContext } from "../utils/requestContext.js";
import { toOrderDTO } from "../utils/dto.js";
import { attachItemProducts } from "../utils/populateOrderItems.js";
import {
  endOfDay,
  isFilterActive,
  isValidId,
  jsonLike,
  likeTerm,
  parsePaging,
  round2,
  toNum,
} from "../utils/helpers.js";

const USER_INCLUDE = { model: User, as: "userDetails", attributes: ["id", "name", "email"] };

/** Fetch + plain-object + attach item product info, in one place. */
const withOrderExtras = async (rows) => {
  const plain = rows.map((r) => r.toJSON());
  await attachItemProducts(plain);
  return plain;
};

/* ------------------------------------------------------------------ orders */

// GET /api/admin/getallorders
export const getAllOrders = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaging(req.query);
    const dbWhere = {};

    if (isFilterActive(req.query.status)) dbWhere.status = req.query.status;
    if (isFilterActive(req.query.paymentStatus)) dbWhere.paymentStatus = req.query.paymentStatus;

    if (req.query.search) {
      const term = likeTerm(req.query.search);
      const or = [
        jsonLike("shippingAddress", "name", term),
        jsonLike("shippingAddress", "phone", term),
        jsonLike("shippingAddress", "email", term),
        { invoiceNumber: { [Op.like]: term } },
        { trackingNumber: { [Op.like]: term } },
      ];
      if (isValidId(req.query.search)) or.push({ id: req.query.search });
      dbWhere[Op.or] = or;
    }

    if (req.query.from || req.query.to) {
      dbWhere.createdAt = {};
      if (req.query.from) dbWhere.createdAt[Op.gte] = new Date(req.query.from);
      if (req.query.to) dbWhere.createdAt[Op.lte] = endOfDay(req.query.to);
    }

    const { rows, count } = await Order.findAndCountAll({
      where: dbWhere,
      include: [USER_INCLUDE],
      order: [["createdAt", "DESC"]],
      offset: skip,
      limit,
    });

    const plain = await withOrderExtras(rows);

    return res.status(200).json({
      orders: plain.map(toOrderDTO),
      total: count,
      page,
      pages: Math.max(1, Math.ceil(count / limit)),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/orders/stats
export const getOrderStats = async (req, res) => {
  try {
    const [byStatus, totals] = await Promise.all([
      Order.findAll({
        attributes: ["status", [fn("COUNT", col("id")), "count"]],
        group: ["status"],
        raw: true,
      }),
      Order.findAll({
        attributes: [
          [fn("COUNT", col("id")), "total"],
          [fn("SUM", col("total")), "revenue"],
        ],
        raw: true,
      }),
    ]);

    const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, Number(s.count)]));
    const stats = { total: Number(totals[0]?.total || 0), revenue: round2(totals[0]?.revenue || 0) };
    for (const s of ORDER_STATUSES) stats[s] = statusMap[s] || 0;

    return res.status(200).json({ stats });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/updateorderstatus/:id
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, carrier } = req.body || {};

    if (!isValidId(id)) return res.status(400).json({ message: "Invalid order ID." });
    if (!ORDER_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ message: `Status must be one of: ${ORDER_STATUSES.join(", ")}.` });
    }

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: "Order not found." });

    if (order.status === "cancelled" && status !== "cancelled") {
      return res.status(409).json({ message: "A cancelled order cannot be reopened." });
    }

    order.status = status;
    if (typeof trackingNumber === "string") order.trackingNumber = trackingNumber.trim();
    if (typeof carrier === "string") order.carrier = carrier.trim();
    order.statusHistory = [
      ...(order.statusHistory || []),
      { status, at: new Date(), by: req.adminUser?.id || null, byName: req.adminUser?.name || "" },
    ];
    await order.save();

    logActivity({
      customer: order.user,
      type: "admin_action",
      action: "order.status_changed",
      message: `Order ${String(order.id).replace(/-/g, "").slice(-8).toUpperCase()} marked ${status}.`,
      actor: req.adminUser,
      context: getRequestContext(req),
      meta: { orderId: order.id, status },
    }).catch((e) => console.warn(e.message));

    const full = await Order.findByPk(id, { include: [USER_INCLUDE] });
    const [plain] = await withOrderExtras([full]);

    return res.status(200).json({ order: toOrderDTO(plain), message: `Order marked ${status}.` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/admin/order/:id/refund
 * Full or partial refund. The result is mirrored onto the order synchronously —
 * admins must never see "paid" on a row they just refunded (blueprint section 11).
 */
export const refundOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid order ID." });

    const order = await Order.findByPk(id, { include: [USER_INCLUDE] });
    if (!order) return res.status(404).json({ message: "Order not found." });

    if (order.paymentStatus !== "paid") {
      return res
        .status(409)
        .json({ message: `This order is already ${order.paymentStatus.replace("_", " ")}.` });
    }
    if (!order.stripePaymentId) {
      return res.status(409).json({ message: "This order has no payment reference to refund." });
    }

    const requested = toNum(req.body?.amount, order.total);
    const amount = Math.min(Math.max(0.5, round2(requested)), round2(order.total));
    const isFull = amount >= round2(order.total);

    let refundId = "";

    if (isStripeConfigured() && order.stripePaymentId.startsWith("pi_")) {
      const stripe = getStripe();
      try {
        const refund = await stripe.refunds.create(
          {
            payment_intent: order.stripePaymentId,
            amount: Math.round(amount * 100),
            reason: "requested_by_customer",
          },
          { idempotencyKey: `refund:${order.id}:${Math.round(amount * 100)}` }
        );
        refundId = refund.id;
      } catch (stripeError) {
        return res
          .status(502)
          .json({ message: `Payment provider refused the refund: ${stripeError.message}` });
      }
    } else {
      // No Stripe key configured (local/demo data) — record the refund locally.
      refundId = `local_re_${Date.now()}`;
      console.warn(
        `[refund] Stripe is not configured; order ${order.id} was refunded in the ledger only.`
      );
    }

    order.stripeRefundId = refundId;
    order.refundedAmount = amount;
    order.refundedAt = new Date();
    order.paymentStatus = isFull ? "refunded" : "partially_refunded";
    if (isFull) order.status = "cancelled";
    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status: isFull ? "refunded" : "partially_refunded",
        at: new Date(),
        by: req.adminUser?.id || null,
        byName: req.adminUser?.name || "",
      },
    ];

    if (!order.refundEmailSent) {
      const to = order.userDetails?.email || order.shippingAddress?.email;
      if (to) {
        sendRefundMail(to, {
          orderId: String(order.id).replace(/-/g, "").slice(-8).toUpperCase(),
          amount,
          currency: order.currency,
        }).catch((e) => console.warn(e.message));
      }
      order.refundEmailSent = true;
    }

    await order.save();

    logActivity({
      customer: order.userDetails?.id || order.user,
      type: "admin_action",
      action: "order.refunded",
      message: `Refunded ${order.currency} ${amount.toFixed(2)}.`,
      actor: req.adminUser,
      context: getRequestContext(req),
      meta: { orderId: order.id, amount, refundId },
    }).catch((e) => console.warn(e.message));

    const full = await Order.findByPk(id, { include: [USER_INCLUDE] });
    const [plain] = await withOrderExtras([full]);

    return res.status(200).json({
      order: toOrderDTO(plain),
      message: isFull ? "Order refunded in full." : `Refunded ${amount.toFixed(2)}.`,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/order/:id
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid order ID." });

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: "Order not found." });
    await order.destroy();

    logActivity({
      customer: order.user,
      type: "admin_action",
      action: "order.deleted",
      message: `Order ${String(order.id).replace(/-/g, "").slice(-8).toUpperCase()} was deleted.`,
      actor: req.adminUser,
      context: getRequestContext(req),
    }).catch((e) => console.warn(e.message));

    return res.status(200).json({ message: "Order deleted." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------------------------- payments */

const buildPaymentWhere = (q = {}) => {
  const dbWhere = {};

  if (isFilterActive(q.paymentStatus)) dbWhere.paymentStatus = q.paymentStatus;
  if (isFilterActive(q.cardBrand)) dbWhere.cardBrand = q.cardBrand;

  if (q.from || q.to) {
    dbWhere.paidAt = {};
    if (q.from) dbWhere.paidAt[Op.gte] = new Date(q.from);
    if (q.to) dbWhere.paidAt[Op.lte] = endOfDay(q.to);
  }

  const min = toNum(q.minAmount, NaN);
  const max = toNum(q.maxAmount, NaN);
  if (Number.isFinite(min) || Number.isFinite(max)) {
    dbWhere.total = {};
    if (Number.isFinite(min)) dbWhere.total[Op.gte] = min;
    if (Number.isFinite(max)) dbWhere.total[Op.lte] = max;
  }

  if (q.search) {
    const term = likeTerm(q.search);
    const or = [
      { stripePaymentId: { [Op.like]: term } },
      { stripeChargeId: { [Op.like]: term } },
      { stripeRefundId: { [Op.like]: term } },
      { invoiceNumber: { [Op.like]: term } },
      { cardLast4: { [Op.like]: term } },
      jsonLike("shippingAddress", "name", term),
      jsonLike("shippingAddress", "phone", term),
    ];
    if (isValidId(q.search)) or.push({ id: q.search });
    dbWhere[Op.or] = or;
  }

  return dbWhere;
};

// GET /api/admin/payments
export const getPayments = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaging(req.query);
    const dbWhere = buildPaymentWhere(req.query);

    const { rows, count } = await Order.findAndCountAll({
      where: dbWhere,
      include: [USER_INCLUDE],
      order: [
        ["paidAt", "DESC"],
        ["createdAt", "DESC"],
      ],
      offset: skip,
      limit,
    });

    return res.status(200).json({
      payments: rows.map((r) => toOrderDTO(r.toJSON())),
      total: count,
      page,
      pages: Math.max(1, Math.ceil(count / limit)),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/payments/stats
export const getPaymentStats = async (req, res) => {
  try {
    // Aggregated in JS (not SQL CASE/IF) to stay simple and dialect-portable.
    const rows = await Order.findAll({
      attributes: ["paymentStatus", "total", "refundedAmount", "cardBrand"],
      raw: true,
    });

    const a = {
      totalTxns: rows.length,
      totalRevenue: 0,
      paidCount: 0,
      refundedTotal: 0,
      refundedCount: 0,
      disputedCount: 0,
    };
    const cardMap = new Map();
    for (const r of rows) {
      if (r.paymentStatus === "paid") {
        a.totalRevenue += r.total || 0;
        a.paidCount += 1;
      }
      a.refundedTotal += r.refundedAmount || 0;
      if (["refunded", "partially_refunded"].includes(r.paymentStatus)) a.refundedCount += 1;
      if (r.paymentStatus === "disputed") a.disputedCount += 1;

      if (r.cardBrand) {
        const c = cardMap.get(r.cardBrand) || { count: 0, revenue: 0 };
        c.count += 1;
        c.revenue += r.total || 0;
        cardMap.set(r.cardBrand, c);
      }
    }
    const cardBreakdown = [...cardMap.entries()]
      .map(([brand, v]) => ({ brand, count: v.count, revenue: round2(v.revenue) }))
      .sort((x, y) => y.revenue - x.revenue);

    const totalRevenue = round2(a.totalRevenue || 0);
    const refundedTotal = round2(a.refundedTotal || 0);

    return res.status(200).json({
      stats: {
        totalRevenue,
        netRevenue: round2(totalRevenue - refundedTotal),
        paidCount: a.paidCount || 0,
        refundedTotal,
        refundedCount: a.refundedCount || 0,
        disputedCount: a.disputedCount || 0,
        totalTxns: a.totalTxns || 0,
      },
      cardBreakdown: cardBreakdown.map((c) => ({ ...c, brand: c.brand || "unknown" })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/payments/:id
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid payment ID." });

    const order = await Order.findByPk(id, {
      include: [{ model: User, as: "userDetails", attributes: ["id", "name", "email", "phone"] }],
    });
    if (!order) return res.status(404).json({ message: "Payment not found." });

    const [plain] = await withOrderExtras([order]);
    return res.status(200).json({ payment: toOrderDTO(plain) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ------------------------------------------------------------------- misc */

// GET /api/admin/getstats — headline counts for the topbar / reports
export const getAdminSummary = async (req, res) => {
  try {
    const [orders, customers, admins] = await Promise.all([
      Order.count(),
      User.count({ where: { role: "user", isDeleted: { [Op.ne]: true } } }),
      User.count({ where: { role: { [Op.in]: STAFF_ROLES } } }),
    ]);
    return res.status(200).json({ summary: { orders, customers, admins } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
