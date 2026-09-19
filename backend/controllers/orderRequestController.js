import { Op } from "sequelize";
import validator from "validator";
import OrderRequest, { ORDER_REQUEST_STATUSES, canMoveStatus } from "../model/orderRequestModel.js";
import Product from "../model/productModel.js";
import { sendMail } from "../config/nodemailer.js";
import { isFilterActive, isValidId, likeTerm, parsePaging } from "../utils/helpers.js";

const inbox = () => process.env.CONTACT_EMAIL || process.env.EMAIL_USER;

const PRODUCT_INCLUDE = { model: Product, as: "productDetails", attributes: ["id", "name", "images", "slug"] };

const OPEN = ["pending", "contacted"];

/** Tabs on the Orders page. */
const VIEWS = {
  pending: { where: { status: { [Op.in]: OPEN } } },
  follow_up: {
    where: { status: { [Op.in]: OPEN }, nextFollowUpAt: { [Op.ne]: null } },
    order: [["nextFollowUpAt", "ASC"]],
  },
  spam: { where: { status: "spam" } },
  not_interested: { where: { status: "not_interested" } },
  confirmed: { where: { status: "converted" } },
  completed: { where: { status: "completed" } },
  cancelled: { where: { status: "cancelled" } },
};

const toOrderRequestDTO =(r) => {
  if (!r) return null;
  const o = typeof r.toJSON === "function" ? r.toJSON() : r;
  return {
    _id: o.id,
    product: o.productDetails
      ? { _id: o.productDetails.id, name: o.productDetails.name, images: o.productDetails.images, slug: o.productDetails.slug }
      : null,
    productName: o.productName,
    quantity: o.quantity,
    name: o.name,
    email: o.email,
    phone: o.phone,
    address: o.address,
    message: o.message || "",
    status: o.status,
    nextFollowUpAt: o.nextFollowUpAt || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

// POST /api/order-request/create   (public)
export const createOrderRequest = async (req, res) => {
  try {
    const { name, email, phone, address, message = "", productId = "", productName = "", quantity = 1 } = req.body || {};

    if (!name || !email || !phone || !address) {
      return res.status(400).json({ message: "Name, email, phone and address are required." });
    }
    if (!validator.isEmail(String(email))) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    const resolvedQuantity = Number.parseInt(quantity, 10);
    if (!Number.isInteger(resolvedQuantity) || resolvedQuantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1." });
    }

    let product = null;
    if (productId && isValidId(productId)) {
      product = await Product.findByPk(productId);
    }
    const resolvedProductName = product?.name || String(productName || "").trim();
    if (!resolvedProductName) {
      return res.status(400).json({ message: "Product name is required." });
    }

    const request = await OrderRequest.create({
      product: product?.id || null,
      productName: resolvedProductName,
      quantity: resolvedQuantity,
      name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      address: String(address).trim(),
      message: String(message).trim(),
    });

    const to = inbox();
    if (to) {
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;background:#f7f8fa;padding:32px">
          <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
            <div style="background:#264796;padding:20px 24px;color:#fff;font-weight:800;letter-spacing:1px">ONE SQUARE ASSOCIATES</div>
            <div style="padding:24px;color:#334155;font-size:14px;line-height:1.6">
              <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px">New Buy Now request: ${resolvedProductName}</h2>
              <p><b>Quantity:</b> ${request.quantity}</p>
              <p><b>Name:</b> ${request.name}</p>
              <p><b>Email:</b> ${request.email}</p>
              <p><b>Phone:</b> ${request.phone}</p>
              <p style="white-space:pre-wrap"><b>Address:</b><br/>${request.address}</p>
              ${request.message ? `<p style="white-space:pre-wrap"><b>Message:</b><br/>${request.message}</p>` : ""}
            </div>
          </div>
        </div>`;

      sendMail({
        to,
        subject: `[Buy Now] ${resolvedProductName}`,
        html,
        text: `${resolvedProductName}\n\nQuantity: ${request.quantity}\nName: ${request.name}\nEmail: ${request.email}\nPhone: ${request.phone}\nAddress: ${request.address}\n\n${request.message}`,
      }).catch((e) => console.warn("[order-request] send failed:", e.message));
    }

    return res.status(201).json({
      request: toOrderRequestDTO(request),
      message: "Thanks! Your request has been received — our team will contact you shortly.",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/order-request/getall   (admin)
export const getAllOrderRequests = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaging(req.query);
    const dbWhere = {};

    // `view` powers the Orders tabs; a plain `status` filter still works.
    const view = VIEWS[req.query.view];
    if (view) Object.assign(dbWhere, view.where);
    else if (isFilterActive(req.query.status)) dbWhere.status = req.query.status;

    if (req.query.search) {
      const term = likeTerm(req.query.search);
      dbWhere[Op.or] = [
        { name: { [Op.like]: term } },
        { email: { [Op.like]: term } },
        { phone: { [Op.like]: term } },
        { productName: { [Op.like]: term } },
      ];
    }

    const { rows, count } = await OrderRequest.findAndCountAll({
      where: dbWhere,
      include: [PRODUCT_INCLUDE],
      order: view?.order || [["createdAt", "DESC"]],
      offset: skip,
      limit,
    });

    return res.status(200).json({
      requests: rows.map(toOrderRequestDTO),
      total: count,
      page,
      pages: Math.max(1, Math.ceil(count / limit)),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/order-request/:id   (admin)
export const getOrderRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid request ID." });

    const request = await OrderRequest.findByPk(id, { include: [PRODUCT_INCLUDE] });
    if (!request) return res.status(404).json({ message: "Request not found." });

    return res.status(200).json({ request: toOrderRequestDTO(request) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/order-request/status/:id   (admin)
export const updateOrderRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!isValidId(id)) return res.status(400).json({ message: "Invalid request ID." });
    if (!ORDER_REQUEST_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${ORDER_REQUEST_STATUSES.join(", ")}.` });
    }

    const request = await OrderRequest.findByPk(id);
    if (!request) return res.status(404).json({ message: "Request not found." });

    if (!canMoveStatus(request.status, status)) {
      return res.status(400).json({ message: `Can't move a "${request.status}" request back to "${status}".` });
    }

    request.status = status;
    request.handledBy = req.adminUser?.id || null;
    await request.save();

    const full = await OrderRequest.findByPk(id, { include: [PRODUCT_INCLUDE] });

    return res.status(200).json({ request: toOrderRequestDTO(full), message: `Marked as ${status}.` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
