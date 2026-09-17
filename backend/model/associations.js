import User from "./userModel.js";
import Product from "./productModel.js";
import Category from "./categoryModel.js";
import Order from "./orderModel.js";

/**
 * Loose, Mongo-style references — associations exist so controllers can
 * `include` a joined row (the old `.populate()`), but there is no DB-level FK
 * constraint (`constraints: false`), so deletes/seeding never get blocked by
 * a dangling reference, exactly like the old ObjectId refs.
 */
export const defineAssociations = () => {
  Product.belongsTo(Category, {
    foreignKey: "category",
    targetKey: "id",
    as: "categoryDetails",
    constraints: false,
  });

  Category.belongsTo(Category, {
    foreignKey: "parentId",
    targetKey: "id",
    as: "parent",
    constraints: false,
  });

  Category.hasMany(Category, {
    foreignKey: "parentId",
    sourceKey: "id",
    as: "children",
    constraints: false,
  });

  Order.belongsTo(User, {
    foreignKey: "user",
    targetKey: "id",
    as: "userDetails",
    constraints: false,
  });

  User.belongsTo(User, {
    foreignKey: "createdBy",
    targetKey: "id",
    as: "createdByDetails",
    constraints: false,
  });
};

export default defineAssociations;
