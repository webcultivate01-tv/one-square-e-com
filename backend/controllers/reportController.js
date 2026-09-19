import { Op } from "sequelize";
import Product from "../model/productModel.js";
import Category from "../model/categoryModel.js";
import User from "../model/userModel.js";
import Enquiry, { ENQUIRY_STATUSES } from "../model/enquiryModel.js";
import OrderRequest, { ORDER_REQUEST_STATUSES } from "../model/orderRequestModel.js";
import SalesOrder, { PAYMENT_METHODS, SALES_PAYMENT_STATUSES } from "../model/salesOrderModel.js";
import { PRODUCT_STATUSES, isProductLowStock, isProductOutOfStock } from "../model/productModel.js";
import { buildDirectory } from "./customerDirectoryController.js";
import { writeCsv, writePdf, writeXlsx } from "./dataExportController.js";
import { permits } from "../middleware/hasPermission.js";
import { isFilterActive, likeTerm, round2, toNum } from "../utils/helpers.js";

const PREVIEW_ROWS = 100;

const money = (n) => round2(n).toFixed(2);
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const str = (v) => String(v ?? "").trim();

/** Inclusive [from, to] window on `field`; either side optional. Returns null if neither is valid. */
const dateRange = (q, field = "createdAt") => {
  const from = q.from ? new Date(`${q.from}T00:00:00`) : null;
  const to = q.to ? new Date(`${q.to}T23:59:59.999`) : null;
  const range = {};
  if (from && !Number.isNaN(from.getTime())) range[Op.gte] = from;
  if (to && !Number.isNaN(to.getTime())) range[Op.lte] = to;
  return Reflect.ownKeys(range).length ? { [field]: range } : null;
};

const inDateRange = (value, q) => {
  if (!value) return !q.from && !q.to;
  const t = new Date(value).getTime();
  if (q.from && t < new Date(`${q.from}T00:00:00`).getTime()) return false;
  if (q.to && t > new Date(`${q.to}T23:59:59.999`).getTime()) return false;
  return true;
};

const oneOf = (value, allowed) => (isFilterActive(value) && allowed.includes(value) ? value : null);

const countBy = (rows, fn) => {
  const out = {};
  for (const r of rows) {
    const k = fn(r) || "—";
    out[k] = (out[k] || 0) + 1;
  }
  return out;
};

const topEntries = (obj, n = 3) =>
  Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => `${k} (${v})`)
    .join(", ") || "—";

/**
 * Each report: `permission` (the module permission also required, on top of "reports"),
 * `fetch(query)` → raw rows, `columns`, `row(raw)` → flat row, `summary(raw[])` → KPI tiles,
 * `describe(query)` → human filter text printed in exports.
 */
export const REPORTS = {
  orders: {
    title: "Order Requests",
    file: "order-requests",
    permission: "orders",
    fetch: async (q) => {
      const where = { ...(dateRange(q) || {}) };
      const status = oneOf(q.status, ORDER_REQUEST_STATUSES);
      if (status) where.status = status;
      if (str(q.search)) {
        const term = likeTerm(q.search);
        where[Op.or] = [
          { name: { [Op.like]: term } },
          { email: { [Op.like]: term } },
          { phone: { [Op.like]: term } },
          { productName: { [Op.like]: term } },
        ];
      }
      if (str(q.product)) where.productName = { [Op.like]: likeTerm(q.product) };
      const rows = await OrderRequest.findAll({ where, order: [["createdAt", "DESC"]], raw: true });

      const ids = [...new Set(rows.map((r) => r.handledBy).filter(Boolean))];
      const staff = ids.length ? await User.findAll({ where: { id: ids }, attributes: ["id", "name"], raw: true }) : [];
      const names = Object.fromEntries(staff.map((u) => [u.id, u.name]));
      return rows.map((r) => ({ ...r, handledByName: names[r.handledBy] || "" }));
    },
    columns: [
      { key: "date", header: "Date", width: 12 },
      { key: "name", header: "Customer", width: 22 },
      { key: "phone", header: "Phone", width: 15 },
      { key: "email", header: "Email", width: 26 },
      { key: "product", header: "Product", width: 28 },
      { key: "quantity", header: "Qty", width: 6 },
      { key: "status", header: "Status", width: 14 },
      { key: "handledBy", header: "Handled By", width: 18 },
      { key: "followUp", header: "Next Follow-up", width: 14 },
    ],
    row: (r) => ({
      date: day(r.createdAt),
      name: r.name || "",
      phone: r.phone || "",
      email: r.email || "",
      product: r.productName || "",
      quantity: r.quantity ?? 1,
      status: r.status || "",
      handledBy: r.handledByName || "",
      followUp: day(r.nextFollowUpAt),
    }),
    summary: (rows) => {
      const done = rows.filter((r) => ["converted", "completed"].includes(r.status)).length;
      return [
        { label: "Total requests", value: rows.length },
        { label: "Confirmed / completed", value: done },
        { label: "Conversion rate", value: rows.length ? `${round2((done / rows.length) * 100)}%` : "0%" },
        { label: "Top products", value: topEntries(countBy(rows, (r) => r.productName)) },
      ];
    },
    describe: (q) => [
      q.status && isFilterActive(q.status) && `Status: ${q.status}`,
      q.product && `Product: ${q.product}`,
      q.search && `Search: ${q.search}`,
    ],
  },

  sales: {
    title: "Confirmed Sales",
    file: "confirmed-sales",
    permission: "orders",
    fetch: async (q) => {
      const where = { ...(dateRange(q) || {}) };
      const pay = oneOf(q.paymentStatus, SALES_PAYMENT_STATUSES);
      if (pay) where.paymentStatus = pay;
      const method = oneOf(q.paymentMethod, PAYMENT_METHODS);
      if (method) where.paymentMethod = method;
      if (str(q.search)) {
        const term = likeTerm(q.search);
        where[Op.or] = [
          { customerName: { [Op.like]: term } },
          { customerPhone: { [Op.like]: term } },
          { customerEmail: { [Op.like]: term } },
          { invoiceNumber: { [Op.like]: term } },
        ];
      }
      const min = toNum(q.minAmount, 0);
      const max = toNum(q.maxAmount, 0);
      if (min > 0 || max > 0) {
        where.total = {};
        if (min > 0) where.total[Op.gte] = min;
        if (max > 0) where.total[Op.lte] = max;
      }
      return SalesOrder.findAll({ where, order: [["createdAt", "DESC"]], raw: true });
    },
    columns: [
      { key: "date", header: "Date", width: 12 },
      { key: "invoice", header: "Invoice", width: 16 },
      { key: "customer", header: "Customer", width: 22 },
      { key: "phone", header: "Phone", width: 15 },
      { key: "items", header: "Items", width: 8 },
      { key: "total", header: "Total", width: 12 },
      { key: "paid", header: "Paid", width: 12 },
      { key: "balance", header: "Balance", width: 12 },
      { key: "payment", header: "Payment", width: 14 },
      { key: "method", header: "Method", width: 14 },
      { key: "by", header: "Created By", width: 18 },
    ],
    row: (o) => ({
      date: day(o.createdAt),
      invoice: o.invoiceNumber || "",
      customer: o.customerName || "",
      phone: o.customerPhone || "",
      items: (o.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0),
      total: money(o.total),
      paid: money(o.amountPaid),
      balance: money(o.balanceDue),
      payment: o.paymentStatus === "paid" ? "Paid" : "Advance paid",
      method: String(o.paymentMethod || "").replace("_", " "),
      by: o.createdByName || "",
    }),
    summary: (rows) => [
      { label: "Orders", value: rows.length },
      { label: "Revenue", value: `₹${money(rows.reduce((s, o) => s + (Number(o.total) || 0), 0))}` },
      { label: "Collected", value: `₹${money(rows.reduce((s, o) => s + (Number(o.amountPaid) || 0), 0))}` },
      { label: "Balance due", value: `₹${money(rows.reduce((s, o) => s + (Number(o.balanceDue) || 0), 0))}` },
    ],
    describe: (q) => [
      q.paymentStatus && isFilterActive(q.paymentStatus) && `Payment: ${q.paymentStatus}`,
      q.paymentMethod && isFilterActive(q.paymentMethod) && `Method: ${q.paymentMethod}`,
      q.minAmount && `Min ₹${q.minAmount}`,
      q.maxAmount && `Max ₹${q.maxAmount}`,
      q.search && `Search: ${q.search}`,
    ],
  },

  products: {
    title: "Products",
    file: "products",
    permission: "products",
    fetch: async (q) => {
      const where = { isDeleted: { [Op.ne]: true }, ...(dateRange(q) || {}) };
      const status = oneOf(q.status, PRODUCT_STATUSES);
      if (status) where.status = status;
      if (isFilterActive(q.category)) where.category = q.category;
      if (q.published === "yes") where.isPublished = true;
      if (q.published === "no") where.isPublished = false;
      if (str(q.search)) {
        const term = likeTerm(q.search);
        where[Op.or] = [{ name: { [Op.like]: term } }, { sku: { [Op.like]: term } }, { brand: { [Op.like]: term } }];
      }
      const min = toNum(q.minPrice, 0);
      const max = toNum(q.maxPrice, 0);
      if (min > 0 || max > 0) {
        where.price = {};
        if (min > 0) where.price[Op.gte] = min;
        if (max > 0) where.price[Op.lte] = max;
      }
      const rows = await Product.findAll({
        where,
        include: [{ model: Category, as: "categoryDetails", attributes: ["name"] }],
        order: [["createdAt", "DESC"]],
      });
      let list = rows.map((r) => r.toJSON());
      // Stock level depends on variants, so it is filtered after the fetch.
      if (q.stock === "low") list = list.filter(isProductLowStock);
      else if (q.stock === "out") list = list.filter(isProductOutOfStock);
      else if (q.stock === "in") list = list.filter((p) => !isProductOutOfStock(p));
      return list;
    },
    columns: [
      { key: "name", header: "Product", width: 30 },
      { key: "sku", header: "SKU", width: 16 },
      { key: "category", header: "Category", width: 18 },
      { key: "price", header: "Price", width: 10 },
      { key: "discountPrice", header: "Discount", width: 10 },
      { key: "stock", header: "Stock", width: 8 },
      { key: "stockLevel", header: "Stock Level", width: 12 },
      { key: "status", header: "Status", width: 12 },
      { key: "published", header: "Published", width: 10 },
      { key: "sales", header: "Sales", width: 8 },
      { key: "created", header: "Created", width: 12 },
    ],
    row: (p) => ({
      name: p.name || "",
      sku: p.sku || "",
      category: p.categoryDetails?.name || "(none)",
      price: money(p.price),
      discountPrice: money(p.discountPrice),
      stock: p.variants?.length ? p.variants.reduce((s, v) => s + (v.stock || 0), 0) : p.stock ?? 0,
      stockLevel: isProductOutOfStock(p) ? "Out of stock" : isProductLowStock(p) ? "Low" : "In stock",
      status: p.status || "",
      published: p.isPublished ? "yes" : "no",
      sales: p.salesCount || 0,
      created: day(p.createdAt),
    }),
    summary: (rows) => [
      { label: "Products", value: rows.length },
      { label: "Low stock", value: rows.filter(isProductLowStock).length },
      { label: "Out of stock", value: rows.filter(isProductOutOfStock).length },
      { label: "Published", value: rows.filter((p) => p.isPublished).length },
    ],
    describe: (q) => [
      q.status && isFilterActive(q.status) && `Status: ${q.status}`,
      q.stock && isFilterActive(q.stock) && `Stock: ${q.stock}`,
      q.published && isFilterActive(q.published) && `Published: ${q.published}`,
      q.minPrice && `Min price ₹${q.minPrice}`,
      q.maxPrice && `Max price ₹${q.maxPrice}`,
      q.search && `Search: ${q.search}`,
    ],
  },

  customers: {
    title: "Customers",
    file: "customers",
    permission: "customers",
    fetch: async (q) => {
      let items = await buildDirectory();
      if (q.type === "customers") items = items.filter((c) => c.hasOrdered);
      else if (q.type === "inquiries") items = items.filter((c) => !c.hasOrdered);

      // Date window applies to the customer's latest activity.
      items = items.filter((c) => inDateRange(c.lastActivityAt, q));

      const s = str(q.search).toLowerCase();
      if (s) {
        const digits = s.replace(/\D/g, "");
        items = items.filter(
          (c) =>
            c.name.toLowerCase().includes(s) ||
            c.email.toLowerCase().includes(s) ||
            (digits && c.phone.replace(/\D/g, "").includes(digits))
        );
      }
      const min = toNum(q.minSpent, 0);
      if (min > 0) items = items.filter((c) => c.totalSpent >= min);
      const minOrders = toNum(q.minOrders, 0);
      if (minOrders > 0) items = items.filter((c) => c.totalOrders >= minOrders);

      return items.sort((a, b) => b.totalSpent - a.totalSpent || new Date(b.lastActivityAt) - new Date(a.lastActivityAt));
    },
    columns: [
      { key: "name", header: "Name", width: 24 },
      { key: "phone", header: "Phone", width: 15 },
      { key: "email", header: "Email", width: 28 },
      { key: "type", header: "Type", width: 12 },
      { key: "orders", header: "Orders", width: 9 },
      { key: "spent", header: "Total Spent", width: 13 },
      { key: "requests", header: "Requests", width: 10 },
      { key: "enquiries", header: "Enquiries", width: 10 },
      { key: "firstSeen", header: "First Seen", width: 12 },
      { key: "lastActive", header: "Last Active", width: 12 },
    ],
    row: (c) => ({
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      type: c.hasOrdered ? "Customer" : "Inquiry",
      orders: c.totalOrders,
      spent: money(c.totalSpent),
      requests: c.productRequests,
      enquiries: c.enquiries,
      firstSeen: day(c.firstSeenAt),
      lastActive: day(c.lastActivityAt),
    }),
    summary: (rows) => [
      { label: "Contacts", value: rows.length },
      { label: "Buyers", value: rows.filter((c) => c.hasOrdered).length },
      { label: "Inquiry only", value: rows.filter((c) => !c.hasOrdered).length },
      { label: "Lifetime value", value: `₹${money(rows.reduce((s, c) => s + c.totalSpent, 0))}` },
    ],
    describe: (q) => [
      q.type && isFilterActive(q.type) && `Type: ${q.type}`,
      q.minSpent && `Min spent ₹${q.minSpent}`,
      q.minOrders && `Min orders ${q.minOrders}`,
      q.search && `Search: ${q.search}`,
    ],
  },

  enquiries: {
    title: "Enquiries",
    file: "enquiries",
    permission: "enquiries",
    fetch: async (q) => {
      const where = { ...(dateRange(q) || {}) };
      const status = oneOf(q.status, ENQUIRY_STATUSES);
      if (status) where.status = status;
      if (str(q.search)) {
        const term = likeTerm(q.search);
        where[Op.or] = [
          { name: { [Op.like]: term } },
          { email: { [Op.like]: term } },
          { phone: { [Op.like]: term } },
          { subject: { [Op.like]: term } },
          { message: { [Op.like]: term } },
        ];
      }
      const rows = await Enquiry.findAll({ where, order: [["createdAt", "DESC"]], raw: true });
      const ids = [...new Set(rows.map((r) => r.handledBy).filter(Boolean))];
      const staff = ids.length ? await User.findAll({ where: { id: ids }, attributes: ["id", "name"], raw: true }) : [];
      const names = Object.fromEntries(staff.map((u) => [u.id, u.name]));
      return rows.map((r) => ({ ...r, handledByName: names[r.handledBy] || "" }));
    },
    columns: [
      { key: "date", header: "Date", width: 12 },
      { key: "name", header: "Name", width: 22 },
      { key: "phone", header: "Phone", width: 15 },
      { key: "email", header: "Email", width: 26 },
      { key: "subject", header: "Subject", width: 30 },
      { key: "status", header: "Status", width: 13 },
      { key: "handledBy", header: "Handled By", width: 18 },
    ],
    row: (e) => ({
      date: day(e.createdAt),
      name: e.name || "",
      phone: e.phone || "",
      email: e.email || "",
      subject: e.subject || "",
      status: String(e.status || "").replace("_", " "),
      handledBy: e.handledByName || "",
    }),
    summary: (rows) => {
      const resolved = rows.filter((e) => e.status === "resolved").length;
      return [
        { label: "Enquiries", value: rows.length },
        { label: "New", value: rows.filter((e) => e.status === "new").length },
        { label: "Resolved", value: resolved },
        { label: "Resolution rate", value: rows.length ? `${round2((resolved / rows.length) * 100)}%` : "0%" },
      ];
    },
    describe: (q) => [q.status && isFilterActive(q.status) && `Status: ${q.status}`, q.search && `Search: ${q.search}`],
  },
};

const describeFilters = (report, q) => {
  const parts = [];
  if (q.from || q.to) parts.push(`Period: ${q.from || "start"} to ${q.to || "today"}`);
  parts.push(...report.describe(q).filter(Boolean));
  return parts.join(" · ");
};

// GET /api/admin/reports  — reports this admin may run
export const listReports = (req, res) => {
  const available = Object.entries(REPORTS)
    .filter(([, r]) => permits(req.adminUser, r.permission))
    .map(([key, r]) => ({ key, title: r.title }));
  return res.status(200).json({ reports: available, formats: ["csv", "xlsx", "pdf"] });
};

// GET /api/admin/reports/:type?format=json|csv|xlsx|pdf&<filters>
export const runReport = async (req, res) => {
  try {
    const report = REPORTS[req.params.type];
    if (!report) {
      return res.status(404).json({ message: `Unknown report. Available: ${Object.keys(REPORTS).join(", ")}.` });
    }
    if (!permits(req.adminUser, report.permission)) {
      return res.status(403).json({ message: `Access denied. The "${report.permission}" permission is required.` });
    }

    const q = req.query;
    const format = String(q.format || "json").toLowerCase();
    if (!["json", "csv", "xlsx", "pdf"].includes(format)) {
      return res.status(400).json({ message: "Format must be json, csv, xlsx or pdf." });
    }
    if (q.from && q.to && q.from > q.to) {
      return res.status(400).json({ message: "The 'from' date must be on or before the 'to' date." });
    }

    const raw = await report.fetch(q);
    const rows = raw.map(report.row);
    const filters = describeFilters(report, q);

    if (format === "json") {
      return res.status(200).json({
        type: req.params.type,
        title: report.title,
        columns: report.columns.map(({ key, header }) => ({ key, header })),
        rows: rows.slice(0, PREVIEW_ROWS),
        total: rows.length,
        truncated: rows.length > PREVIEW_ROWS,
        summary: report.summary(raw),
        filters,
        generatedAt: new Date().toISOString(),
      });
    }

    const filename = `${report.file}-report-${new Date().toISOString().slice(0, 10)}`;
    const ds = { title: report.title, columns: report.columns };
    if (format === "csv") return writeCsv(res, ds, rows, filename);
    if (format === "xlsx") return await writeXlsx(res, ds, rows, filename);
    return writePdf(res, ds, rows, filename, filters);
  } catch (error) {
    if (res.headersSent) return res.end();
    return res.status(500).json({ message: error.message });
  }
};
