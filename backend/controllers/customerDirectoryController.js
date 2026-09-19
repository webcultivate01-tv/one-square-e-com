import Enquiry from "../model/enquiryModel.js";
import OrderRequest from "../model/orderRequestModel.js";
import SalesOrder from "../model/salesOrderModel.js";
import { parsePaging, round2, toNum } from "../utils/helpers.js";

/**
 * Customer directory — built from contact details, not user accounts.
 * A person is a "customer" once they have a confirmed order (SalesOrder);
 * anyone who only filled a product form (OrderRequest) or the Contact form
 * (Enquiry) is listed as an "inquiry" contact until they buy.
 */

const keyOf = (phone, email, name) => {
  const digits = String(phone || "").replace(/\D/g, "").slice(-10);
  if (digits.length >= 7) return `p:${digits}`;
  const mail = String(email || "").trim().toLowerCase();
  if (mail) return `e:${mail}`;
  return `n:${String(name || "").trim().toLowerCase()}`;
};

const later = (a, b) => (!a || new Date(b) > new Date(a) ? b : a);

const SORTS = {
  recent: (a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt),
  oldest: (a, b) => new Date(a.firstSeenAt) - new Date(b.firstSeenAt),
  name_asc: (a, b) => a.name.localeCompare(b.name),
  name_desc: (a, b) => b.name.localeCompare(a.name),
  top_spender: (a, b) => b.totalSpent - a.totalSpent,
  most_orders: (a, b) => b.totalOrders - a.totalOrders,
  last_order: (a, b) => new Date(b.lastOrderAt || 0) - new Date(a.lastOrderAt || 0),
};

export const buildDirectory = async () => {
  const [orders, requests, enquiries] = await Promise.all([
    SalesOrder.findAll({ raw: true }),
    OrderRequest.findAll({ raw: true }),
    Enquiry.findAll({ raw: true }),
  ]);

  const map = new Map();
  const touch = (phone, email, name, address, at) => {
    const key = keyOf(phone, email, name);
    let c = map.get(key);
    if (!c) {
      c = {
        _id: key,
        name: name || "Unknown",
        phone: phone || "",
        email: email || "",
        address: address || "",
        totalOrders: 0,
        totalSpent: 0,
        lastOrderAt: null,
        productRequests: 0,
        enquiries: 0,
        products: new Set(),
        firstSeenAt: at,
        lastActivityAt: at,
      };
      map.set(key, c);
    }
    // Fill gaps and prefer the most recent details.
    if (!c.phone && phone) c.phone = phone;
    if (!c.email && email) c.email = email;
    if (!c.address && address) c.address = address;
    if (new Date(at) < new Date(c.firstSeenAt)) c.firstSeenAt = at;
    c.lastActivityAt = later(c.lastActivityAt, at);
    return c;
  };

  for (const o of orders) {
    const c = touch(o.customerPhone, o.customerEmail, o.customerName, o.customerAddress, o.createdAt);
    c.totalOrders += 1;
    c.totalSpent += Number(o.total) || 0;
    c.lastOrderAt = later(c.lastOrderAt, o.createdAt);
    for (const it of o.items || []) if (it?.name) c.products.add(it.name);
  }
  for (const r of requests) {
    const c = touch(r.phone, r.email, r.name, r.address, r.createdAt);
    c.productRequests += 1;
    if (r.productName) c.products.add(r.productName);
  }
  for (const e of enquiries) {
    const c = touch(e.phone, e.email, e.name, "", e.createdAt);
    c.enquiries += 1;
  }

  return [...map.values()].map((c) => ({
    ...c,
    totalSpent: round2(c.totalSpent),
    products: [...c.products].slice(0, 5),
    hasOrdered: c.totalOrders > 0,
  }));
};

// GET /api/admin/customers/directory?view=customers|inquiries|all
export const listCustomerDirectory = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 15 });
    const view = ["customers", "inquiries", "all"].includes(req.query.view) ? req.query.view : "customers";
    const sortFn = SORTS[req.query.sort] || SORTS.recent;

    const everyone = await buildDirectory();
    const counts = {
      customers: everyone.filter((c) => c.hasOrdered).length,
      inquiries: everyone.filter((c) => !c.hasOrdered).length,
      all: everyone.length,
    };

    let items = everyone;
    if (view === "customers") items = items.filter((c) => c.hasOrdered);
    if (view === "inquiries") items = items.filter((c) => !c.hasOrdered);

    const q = String(req.query.search || "").trim().toLowerCase();
    if (q) {
      const qDigits = q.replace(/\D/g, "");
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (qDigits && c.phone.replace(/\D/g, "").includes(qDigits)) ||
          c.products.some((p) => p.toLowerCase().includes(q))
      );
    }

    const minSpent = toNum(req.query.minSpent, 0);
    if (minSpent > 0) items = items.filter((c) => c.totalSpent >= minSpent);

    // Buyers always come first; the chosen sort orders within each group.
    items.sort((a, b) => Number(b.hasOrdered) - Number(a.hasOrdered) || sortFn(a, b));

    const total = items.length;
    return res.status(200).json({
      customers: items.slice(skip, skip + limit),
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      counts,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
