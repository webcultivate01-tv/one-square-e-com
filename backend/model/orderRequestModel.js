import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

/**
 * A "Buy Now" lead captured from the storefront popup — no payment involved yet.
 * Distinct from Order (model/orderModel.js), which only ever holds
 * payment-confirmed purchases. This is the queue admins work from to follow up
 * and turn into a real order.
 */
export const ORDER_REQUEST_STATUSES = ["pending", "contacted", "converted", "cancelled"];

class OrderRequest extends Model {}

OrderRequest.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    product: { type: DataTypes.UUID, defaultValue: null },
    productName: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },
    message: { type: DataTypes.TEXT, defaultValue: "" },
    status: { type: DataTypes.ENUM(...ORDER_REQUEST_STATUSES), defaultValue: "pending" },
    handledBy: { type: DataTypes.UUID, defaultValue: null },
  },
  {
    sequelize,
    modelName: "OrderRequest",
    tableName: "order_requests",
    timestamps: true,
    indexes: [{ fields: ["status"] }, { fields: ["createdAt"] }],
  }
);

export default OrderRequest;
