import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

export const PRODUCT_STATUSES = ["active", "draft", "out_of_stock", "archived"];

class Product extends Model {}

Product.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // Basic
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, unique: true },
    description: { type: DataTypes.TEXT, defaultValue: "" },
    richDescription: { type: DataTypes.TEXT, defaultValue: "" },
    sku: { type: DataTypes.STRING, defaultValue: null, unique: true },
    brand: { type: DataTypes.STRING, defaultValue: "" },

    // Taxonomy
    category: { type: DataTypes.UUID, allowNull: false },
    subcategory: { type: DataTypes.STRING, defaultValue: "" },
    tags: { type: DataTypes.JSON, defaultValue: [] },

    // Pricing
    price: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    discountPrice: { type: DataTypes.FLOAT, defaultValue: 0 },
    costPrice: { type: DataTypes.FLOAT, defaultValue: 0 },
    tax: { type: DataTypes.FLOAT, defaultValue: 0 },
    currency: { type: DataTypes.STRING, defaultValue: "INR" },

    // Inventory
    stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    lowStockThreshold: { type: DataTypes.INTEGER, defaultValue: 10 },
    minOrderQuantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    maxOrderQuantity: { type: DataTypes.INTEGER, defaultValue: 9999 },

    // Shipping
    weight: { type: DataTypes.FLOAT, defaultValue: 0 },
    dimensions: { type: DataTypes.JSON, defaultValue: { length: 0, width: 0, height: 0 } },
    shippingCost: { type: DataTypes.FLOAT, defaultValue: 0 },
    deliveryEstimate: { type: DataTypes.STRING, defaultValue: "" },

    // Media
    images: { type: DataTypes.JSON, defaultValue: [] },

    // Variants
    variants: { type: DataTypes.JSON, defaultValue: [] },

    // SEO
    metaTitle: { type: DataTypes.STRING, defaultValue: "" },
    metaDescription: { type: DataTypes.STRING, defaultValue: "" },
    seoKeywords: { type: DataTypes.JSON, defaultValue: [] },
    schemaMarkup: { type: DataTypes.TEXT, defaultValue: "" },

    // Visibility flags
    isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },
    isBestseller: { type: DataTypes.BOOLEAN, defaultValue: false },
    isTrending: { type: DataTypes.BOOLEAN, defaultValue: false },
    isNewArrival: { type: DataTypes.BOOLEAN, defaultValue: false },

    // Lifecycle
    status: { type: DataTypes.ENUM(...PRODUCT_STATUSES), defaultValue: "draft" },
    isPublished: { type: DataTypes.BOOLEAN, defaultValue: false },

    // Soft delete + audit
    isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    deletedAt: { type: DataTypes.DATE, defaultValue: null },
    deletedBy: { type: DataTypes.UUID, defaultValue: null },
    createdBy: { type: DataTypes.UUID, defaultValue: null },
    updatedBy: { type: DataTypes.UUID, defaultValue: null },

    // Denormalised aggregates
    salesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    viewsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    averageRating: { type: DataTypes.FLOAT, defaultValue: 0 },
    reviewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: "Product",
    tableName: "products",
    timestamps: true,
    indexes: [{ fields: ["category", "status", "isDeleted"] }],
  }
);

/** Variant-aware low-stock check (mirrors the old Mongoose virtual). */
export const isProductLowStock = (p) => {
  if (p.variants && p.variants.length) {
    const total = p.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    return total > 0 && total <= (p.lowStockThreshold || 10);
  }
  return p.stock > 0 && p.stock <= (p.lowStockThreshold || 10);
};

/** Out of stock only when EVERY variant is out. */
export const isProductOutOfStock = (p) => {
  if (p.variants && p.variants.length) {
    return p.variants.every((v) => (v.stock || 0) <= 0);
  }
  return (p.stock || 0) <= 0;
};

export default Product;
