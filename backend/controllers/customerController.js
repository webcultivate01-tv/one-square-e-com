import { Op, fn, col } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import User, { CUSTOMER_STATUSES, TAG_SUGGESTIONS } from "../model/userModel.js";
import Order from "../model/orderModel.js";
import CustomerActivity from "../model/customerActivityModel.js";
import { toCustomerDetailDTO, toCustomerListDTO, toOrderDTO } from "../utils/dto.js";
import { logActivity } from "../utils/activity.js";
import { getRequestContext } from "../utils/requestContext.js";
import { sendCustomMail } from "../config/nodemailer.js";
import { isStrongPassword, PASSWORD_HINT, BCRYPT_ROUNDS } from "../utils/password.js";
import {
  buildDaySeries,
  dayKey,
  endOfDay,
  isFilterActive,
  isValidId,
  jsonContains,
  jsonEq,
  likeTerm,
  parsePaging,
  round2,
  toBool,
  toNum,
} from "../utils/helpers.js";

const SORT_FIELD = {
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  name_asc: (a, b) => String(a.name).localeCompare(String(b.name)),
  name_desc: (a, b) => String(b.name).localeCompare(String(a.name)),
  last_active: (a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0),
  top_spender: (a, b) => (b.totalSpent || 0) - (a.totalSpent || 0),
  most_orders: (a, b) => (b.totalOrders || 0) - (a.totalOrders || 0),
};

const buildCustomerWhere = (q = {}) => {
  const dbWhere = { role: "user" };

  if (!toBool(q.includeDeleted)) dbWhere.isDeleted = { [Op.ne]: true };

  const andClauses = [];
  if (q.search) {
    const term = likeTerm(q.search);
    const or = [
      { name: { [Op.like]: term } },
      { email: { [Op.like]: term } },
      { phone: { [Op.like]: term } },
    ];
    if (isValidId(q.search)) or.push({ id: q.search });
    andClauses.push({ [Op.or]: or });
  }

  if (isFilterActive(q.status) && CUSTOMER_STATUSES.includes(q.status)) {
    dbWhere.customerStatus = q.status;
  }
  if (isFilterActive(q.verified)) dbWhere.isVerified = q.verified === "yes";
  if (isFilterActive(q.tag)) andClauses.push(jsonContains("tags", q.tag));

  if (isFilterActive(q.country)) andClauses.push(jsonEq("address", "country", q.country));
  if (isFilterActive(q.state)) andClauses.push(jsonEq("address", "state", q.state));
  if (isFilterActive(q.city)) andClauses.push(jsonEq("address", "city", q.city));

  if (q.fromDate || q.toDate) {
    dbWhere.createdAt = {};
    if (q.fromDate) dbWhere.createdAt[Op.gte] = new Date(q.fromDate);
    if (q.toDate) dbWhere.createdAt[Op.lte] = endOfDay(q.toDate);
  }

  if (andClauses.length) dbWhere[Op.and] = andClauses;
  return dbWhere;
};

/** One GROUP BY query → { userId: { totalOrders, totalSpent, lastOrderAt } }. */
const getOrderStatsMap = async () => {
  const rows = await Order.findAll({
    attributes: [
      "user",
      [fn("COUNT", col("id")), "totalOrders"],
      [fn("SUM", col("total")), "totalSpent"],
      [fn("MAX", col("createdAt")), "lastOrderAt"],
    ],
    group: ["user"],
    raw: true,
  });
  return new Map(
    rows.map((r) => [
      String(r.user),
      { totalOrders: Number(r.totalOrders) || 0, totalSpent: Number(r.totalSpent) || 0, lastOrderAt: r.lastOrderAt },
    ])
  );
};

// GET /api/admin/customers
export const listCustomers = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 20 });
    const sortFn = SORT_FIELD[req.query.sort] || SORT_FIELD.newest;

    const [rows, statsMap] = await Promise.all([
      User.findAll({
        where: buildCustomerWhere(req.query),
        attributes: { exclude: ["password", "otp", "otpExpiry", "notes"] },
      }),
      getOrderStatsMap(),
    ]);

    let items = rows.map((r) => {
      const stats = statsMap.get(String(r.id)) || { totalOrders: 0, totalSpent: 0, lastOrderAt: null };
      return { ...r.toJSON(), ...stats };
    });

    const minSpent = toNum(req.query.minSpent, 0);
    if (minSpent > 0) items = items.filter((c) => c.totalSpent >= minSpent);
    if (isFilterActive(req.query.hasOrders)) {
      items = items.filter((c) =>
        req.query.hasOrders === "yes" ? c.totalOrders > 0 : c.totalOrders === 0
      );
    }

    items.sort(sortFn);
    const total = items.length;
    const page_items = items.slice(skip, skip + limit);

    return res.status(200).json({
      customers: page_items.map(toCustomerListDTO),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      tagSuggestions: TAG_SUGGESTIONS,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/customers/analytics/summary
export const customerAnalytics = async (req, res) => {
  try {
    const live = { role: "user", isDeleted: { [Op.ne]: true } };
    const since = new Date(Date.now() - 29 * 86400000);

    const [total, active, suspended, blocked, verified, newRows, allLive, statsMap] = await Promise.all([
      User.count({ where: live }),
      User.count({ where: { ...live, customerStatus: "active" } }),
      User.count({ where: { ...live, customerStatus: "suspended" } }),
      User.count({ where: { ...live, customerStatus: "blocked" } }),
      User.count({ where: { ...live, isVerified: true } }),
      User.findAll({ where: { ...live, createdAt: { [Op.gte]: since } }, attributes: ["createdAt"], raw: true }),
      User.findAll({ where: live, attributes: ["id", "name", "email", "avatar"], raw: true }),
      getOrderStatsMap(),
    ]);

    const signupMap = new Map();
    for (const u of newRows) {
      const k = dayKey(u.createdAt);
      signupMap.set(k, (signupMap.get(k) || 0) + 1);
    }
    const series = buildDaySeries(30);

    const topRows = allLive
      .map((u) => ({ ...u, ...(statsMap.get(String(u.id)) || { totalOrders: 0, totalSpent: 0 }) }))
      .filter((u) => u.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    return res.status(200).json({
      summary: {
        total,
        active,
        suspended,
        blocked,
        verified,
        unverified: total - verified,
        newLast30: newRows.length,
      },
      signupTrend: {
        labels: series.map((d) => d.key),
        values: series.map((d) => signupMap.get(d.key) || 0),
      },
      topSpenders: topRows.map((t) => ({
        _id: t.id,
        name: t.name,
        email: t.email,
        avatar: t.avatar || "",
        totalSpent: round2(t.totalSpent),
        totalOrders: t.totalOrders,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/customers/export.csv
export const exportCustomersCsv = async (req, res) => {
  try {
    const sortFn = SORT_FIELD[req.query.sort] || SORT_FIELD.newest;
    const [rows, statsMap] = await Promise.all([
      User.findAll({ where: buildCustomerWhere(req.query) }),
      getOrderStatsMap(),
    ]);

    let items = rows.map((r) => {
      const stats = statsMap.get(String(r.id)) || { totalOrders: 0, totalSpent: 0 };
      return { ...r.toJSON(), ...stats };
    });
    items.sort(sortFn);
    const list = items.slice(0, 10000).map(toCustomerListDTO);

    const headers = [
      "ID",
      "Name",
      "Email",
      "Phone",
      "Status",
      "Verified",
      "Orders",
      "Total Spent",
      "City",
      "Country",
      "Joined",
    ];
    const esc = (v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const c of list) {
      lines.push(
        [
          c._id,
          c.name,
          c.email,
          c.phone,
          c.customerStatus,
          c.isVerified ? "yes" : "no",
          c.totalOrders,
          c.totalSpent,
          c.address?.city || "",
          c.address?.country || "",
          new Date(c.createdAt).toISOString().slice(0, 10),
        ]
          .map(esc)
          .join(",")
      );
    }

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="customers-${stamp}.csv"`);
    return res.status(200).send(`﻿${lines.join("\n")}`);
  } catch (error) {
    if (res.headersSent) return res.end();
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/customers/:id
export const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid customer ID." });

    const customer = await User.findOne({
      where: { id, role: "user" },
      attributes: { exclude: ["password", "otp", "otpExpiry"] },
    });
    if (!customer) return res.status(404).json({ message: "Customer not found." });

    const [orders, recent] = await Promise.all([
      Order.findAll({ where: { user: id }, raw: true }),
      Order.findAll({ where: { user: id }, order: [["createdAt", "DESC"]], limit: 10 }),
    ]);

    const totalOrders = orders.length;
    const totalSpent = round2(orders.reduce((s, o) => s + (o.total || 0), 0));
    const refundedAmount = round2(orders.reduce((s, o) => s + (o.refundedAmount || 0), 0));
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    const pending = orders.filter((o) => ["confirmed", "shipped", "in_transit"].includes(o.status)).length;
    const lastOrderAt = orders.reduce(
      (max, o) => (!max || new Date(o.createdAt) > new Date(max) ? o.createdAt : max),
      null
    );

    return res.status(200).json({
      customer: toCustomerDetailDTO({ ...customer.toJSON(), totalOrders, totalSpent }),
      analytics: {
        totalOrders,
        totalSpent,
        avgOrderValue: totalOrders ? round2(totalSpent / totalOrders) : 0,
        refundedAmount,
        delivered,
        cancelled,
        pending,
        lastOrderAt,
      },
      recentOrders: recent.map((r) => toOrderDTO(r.toJSON())),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/customers/:id/orders
export const getCustomerOrders = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid customer ID." });

    const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 10 });
    const { rows, count } = await Order.findAndCountAll({
      where: { user: id },
      order: [["createdAt", "DESC"]],
      offset: skip,
      limit,
    });

    return res.status(200).json({
      orders: rows.map((r) => toOrderDTO(r.toJSON())),
      total: count,
      page,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/customers/:id/activity
export const getCustomerActivity = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid customer ID." });

    const limit = Math.min(200, Math.max(1, Math.trunc(toNum(req.query.limit, 50))));
    const rows = await CustomerActivity.findAll({
      where: { customer: id },
      order: [["createdAt", "DESC"]],
      limit,
    });

    return res.status(200).json({
      activity: rows.map((r) => ({ ...r.toJSON(), _id: r.id })),
      total: rows.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PATCH /api/admin/customers/:id/status
export const setCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason = "" } = req.body || {};

    if (!isValidId(id)) return res.status(400).json({ message: "Invalid customer ID." });
    if (!["active", "suspended", "blocked"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be active, suspended or blocked." });
    }

    const customer = await User.findOne({ where: { id, role: "user" } });
    if (!customer) return res.status(404).json({ message: "Customer not found." });

    customer.customerStatus = status;
    customer.statusReason = String(reason || "");
    customer.statusChangedAt = new Date();
    customer.statusChangedBy = req.adminUser.id;
    if (status !== "active") customer.tokensValidFrom = new Date(); // sign out everywhere
    await customer.save();

    logActivity({
      customer: customer.id,
      type: "admin_action",
      action: `customer.${status}`,
      message: `Account marked ${status}${reason ? `: ${reason}` : "."}`,
      actor: req.adminUser,
      context: getRequestContext(req),
    }).catch((e) => console.warn(e.message));

    return res.status(200).json({
      customer: toCustomerDetailDTO(customer.toJSON()),
      message: `Customer marked ${status}.`,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PATCH /api/admin/customers/:id/verify
export const setCustomerVerified = async (req, res) => {
  try {
    const { id } = req.params;
    const verified = toBool(req.body?.verified, true);
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid customer ID." });

    const customer = await User.findOne({ where: { id, role: "user" } });
    if (!customer) return res.status(404).json({ message: "Customer not found." });

    customer.isVerified = verified;
    await customer.save();

    logActivity({
      customer: customer.id,
      type: "admin_action",
      action: "customer.verify",
      message: verified ? "Marked as verified." : "Verification removed.",
      actor: req.adminUser,
      context: getRequestContext(req),
    }).catch((e) => console.warn(e.message));

    return res.status(200).json({
      customer: toCustomerDetailDTO(customer.toJSON()),
      message: verified ? "Customer verified." : "Verification removed.",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/customers/:id/tags — full replace, deduped, cap 25
export const setCustomerTags = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid customer ID." });

    const raw = Array.isArray(req.body?.tags) ? req.body.tags : [];
    const tags = [...new Set(raw.map((t) => String(t).trim()).filter(Boolean))].slice(0, 25);

    const customer = await User.findOne({ where: { id, role: "user" } });
    if (!customer) return res.status(404).json({ message: "Customer not found." });

    customer.tags = tags;
    await customer.save();

    return res
      .status(200)
      .json({ customer: toCustomerDetailDTO(customer.toJSON()), message: "Tags updated." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/customers/:id/notes
export const addCustomerNote = async (req, res) => {
  try {
    const { id } = req.params;
    const body = String(req.body?.body || "").trim();

    if (!isValidId(id)) return res.status(400).json({ message: "Invalid customer ID." });
    if (!body) return res.status(400).json({ message: "Note cannot be empty." });
    if (body.length > 2000) return res.status(400).json({ message: "Note is too long (max 2000)." });

    const customer = await User.findOne({ where: { id, role: "user" } });
    if (!customer) return res.status(404).json({ message: "Customer not found." });

    customer.notes = [
      ...(customer.notes || []),
      {
        id: uuidv4(),
        body,
        author: req.adminUser.id,
        authorName: req.adminUser.name,
        createdAt: new Date(),
      },
    ];
    await customer.save();

    return res
      .status(201)
      .json({ customer: toCustomerDetailDTO(customer.toJSON()), message: "Note added." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/customers/:id/notes/:noteId
export const deleteCustomerNote = async (req, res) => {
  try {
    const { id, noteId } = req.params;
    if (!isValidId(id) || !isValidId(noteId)) {
      return res.status(400).json({ message: "Invalid ID." });
    }

    const customer = await User.findOne({ where: { id, role: "user" } });
    if (!customer) return res.status(404).json({ message: "Customer not found." });

    const before = (customer.notes || []).length;
    const notes = (customer.notes || []).filter((n) => String(n.id) !== String(noteId));
    if (notes.length === before) {
      return res.status(404).json({ message: "Note not found." });
    }
    customer.notes = notes;
    await customer.save();

    return res
      .status(200)
      .json({ customer: toCustomerDetailDTO(customer.toJSON()), message: "Note deleted." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/customers/:id/reset-password
export const resetCustomerPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body || {};

    if (!isValidId(id)) return res.status(400).json({ message: "Invalid customer ID." });
    if (!password) return res.status(400).json({ message: "A new password is required." });
    if (!isStrongPassword(password)) return res.status(400).json({ message: PASSWORD_HINT });

    const customer = await User.findOne({ where: { id, role: "user" } });
    if (!customer) return res.status(404).json({ message: "Customer not found." });

    customer.password = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
    customer.passwordChangedAt = new Date();
    customer.mustChangePassword = true;
    customer.tokensValidFrom = new Date();
    await customer.save();

    logActivity({
      customer: customer.id,
      type: "password_reset",
      action: "customer.password_reset",
      message: "Password reset by an administrator.",
      actor: req.adminUser,
      context: getRequestContext(req),
    }).catch((e) => console.warn(e.message));

    return res.status(200).json({ message: `Password reset for ${customer.name}.` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/customers/:id/force-logout
export const forceLogoutCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid customer ID." });

    const customer = await User.findOne({ where: { id, role: "user" } });
    if (!customer) return res.status(404).json({ message: "Customer not found." });

    customer.tokensValidFrom = new Date();
    await customer.save();

    logActivity({
      customer: customer.id,
      type: "logout",
      action: "customer.force_logout",
      message: "Signed out of all devices by an administrator.",
      actor: req.adminUser,
      context: getRequestContext(req),
    }).catch((e) => console.warn(e.message));

    return res.status(200).json({ message: `${customer.name} was signed out everywhere.` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/customers/:id/email
export const emailCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, body } = req.body || {};

    if (!isValidId(id)) return res.status(400).json({ message: "Invalid customer ID." });
    if (!subject || !body) {
      return res.status(400).json({ message: "Subject and message are both required." });
    }

    const customer = await User.findOne({ where: { id, role: "user" }, attributes: ["id", "name", "email"] });
    if (!customer) return res.status(404).json({ message: "Customer not found." });

    const result = await sendCustomMail(customer.email, String(subject), String(body));
    if (!result.sent) {
      return res.status(502).json({
        message:
          result.reason === "mail-not-configured"
            ? "Email is not configured on this server."
            : `Email failed: ${result.reason}`,
      });
    }

    logActivity({
      customer: customer.id,
      type: "email_sent",
      action: "customer.email",
      message: `Email sent: ${subject}`,
      actor: req.adminUser,
      context: getRequestContext(req),
    }).catch((e) => console.warn(e.message));

    return res.status(200).json({ message: `Email sent to ${customer.email}.` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/customers/bulk-email  — sequential, one bad address never aborts the batch
export const bulkEmailCustomers = async (req, res) => {
  try {
    const { customerIds, subject, body } = req.body || {};
    const ids = (Array.isArray(customerIds) ? customerIds : []).filter(isValidId);

    if (!ids.length) return res.status(400).json({ message: "Select at least one customer." });
    if (!subject || !body) {
      return res.status(400).json({ message: "Subject and message are both required." });
    }

    const rows = await User.findAll({
      where: { id: { [Op.in]: ids }, role: "user" },
      attributes: ["id", "name", "email"],
      raw: true,
    });

    let sent = 0;
    for (const c of rows) {
      const result = await sendCustomMail(c.email, String(subject), String(body));
      if (result.sent) {
        sent += 1;
        logActivity({
          customer: c.id,
          type: "email_sent",
          action: "customer.bulk_email",
          message: `Bulk email sent: ${subject}`,
          actor: req.adminUser,
          context: getRequestContext(req),
        }).catch((e) => console.warn(e.message));
      }
    }

    return res.status(200).json({ message: `Sent ${sent} / ${rows.length} emails.`, sent });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/customers/bulk-action
export const bulkCustomerAction = async (req, res) => {
  try {
    const { customerIds, action, reason = "" } = req.body || {};
    const ids = (Array.isArray(customerIds) ? customerIds : []).filter(isValidId);

    if (!ids.length) return res.status(400).json({ message: "Select at least one customer." });

    const dbWhere = { id: { [Op.in]: ids }, role: "user" };
    const now = new Date();
    let update;

    switch (action) {
      case "activate":
        update = {
          customerStatus: "active",
          statusReason: "",
          statusChangedAt: now,
          statusChangedBy: req.adminUser.id,
        };
        break;
      case "suspend":
      case "block":
        update = {
          customerStatus: action === "suspend" ? "suspended" : "blocked",
          statusReason: String(reason || ""),
          statusChangedAt: now,
          statusChangedBy: req.adminUser.id,
          tokensValidFrom: now,
        };
        break;
      case "verify":
        update = { isVerified: true };
        break;
      case "unverify":
        update = { isVerified: false };
        break;
      case "delete":
        update = {
          isDeleted: true,
          deletedAt: now,
          deletedBy: req.adminUser.id,
          customerStatus: "deleted",
          tokensValidFrom: now,
        };
        break;
      case "restore":
        update = {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          customerStatus: "active",
        };
        break;
      default:
        return res.status(400).json({ message: `Unknown action "${action}".` });
    }

    const [modifiedCount] = await User.update(update, { where: dbWhere });

    return res.status(200).json({
      message: `Applied "${action}" to ${modifiedCount} customer(s).`,
      matched: ids.length,
      modified: modifiedCount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/customers/:id  — soft delete
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid customer ID." });

    const customer = await User.findOne({ where: { id, role: "user" } });
    if (!customer) return res.status(404).json({ message: "Customer not found." });

    customer.isDeleted = true;
    customer.deletedAt = new Date();
    customer.deletedBy = req.adminUser.id;
    customer.customerStatus = "deleted";
    customer.tokensValidFrom = new Date();
    await customer.save();

    logActivity({
      customer: customer.id,
      type: "admin_action",
      action: "customer.deleted",
      message: "Account soft-deleted by an administrator.",
      actor: req.adminUser,
      context: getRequestContext(req),
    }).catch((e) => console.warn(e.message));

    return res.status(200).json({ message: `${customer.name} was moved to trash.` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/customers/:id/restore
export const restoreCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid customer ID." });

    const customer = await User.findOne({ where: { id, role: "user" } });
    if (!customer) return res.status(404).json({ message: "Customer not found." });

    customer.isDeleted = false;
    customer.deletedAt = null;
    customer.deletedBy = null;
    customer.customerStatus = "active";
    await customer.save();

    return res.status(200).json({ message: `${customer.name} was restored.` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
