import { Op } from "sequelize";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import User, { STAFF_ROLES } from "../model/userModel.js";
import Product from "../model/productModel.js";
import Category from "../model/categoryModel.js";
import Order from "../model/orderModel.js";

const money = (n) => (Number(n) || 0).toFixed(2);
const date = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const USER_ROLE_LIVE = { role: "user", isDeleted: { [Op.ne]: true } };

/**
 * The dataset registry: each entry declares HOW TO FETCH, HOW TO FLATTEN a row
 * and THE COLUMN ORDER — shared by all three writers. Adding a dataset is one
 * object; nothing else changes.
 */
export const DATASETS = {
  users: {
    title: "Customers",
    file: "customers",
    count: () => User.count({ where: USER_ROLE_LIVE }),
    fetch: () =>
      User.findAll({
        where: USER_ROLE_LIVE,
        attributes: { exclude: ["password", "otp", "otpExpiry", "notes"] },
        order: [["createdAt", "DESC"]],
        raw: true,
      }),
    columns: [
      { key: "_id", header: "Customer ID", width: 26 },
      { key: "name", header: "Name", width: 24 },
      { key: "email", header: "Email", width: 28 },
      { key: "phone", header: "Phone", width: 16 },
      { key: "status", header: "Status", width: 12 },
      { key: "verified", header: "Verified", width: 10 },
      { key: "city", header: "City", width: 16 },
      { key: "country", header: "Country", width: 16 },
      { key: "logins", header: "Logins", width: 9 },
      { key: "joined", header: "Joined", width: 12 },
    ],
    row: (u) => ({
      _id: String(u.id),
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      status: u.customerStatus || "active",
      verified: u.isVerified ? "yes" : "no",
      city: u.address?.city || "",
      country: u.address?.country || "",
      logins: u.loginCount || 0,
      joined: date(u.createdAt),
    }),
  },

  products: {
    title: "Products",
    file: "products",
    count: () => Product.count({ where: { isDeleted: { [Op.ne]: true } } }),
    fetch: async () => {
      const rows = await Product.findAll({
        where: { isDeleted: { [Op.ne]: true } },
        include: [{ model: Category, as: "categoryDetails", attributes: ["name"] }],
        order: [["createdAt", "DESC"]],
      });
      return rows.map((r) => r.toJSON());
    },
    columns: [
      { key: "_id", header: "Product ID", width: 26 },
      { key: "name", header: "Name", width: 30 },
      { key: "sku", header: "SKU", width: 16 },
      { key: "category", header: "Category", width: 18 },
      { key: "price", header: "Price", width: 10 },
      { key: "discountPrice", header: "Discount", width: 10 },
      { key: "stock", header: "Stock", width: 8 },
      { key: "status", header: "Status", width: 12 },
      { key: "published", header: "Published", width: 10 },
      { key: "sales", header: "Sales", width: 8 },
      { key: "created", header: "Created", width: 12 },
    ],
    row: (p) => ({
      _id: String(p.id),
      name: p.name || "",
      sku: p.sku || "",
      category: p.categoryDetails?.name || "(none)",
      price: money(p.price),
      discountPrice: money(p.discountPrice),
      stock: p.stock ?? 0,
      status: p.status || "",
      published: p.isPublished ? "yes" : "no",
      sales: p.salesCount || 0,
      created: date(p.createdAt),
    }),
  },

  categories: {
    title: "Categories",
    file: "categories",
    count: () => Category.count(),
    fetch: () => Category.findAll({ order: [["name", "ASC"]], raw: true }),
    columns: [
      { key: "_id", header: "Category ID", width: 26 },
      { key: "name", header: "Name", width: 24 },
      { key: "slug", header: "Slug", width: 24 },
      { key: "active", header: "Active", width: 9 },
      { key: "description", header: "Description", width: 40 },
      { key: "created", header: "Created", width: 12 },
    ],
    row: (c) => ({
      _id: String(c.id),
      name: c.name || "",
      slug: c.slug || "",
      active: c.isActive ? "yes" : "no",
      description: c.description || "",
      created: date(c.createdAt),
    }),
  },

  orders: {
    title: "Orders",
    file: "orders",
    count: () => Order.count(),
    fetch: async () => {
      const rows = await Order.findAll({
        include: [{ model: User, as: "userDetails", attributes: ["name", "email"] }],
        order: [["createdAt", "DESC"]],
      });
      return rows.map((r) => r.toJSON());
    },
    columns: [
      { key: "_id", header: "Order ID", width: 26 },
      { key: "customer", header: "Customer", width: 22 },
      { key: "email", header: "Email", width: 26 },
      { key: "items", header: "Items", width: 8 },
      { key: "subtotal", header: "Subtotal", width: 11 },
      { key: "tax", header: "Tax", width: 9 },
      { key: "shipping", header: "Shipping", width: 10 },
      { key: "total", header: "Total", width: 11 },
      { key: "status", header: "Status", width: 12 },
      { key: "paymentStatus", header: "Payment", width: 16 },
      { key: "placed", header: "Placed", width: 12 },
    ],
    row: (o) => ({
      _id: String(o.id),
      customer: o.userDetails?.name || "(deleted)",
      email: o.userDetails?.email || o.shippingAddress?.email || "",
      items: (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0),
      subtotal: money(o.subtotal),
      tax: money(o.tax),
      shipping: money(o.shippingCost),
      total: money(o.total),
      status: o.status || "",
      paymentStatus: o.paymentStatus || "",
      placed: date(o.createdAt),
    }),
  },

  employees: {
    title: "Employees",
    file: "employees",
    count: () => User.count({ where: { role: { [Op.in]: STAFF_ROLES } } }),
    fetch: async () => {
      const rows = await User.findAll({
        where: { role: { [Op.in]: STAFF_ROLES } },
        attributes: { exclude: ["password", "otp", "otpExpiry", "notes"] },
        include: [{ model: User, as: "createdByDetails", attributes: ["name"] }],
        order: [["createdAt", "DESC"]],
      });
      return rows.map((r) => r.toJSON());
    },
    columns: [
      { key: "_id", header: "Employee ID", width: 26 },
      { key: "name", header: "Name", width: 24 },
      { key: "email", header: "Email", width: 28 },
      { key: "role", header: "Role", width: 14 },
      { key: "active", header: "Active", width: 9 },
      { key: "permissions", header: "Permissions", width: 34 },
      { key: "lastLogin", header: "Last Login", width: 12 },
      { key: "createdBy", header: "Created By", width: 20 },
    ],
    row: (u) => ({
      _id: String(u.id),
      name: u.name || "",
      email: u.email || "",
      role: u.role || "",
      active: u.isActive ? "yes" : "no",
      permissions: (u.permissions || []).join(", "),
      lastLogin: date(u.lastLogin),
      createdBy: u.createdByDetails?.name || "",
    }),
  },
};

// GET /api/admin/export
export const listDatasets = async (req, res) => {
  try {
    const keys = Object.keys(DATASETS);
    const counts = await Promise.all(keys.map((k) => DATASETS[k].count()));
    return res.status(200).json({
      datasets: keys.map((key, i) => ({
        key,
        title: DATASETS[key].title,
        count: counts[i],
      })),
      formats: ["csv", "xlsx", "pdf"],
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ---------------------------------------------------------------- writers */

const csvEscape = (v) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const writeCsv = (res, ds, rows, filename) => {
  const lines = [ds.columns.map((c) => csvEscape(c.header)).join(",")];
  for (const r of rows) {
    lines.push(ds.columns.map((c) => csvEscape(r[c.key])).join(","));
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
  // UTF-8 BOM so Excel opens the file with the right encoding.
  return res.status(200).send(`﻿${lines.join("\r\n")}`);
};

export const writeXlsx = async (res, ds, rows, filename) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "GOBOXLY Admin";
  wb.created = new Date();
  const ws = wb.addWorksheet(ds.title);

  ws.columns = ds.columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 18 }));

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  header.alignment = { vertical: "middle" };
  header.height = 22;
  header.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FF1E40AF" } },
      left: { style: "thin", color: { argb: "FF1E40AF" } },
      bottom: { style: "thin", color: { argb: "FF1E40AF" } },
      right: { style: "thin", color: { argb: "FF1E40AF" } },
    };
  });

  rows.forEach((r, i) => {
    const row = ws.addRow(r);
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      });
    }
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ds.columns.length },
  };

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
  const buffer = await wb.xlsx.writeBuffer();
  return res.status(200).send(Buffer.from(buffer));
};

export const writePdf = (res, ds, rows, filename, subtitle = "") => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);

  // bufferPages is required for the "Page N of M" footer pass below.
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 36,
    bufferPages: true,
  });
  doc.pipe(res);

  const left = doc.page.margins.left;
  const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const totalWidth = ds.columns.reduce((s, c) => s + (c.width || 18), 0);
  const widths = ds.columns.map((c) =>
    Math.max(45, ((c.width || 18) / totalWidth) * usable)
  );
  const scale = usable / widths.reduce((a, b) => a + b, 0);
  const colWidths = widths.map((w) => w * scale);

  const ROW_H = 18;
  const HEADER_H = 22;

  const drawHeaderBand = (y) => {
    doc.save();
    doc.rect(left, y, usable, HEADER_H).fill("#1E3A8A");
    doc.restore();
    doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold");
    let x = left;
    ds.columns.forEach((c, i) => {
      doc.text(String(c.header).toUpperCase(), x + 4, y + 7, {
        width: colWidths[i] - 8,
        ellipsis: true,
        lineBreak: false,
      });
      x += colWidths[i];
    });
    doc.fillColor("#0F172A").font("Helvetica");
    return y + HEADER_H;
  };

  // Title block
  doc.fillColor("#0F172A").fontSize(16).font("Helvetica-Bold").text(`GOBOXLY — ${ds.title}`, left, 36);
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#64748B")
    .text(`Generated ${new Date().toLocaleString()} · ${rows.length} record(s)${subtitle ? ` · ${subtitle}` : ""}`, left, 56);

  let y = drawHeaderBand(78);
  const bottom = doc.page.height - doc.page.margins.bottom - 24;

  rows.forEach((r, idx) => {
    if (y + ROW_H > bottom) {
      doc.addPage();
      y = drawHeaderBand(doc.page.margins.top);
    }
    if (idx % 2 === 1) {
      doc.save();
      doc.rect(left, y, usable, ROW_H).fill("#F8FAFC");
      doc.restore();
    }
    doc.fillColor("#0F172A").fontSize(8).font("Helvetica");
    let x = left;
    ds.columns.forEach((c, i) => {
      doc.text(String(r[c.key] ?? ""), x + 4, y + 5, {
        width: colWidths[i] - 8,
        ellipsis: true,
        lineBreak: false,
      });
      x += colWidths[i];
    });
    y += ROW_H;
  });

  // Page footer: "Page N of M"
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor("#94A3B8")
      .text(
        `Page ${i - range.start + 1} of ${range.count}`,
        left,
        doc.page.height - doc.page.margins.bottom - 12,
        { width: usable, align: "center", lineBreak: false }
      );
  }

  doc.end();
  return null;
};

// GET /api/admin/export/:dataset?format=csv|xlsx|pdf
export const exportDataset = async (req, res) => {
  try {
    const { dataset } = req.params;
    const format = String(req.query.format || "xlsx").toLowerCase();

    const ds = DATASETS[dataset];
    if (!ds) {
      return res.status(404).json({
        message: `Unknown dataset "${dataset}". Available: ${Object.keys(DATASETS).join(", ")}.`,
      });
    }
    if (!["csv", "xlsx", "pdf"].includes(format)) {
      return res.status(400).json({ message: "Format must be csv, xlsx or pdf." });
    }

    const docs = await ds.fetch();
    const rows = docs.map(ds.row);
    const filename = `${ds.file}-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") return writeCsv(res, ds, rows, filename);
    if (format === "xlsx") return await writeXlsx(res, ds, rows, filename);
    return writePdf(res, ds, rows, filename);
  } catch (error) {
    // The response may already be streaming.
    if (res.headersSent) return res.end();
    return res.status(500).json({ message: error.message });
  }
};
