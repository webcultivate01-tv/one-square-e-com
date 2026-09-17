import { Op, where, col } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import Product, { isProductLowStock, isProductOutOfStock } from "../model/productModel.js";
import Category from "../model/categoryModel.js";
import {
  commitProductImages,
  deleteProductImageFolder,
  deleteProductImageUrls,
  moveProductImageFolder,
  remapProductImageUrls,
} from "../utils/productImageStorage.js";
import {
  buildUniqueSlug,
  isValidId,
  isFilterActive,
  likeTerm,
  parsePaging,
  resolveSort,
  safeJson,
  toBool,
  toNum,
  toSlug,
  toStringArray,
} from "../utils/helpers.js";
import { toProductDTO } from "../utils/dto.js";

const SORT_MAP = {
  newest: [["createdAt", "DESC"]],
  oldest: [["createdAt", "ASC"]],
  price_asc: [["price", "ASC"]],
  price_desc: [["price", "DESC"]],
  name_asc: [["name", "ASC"]],
  stock_asc: [["stock", "ASC"]],
  stock_desc: [["stock", "DESC"]],
};

const VISIBILITY_FIELD = {
  featured: "isFeatured",
  bestseller: "isBestseller",
  trending: "isTrending",
  newArrival: "isNewArrival",
};

const CATEGORY_INCLUDE = { model: Category, as: "categoryDetails", attributes: ["id", "name", "slug"] };

/** Attach the JS-computed low-stock / out-of-stock virtuals before building a DTO. */
const withVirtuals = (p) => {
  if (!p) return p;
  const o = typeof p.toJSON === "function" ? p.toJSON() : p;
  return { ...o, isLowStock: isProductLowStock(o), isOutOfStock: isProductOutOfStock(o) };
};

/** Clean + type-coerce the variants array coming from the client. */
export const normaliseVariants = (raw) => {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((v) => ({
    id: v._id || v.id || uuidv4(),
    sku: String(v.sku || "").trim(),
    options: v.options && typeof v.options === "object" ? v.options : {},
    price: Math.max(0, toNum(v.price, 0)),
    discountPrice: Math.max(0, toNum(v.discountPrice, 0)),
    stock: Math.max(0, Math.trunc(toNum(v.stock, 0))),
    images: Array.isArray(v.images) ? v.images.filter(Boolean) : [],
    isAvailable: toBool(v.isAvailable, true),
  }));
};

/** Returns the offending SKU, or null when every variant SKU is unique. */
export const detectDuplicateVariantSku = (variants = []) => {
  const seen = new Set();
  for (const v of variants) {
    const sku = String(v.sku || "").trim().toLowerCase();
    if (!sku) continue;
    if (seen.has(sku)) return v.sku;
    seen.add(sku);
  }
  return null;
};

/** Shared body parser for create + update (multipart aware). */
const readProductBody = (body = {}) => {
  const out = {};
  const set = (key, value) => {
    if (value !== undefined) out[key] = value;
  };

  if (body.name !== undefined) set("name", String(body.name).trim());
  if (body.description !== undefined) set("description", String(body.description));
  if (body.richDescription !== undefined) set("richDescription", String(body.richDescription));
  if (body.sku !== undefined) {
    const sku = String(body.sku).trim();
    set("sku", sku === "" ? null : sku);
  }
  if (body.brand !== undefined) set("brand", String(body.brand).trim());
  if (body.category !== undefined) set("category", body.category);
  if (body.subcategory !== undefined) set("subcategory", String(body.subcategory).trim());
  if (body.tags !== undefined) set("tags", toStringArray(body.tags));

  if (body.price !== undefined) set("price", Math.max(0, toNum(body.price, 0)));
  if (body.discountPrice !== undefined)
    set("discountPrice", Math.max(0, toNum(body.discountPrice, 0)));
  if (body.costPrice !== undefined) set("costPrice", Math.max(0, toNum(body.costPrice, 0)));
  if (body.tax !== undefined) set("tax", Math.max(0, toNum(body.tax, 0)));
  if (body.currency !== undefined) set("currency", String(body.currency || "USD"));

  if (body.stock !== undefined) set("stock", Math.max(0, Math.trunc(toNum(body.stock, 0))));
  if (body.lowStockThreshold !== undefined)
    set("lowStockThreshold", Math.max(0, Math.trunc(toNum(body.lowStockThreshold, 10))));
  if (body.minOrderQuantity !== undefined)
    set("minOrderQuantity", Math.max(1, Math.trunc(toNum(body.minOrderQuantity, 1))));
  if (body.maxOrderQuantity !== undefined)
    set("maxOrderQuantity", Math.max(1, Math.trunc(toNum(body.maxOrderQuantity, 9999))));

  if (body.weight !== undefined) set("weight", Math.max(0, toNum(body.weight, 0)));
  if (body.dimensions !== undefined) {
    const d = safeJson(body.dimensions, {}) || {};
    set("dimensions", {
      length: Math.max(0, toNum(d.length, 0)),
      width: Math.max(0, toNum(d.width, 0)),
      height: Math.max(0, toNum(d.height, 0)),
    });
  }
  if (body.shippingCost !== undefined)
    set("shippingCost", Math.max(0, toNum(body.shippingCost, 0)));
  if (body.deliveryEstimate !== undefined)
    set("deliveryEstimate", String(body.deliveryEstimate).trim());

  if (body.metaTitle !== undefined) set("metaTitle", String(body.metaTitle).trim());
  if (body.metaDescription !== undefined)
    set("metaDescription", String(body.metaDescription).trim());
  if (body.seoKeywords !== undefined) set("seoKeywords", toStringArray(body.seoKeywords));

  if (body.isFeatured !== undefined) set("isFeatured", toBool(body.isFeatured));
  if (body.isBestseller !== undefined) set("isBestseller", toBool(body.isBestseller));
  if (body.isTrending !== undefined) set("isTrending", toBool(body.isTrending));
  if (body.isNewArrival !== undefined) set("isNewArrival", toBool(body.isNewArrival));

  if (body.status !== undefined) set("status", String(body.status));
  if (body.isPublished !== undefined) set("isPublished", toBool(body.isPublished));

  return out;
};

const validateProduct = (data, { isCreate }) => {
  if (isCreate && !data.name) return "Product name is required.";
  if (data.name !== undefined && !data.name) return "Product name is required.";
  if (isCreate && !data.category) return "Category is required.";
  if (data.category !== undefined && !isValidId(data.category))
    return "A valid category is required.";
  if (data.price !== undefined && data.price < 0) return "Price cannot be negative.";
  if (
    data.discountPrice !== undefined &&
    data.price !== undefined &&
    data.discountPrice > 0 &&
    data.discountPrice > data.price
  ) {
    return "Discount price cannot exceed the price.";
  }
  if (
    data.minOrderQuantity !== undefined &&
    data.maxOrderQuantity !== undefined &&
    data.maxOrderQuantity < data.minOrderQuantity
  ) {
    return "Maximum order quantity must be greater than or equal to the minimum.";
  }
  return null;
};

const lowStockClause = () => where(col("stock"), Op.lte, col("lowStockThreshold"));

// GET /api/product/getpublished   (public)
export const getPublishedProducts = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 24 });
    const dbWhere = {
      isDeleted: { [Op.ne]: true },
      isPublished: true,
      status: { [Op.in]: ["active", "out_of_stock"] },
    };

    if (isFilterActive(req.query.category) && isValidId(req.query.category)) {
      dbWhere.category = req.query.category;
    }
    if (req.query.q) {
      const term = likeTerm(req.query.q);
      dbWhere[Op.or] = [
        { name: { [Op.like]: term } },
        { brand: { [Op.like]: term } },
        { tags: { [Op.like]: term } },
      ];
    }

    const order = resolveSort(SORT_MAP, req.query.sort, "newest");

    const { rows, count } = await Product.findAndCountAll({
      where: dbWhere,
      include: [CATEGORY_INCLUDE],
      order,
      offset: skip,
      limit,
    });

    return res.status(200).json({
      products: rows.map((p) => toProductDTO(withVirtuals(p))),
      pagination: { page, limit, total: count, pages: Math.max(1, Math.ceil(count / limit)) },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/product/getall   (admin)
export const getAllProducts = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaging(req.query);
    const dbWhere = {};
    const andClauses = [];

    if (toBool(req.query.includeDeleted) !== true) dbWhere.isDeleted = { [Op.ne]: true };

    if (req.query.q) {
      const term = likeTerm(req.query.q);
      dbWhere[Op.or] = [
        { name: { [Op.like]: term } },
        { slug: { [Op.like]: term } },
        { sku: { [Op.like]: term } },
        { brand: { [Op.like]: term } },
        { tags: { [Op.like]: term } },
      ];
    }
    if (isFilterActive(req.query.category) && isValidId(req.query.category)) {
      dbWhere.category = req.query.category;
    }
    if (isFilterActive(req.query.status)) dbWhere.status = req.query.status;

    if (isFilterActive(req.query.visibility)) {
      const field = VISIBILITY_FIELD[req.query.visibility];
      if (field) dbWhere[field] = true;
    }

    if (isFilterActive(req.query.stock)) {
      if (req.query.stock === "out") dbWhere.stock = { [Op.lte]: 0 };
      else if (req.query.stock === "in") dbWhere.stock = { [Op.gt]: 0 };
      else if (req.query.stock === "low") {
        dbWhere.stock = { [Op.gt]: 0 };
        andClauses.push(lowStockClause());
      }
    }

    const minPrice = toNum(req.query.minPrice, NaN);
    const maxPrice = toNum(req.query.maxPrice, NaN);
    if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
      dbWhere.price = {};
      if (Number.isFinite(minPrice)) dbWhere.price[Op.gte] = minPrice;
      if (Number.isFinite(maxPrice)) dbWhere.price[Op.lte] = maxPrice;
    }

    if (andClauses.length) dbWhere[Op.and] = andClauses;

    const order = resolveSort(SORT_MAP, req.query.sort, "newest");

    const { rows, count } = await Product.findAndCountAll({
      where: dbWhere,
      include: [CATEGORY_INCLUDE],
      order,
      offset: skip,
      limit,
    });

    return res.status(200).json({
      products: rows.map((p) => toProductDTO(withVirtuals(p))),
      pagination: { page, limit, total: count, pages: Math.max(1, Math.ceil(count / limit)) },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/product/stats   (admin)
export const getProductStats = async (req, res) => {
  try {
    const live = { isDeleted: { [Op.ne]: true } };
    const [total, active, drafts, outOfStock, archived, deleted, lowStock, bestsellers] =
      await Promise.all([
        Product.count({ where: live }),
        Product.count({ where: { ...live, status: "active" } }),
        Product.count({ where: { ...live, status: "draft" } }),
        Product.count({ where: { ...live, status: "out_of_stock" } }),
        Product.count({ where: { ...live, status: "archived" } }),
        Product.count({ where: { isDeleted: true } }),
        Product.count({ where: { ...live, stock: { [Op.gt]: 0 }, [Op.and]: [lowStockClause()] } }),
        Product.findAll({
          where: live,
          order: [["salesCount", "DESC"]],
          limit: 5,
          attributes: ["id", "name", "images", "price", "salesCount", "stock"],
        }),
      ]);

    return res.status(200).json({
      stats: { total, active, drafts, outOfStock, archived, deleted, lowStock },
      bestsellers: bestsellers.map((b) => ({ ...b.toJSON(), _id: b.id })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/product/inventory   (admin) — flat, variant-aware inventory report
export const getInventory = async (req, res) => {
  try {
    const rows = await Product.findAll({
      where: { isDeleted: { [Op.ne]: true } },
      include: [{ model: Category, as: "categoryDetails", attributes: ["name"] }],
      attributes: ["id", "name", "sku", "stock", "lowStockThreshold", "variants", "status", "images", "price"],
      order: [["stock", "ASC"]],
    });

    const flat = [];
    for (const row of rows) {
      const p = row.toJSON();
      if (p.variants?.length) {
        for (const v of p.variants) {
          flat.push({
            productId: p.id,
            name: p.name,
            variant: v.options ? Object.values(v.options).join(" / ") : "",
            sku: v.sku || p.sku || "",
            stock: v.stock || 0,
            lowStockThreshold: p.lowStockThreshold ?? 10,
            category: p.categoryDetails?.name || "",
            status: p.status,
            isLow: (v.stock || 0) > 0 && (v.stock || 0) <= (p.lowStockThreshold ?? 10),
            isOut: (v.stock || 0) <= 0,
          });
        }
      } else {
        flat.push({
          productId: p.id,
          name: p.name,
          variant: "",
          sku: p.sku || "",
          stock: p.stock || 0,
          lowStockThreshold: p.lowStockThreshold ?? 10,
          category: p.categoryDetails?.name || "",
          status: p.status,
          isLow: (p.stock || 0) > 0 && (p.stock || 0) <= (p.lowStockThreshold ?? 10),
          isOut: (p.stock || 0) <= 0,
        });
      }
    }

    return res.status(200).json({ inventory: flat, total: flat.length });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/product/create   (admin, multipart)
export const createProduct = async (req, res) => {
  try {
    const data = readProductBody(req.body);

    const problem = validateProduct(data, { isCreate: true });
    if (problem) return res.status(400).json({ message: problem });

    const categoryExists = await Category.findByPk(data.category);
    if (!categoryExists) return res.status(400).json({ message: "Category not found." });

    if (data.sku) {
      const clash = await Product.findOne({ where: { sku: data.sku } });
      if (clash) return res.status(409).json({ message: `SKU "${data.sku}" is already in use.` });
    }

    const variants = normaliseVariants(safeJson(req.body.variants, []));
    const dupe = detectDuplicateVariantSku(variants);
    if (dupe) return res.status(409).json({ message: `Duplicate variant SKU "${dupe}".` });

    const productId = uuidv4();
    const categorySlug = categoryExists.slug || toSlug(categoryExists.name);
    const uploaded = commitProductImages(req.files || [], categorySlug, productId);
    const pastedUrls = toStringArray(safeJson(req.body.imageUrls, []));

    const product = await Product.create({
      id: productId,
      ...data,
      variants,
      images: [...pastedUrls, ...uploaded],
      slug: await buildUniqueSlug(Product, data.name),
      createdBy: req.adminUser?.id || null,
      updatedBy: req.adminUser?.id || null,
    });

    const full = await Product.findByPk(product.id, { include: [CATEGORY_INCLUDE] });

    return res.status(201).json({ product: toProductDTO(withVirtuals(full)), message: "Product created." });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      const field = error.errors?.[0]?.path || "value";
      return res.status(409).json({ message: `Duplicate ${field}. It is already in use.` });
    }
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/product/update/:id   (admin, multipart)
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid product ID." });

    const product = await Product.findByPk(id, { include: [CATEGORY_INCLUDE] });
    if (!product) return res.status(404).json({ message: "Product not found." });

    let categorySlug = product.categoryDetails?.slug || toSlug(String(product.category));
    const originalCategorySlug = categorySlug;

    const data = readProductBody(req.body);

    // Merge with current values so cross-field validation sees the final state.
    const merged = {
      price: data.price ?? product.price,
      discountPrice: data.discountPrice ?? product.discountPrice,
      minOrderQuantity: data.minOrderQuantity ?? product.minOrderQuantity,
      maxOrderQuantity: data.maxOrderQuantity ?? product.maxOrderQuantity,
      name: data.name ?? product.name,
      category: data.category ?? String(product.category),
    };
    const problem = validateProduct(merged, { isCreate: false });
    if (problem) return res.status(400).json({ message: problem });

    if (data.category && String(data.category) !== String(product.category)) {
      const exists = await Category.findByPk(data.category);
      if (!exists) return res.status(400).json({ message: "Category not found." });

      // Keep the on-disk folder structure (uploads/products/<category>/<productId>) in sync.
      const newCategorySlug = exists.slug || toSlug(exists.name);
      const moved = moveProductImageFolder(categorySlug, newCategorySlug, id);
      if (moved) product.images = remapProductImageUrls(product.images, id, categorySlug, newCategorySlug);
      categorySlug = newCategorySlug;
    }

    if (data.sku && data.sku !== product.sku) {
      const clash = await Product.findOne({ where: { sku: data.sku, id: { [Op.ne]: id } } });
      if (clash) return res.status(409).json({ message: `SKU "${data.sku}" is already in use.` });
    }

    if (req.body.variants !== undefined) {
      const variants = normaliseVariants(safeJson(req.body.variants, []));
      const dupe = detectDuplicateVariantSku(variants);
      if (dupe) return res.status(409).json({ message: `Duplicate variant SKU "${dupe}".` });
      product.variants = variants;
    }

    if (data.name && data.name !== product.name) {
      product.slug = await buildUniqueSlug(Product, data.name, id);
    }

    Object.assign(product, data);

    // Media: existing URLs the client kept + newly uploaded files.
    if (req.body.imageUrls !== undefined || (req.files || []).length) {
      const rawKept = toStringArray(safeJson(req.body.imageUrls, product.images));
      // The client may still be quoting pre-move URLs if the category changed in this same request.
      const kept =
        categorySlug !== originalCategorySlug
          ? remapProductImageUrls(rawKept, id, originalCategorySlug, categorySlug)
          : rawKept;

      const removed = (product.images || []).filter((url) => !kept.includes(url));
      if (removed.length) deleteProductImageUrls(removed);

      const uploaded = commitProductImages(req.files || [], categorySlug, id);
      product.images = [...kept, ...uploaded];
    }

    product.updatedBy = req.adminUser?.id || null;
    await product.save();

    const full = await Product.findByPk(id, { include: [CATEGORY_INCLUDE] });

    return res.status(200).json({ product: toProductDTO(withVirtuals(full)), message: "Product updated." });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      const field = error.errors?.[0]?.path || "value";
      return res.status(409).json({ message: `Duplicate ${field}. It is already in use.` });
    }
    return res.status(500).json({ message: error.message });
  }
};

// DELETE /api/product/delete/:id   (admin) — soft by default, ?hard=true to purge
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid product ID." });

    const product = await Product.findByPk(id, { include: [CATEGORY_INCLUDE] });
    if (!product) return res.status(404).json({ message: "Product not found." });

    if (toBool(req.query.hard)) {
      const categorySlug = product.categoryDetails?.slug || toSlug(String(product.category));
      deleteProductImageFolder(categorySlug, id);
      await product.destroy();
      return res.status(200).json({ message: "Product permanently deleted." });
    }

    product.isDeleted = true;
    product.deletedAt = new Date();
    product.deletedBy = req.adminUser?.id || null;
    product.isPublished = false;
    await product.save();

    return res.status(200).json({ message: "Product moved to trash." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/product/restore/:id   (admin)
export const restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid product ID." });

    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ message: "Product not found." });

    product.isDeleted = false;
    product.deletedAt = null;
    product.deletedBy = null;
    await product.save();

    return res.status(200).json({ message: "Product restored." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/product/bulk   (admin)
export const bulkProducts = async (req, res) => {
  try {
    const { ids, action, value } = req.body || {};
    const list = (Array.isArray(ids) ? ids : []).filter(isValidId);

    if (!list.length) return res.status(400).json({ message: "Select at least one product." });
    if (!action) return res.status(400).json({ message: "An action is required." });

    const dbWhere = { id: { [Op.in]: list } };
    const actor = req.adminUser?.id || null;
    let update = null;

    switch (action) {
      case "delete":
        update = { isDeleted: true, deletedAt: new Date(), deletedBy: actor, isPublished: false };
        break;
      case "restore":
        update = { isDeleted: false, deletedAt: null, deletedBy: null };
        break;
      case "activate":
        update = { status: "active", isPublished: true, updatedBy: actor };
        break;
      case "deactivate":
        update = { status: "draft", isPublished: false, updatedBy: actor };
        break;
      case "archive":
        update = { status: "archived", isPublished: false, updatedBy: actor };
        break;
      case "feature":
        update = { isFeatured: true, updatedBy: actor };
        break;
      case "unfeature":
        update = { isFeatured: false, updatedBy: actor };
        break;
      case "updatePrice": {
        const price = toNum(value, NaN);
        if (!Number.isFinite(price) || price < 0)
          return res.status(400).json({ message: "Enter a valid price." });
        update = { price, updatedBy: actor };
        break;
      }
      case "updateStock": {
        const stock = Math.trunc(toNum(value, NaN));
        if (!Number.isFinite(stock) || stock < 0)
          return res.status(400).json({ message: "Enter a valid stock quantity." });
        update = { stock, updatedBy: actor };
        break;
      }
      case "assignCategory": {
        if (!isValidId(value)) return res.status(400).json({ message: "Select a valid category." });
        const exists = await Category.findByPk(value);
        if (!exists) return res.status(400).json({ message: "Category not found." });
        update = { category: value, updatedBy: actor };
        break;
      }
      default:
        return res.status(400).json({ message: `Unknown bulk action "${action}".` });
    }

    const [modifiedCount] = await Product.update(update, { where: dbWhere });

    return res.status(200).json({
      message: `Applied "${action}" to ${modifiedCount} product(s).`,
      matched: list.length,
      modified: modifiedCount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/product/:id   (public — registered LAST) — by ID or slug
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const dbWhere = isValidId(id) ? { id } : { slug: String(id).toLowerCase() };

    const product = await Product.findOne({ where: dbWhere, include: [CATEGORY_INCLUDE] });

    if (!product) return res.status(404).json({ message: "Product not found." });
    if (product.isDeleted) return res.status(410).json({ message: "This product was removed." });

    // Public callers only see live products.
    const isAdminRequest = Boolean(req.adminUser);
    if (!isAdminRequest && (!product.isPublished || product.status === "archived")) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (!isAdminRequest) {
      Product.increment("viewsCount", { where: { id: product.id } }).catch((e) =>
        console.warn("[product] view counter:", e.message)
      );
    }

    return res.status(200).json({ product: toProductDTO(withVirtuals(product)) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
