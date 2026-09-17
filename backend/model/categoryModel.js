import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

class Category extends Model {}

Category.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, unique: true },
    description: { type: DataTypes.TEXT, defaultValue: "" },
    image: { type: DataTypes.STRING, defaultValue: "" },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    parentId: { type: DataTypes.UUID, defaultValue: null },
    createdBy: { type: DataTypes.UUID, defaultValue: null },
    updatedBy: { type: DataTypes.UUID, defaultValue: null },
  },
  {
    sequelize,
    modelName: "Category",
    tableName: "categories",
    timestamps: true,
  }
);

export default Category;
