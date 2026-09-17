import { Op, fn, col } from "sequelize";
import Category from "../model/categoryModel.js";
import Product from "../model/productModel.js";
import { handleImageUpload } from "../config/cloudinary.js";
import { buildUniqueSlug, isValidId, likeTerm, toBool, toSlug } from "../utils/helpers.js";

/** Only two levels are supported: top-level categories and their direct subcategories. */
const assertUsableParent = async (parentId, ownId = null) => {
  if (!isValidId(parentId)) {
    const err = new Error("Invalid parent category.");
    err.status = 400;
    throw err;
  }
  if (ownId && String(parentId) === String(ownId)) {
    const err = new Error("A category cannot be its own parent.");
    err.status = 400;
    throw err;
  }
  const parent = await Category.findByPk(parentId);
  if (!parent) {
    const err = new Error("Parent category not found.");
    err.status = 400;
    throw err;
  }
  if (parent.parentId) {
    const err = new Error("Subcategories cannot be nested further — choose a top-level category as the parent.");
    err.status = 400;
    throw err;
  }
  return parent;
};

// GET /api/category/getall   (public)
export const getAllCategories = async (req, res) => {
  try {
    const where = {};
    if (req.query.q) where.name = { [Op.like]: likeTerm(req.query.q) };
    if (req.query.activeOnly === "true") where.isActive = true;

    const categories = await Category.findAll({ where, order: [["name", "ASC"]], raw: true });

    // Attach a live product count so the UI can warn before deleting.
    const productCounts = await Product.findAll({
      where: { isDeleted: { [Op.ne]: true } },
      attributes: ["category", [fn("COUNT", col("id")), "count"]],
      group: ["category"],
      raw: true,
    });
    const productCountMap = new Map(productCounts.map((c) => [String(c.category), Number(c.count)]));

    // Attach a subcategory count so the UI can block deletes / demotions safely.
    const childCounts = await Category.findAll({
      where: { parentId: { [Op.ne]: null } },
      attributes: ["parentId", [fn("COUNT", col("id")), "count"]],
      group: ["parentId"],
      raw: true,
    });
    const childCountMap = new Map(childCounts.map((c) => [String(c.parentId), Number(c.count)]));

    const nameById = new Map(categories.map((c) => [String(c.id), c.name]));

    return res.status(200).json({
      categories: categories.map((c) => ({
        ...c,
        _id: c.id,
        parentName: c.parentId ? nameById.get(String(c.parentId)) || null : null,
        productCount: productCountMap.get(String(c.id)) || 0,
        subcategoryCount: childCountMap.get(String(c.id)) || 0,
      })),
      total: categories.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/category/create   (admin, multipart single "image")
export const createCategory = async (req, res) => {
  try {
    const { name, description = "", imageUrl = "", parentId = "" } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Category name is required." });
    }

    if (String(parentId).trim()) {
      await assertUsableParent(parentId);
    }

    const slug = toSlug(name);
    const clash = await Category.findOne({ where: { slug } });
    if (clash) {
      return res.status(400).json({ message: "Category with this name already exists." });
    }

    let image = String(imageUrl || "").trim();
    if (req.file) image = await handleImageUpload(req.file);

    const category = await Category.create({
      name: String(name).trim(),
      slug,
      description: String(description),
      image,
      isActive: toBool(req.body.isActive, true),
      parentId: String(parentId).trim() || null,
      createdBy: req.adminUser?.id || null,
      updatedBy: req.adminUser?.id || null,
    });

    return res.status(201).json({
      category: { ...category.toJSON(), _id: category.id },
      message: String(parentId).trim() ? "Subcategory created." : "Category created.",
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ message: "Category with this name already exists." });
    }
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/category/update/:id   (admin, multipart single "image")
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid category ID." });

    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ message: "Category not found." });

    const { name, description, imageUrl, parentId } = req.body || {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) return res.status(400).json({ message: "Category name is required." });
      if (trimmed !== category.name) {
        category.name = trimmed;
        category.slug = await buildUniqueSlug(Category, trimmed, id);
      }
    }
    if (description !== undefined) category.description = String(description);
    if (req.body.isActive !== undefined) category.isActive = toBool(req.body.isActive, true);

    if (parentId !== undefined) {
      const trimmedParentId = String(parentId).trim();
      if (!trimmedParentId) {
        category.parentId = null;
      } else {
        const childCount = await Category.count({ where: { parentId: id } });
        if (childCount > 0) {
          return res.status(400).json({
            message: "This category has its own subcategories — move or delete them first before making it a subcategory.",
          });
        }
        await assertUsableParent(trimmedParentId, id);
        category.parentId = trimmedParentId;
      }
    }

    if (req.file) category.image = await handleImageUpload(req.file);
    else if (imageUrl !== undefined) category.image = String(imageUrl).trim();

    category.updatedBy = req.adminUser?.id || null;
    await category.save();

    return res.status(200).json({
      category: { ...category.toJSON(), _id: category.id },
      message: "Category updated.",
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ message: "Category with this name already exists." });
    }
    return res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /api/category/delete/:id   (admin)
 * Blueprint section 23 fix: guard against products that still reference the category.
 * Pass ?reassignTo=<categoryId> to move them, or ?force=true to delete anyway.
 * Also guards against orphaning subcategories — pass ?force=true to promote them to top-level.
 */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid category ID." });

    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ message: "Category not found." });

    const { reassignTo, force } = req.query;

    const childCount = await Category.count({ where: { parentId: id } });
    if (childCount > 0 && !toBool(force)) {
      return res.status(409).json({
        message: `${childCount} subcategor${childCount === 1 ? "y" : "ies"} still belong to this category. Confirm to promote them to top-level, or delete them first.`,
        subcategoryCount: childCount,
      });
    }
    if (childCount > 0) {
      await Category.update({ parentId: null }, { where: { parentId: id } });
    }

    const inUse = await Product.count({ where: { category: id, isDeleted: { [Op.ne]: true } } });

    if (inUse > 0) {
      if (isValidId(reassignTo)) {
        if (String(reassignTo) === String(id)) {
          return res.status(400).json({ message: "Choose a different target category." });
        }
        const target = await Category.findByPk(reassignTo);
        if (!target) return res.status(400).json({ message: "Target category not found." });
        await Product.update({ category: reassignTo }, { where: { category: id } });
      } else if (!toBool(force)) {
        return res.status(409).json({
          message: `${inUse} product(s) still use this category. Reassign them first, or confirm to delete anyway.`,
          productCount: inUse,
        });
      }
    }

    await category.destroy();

    return res.status(200).json({
      message: inUse
        ? `Category deleted. ${inUse} product(s) were ${isValidId(reassignTo) ? "reassigned" : "left uncategorised"}.`
        : "Category deleted.",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
