import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

/** A general enquiry submitted from the storefront's Contact page. */
export const ENQUIRY_STATUSES = ["new", "in_progress", "resolved", "spam"];

class Enquiry extends Model {}

Enquiry.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    subject: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, defaultValue: "" },
    status: { type: DataTypes.ENUM(...ENQUIRY_STATUSES), defaultValue: "new" },
    handledBy: { type: DataTypes.UUID, defaultValue: null },
  },
  {
    sequelize,
    modelName: "Enquiry",
    tableName: "enquiries",
    timestamps: true,
    indexes: [{ fields: ["status"] }, { fields: ["createdAt"] }],
  }
);

export default Enquiry;
