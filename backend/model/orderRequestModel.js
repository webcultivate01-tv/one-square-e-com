import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

/**
 * A "Buy Now" lead captured from the storefront popup — no payment involved yet.
 * Distinct from Order (model/orderModel.js), which only ever holds
 * payment-confirmed purchases. This is the queue admins work from to follow up
 * and turn into a real order.
 */
export const ORDER_REQUEST_STATUSES = ["pending", "contacted", "converted", "cancelled", "spam", "not_interested", "completed"];

/**
 * Statuses only move forward: pending → contacted → a closing status. "converted"
 * is shown as "Confirmed" (order confirmed + paid); "completed" (delivered) can only
 * follow it. Closing statuses can be switched between each other until completed,
 * and spam / not-interested can be undone back to pending (a mis-click shouldn't be permanent).
 */
const STATUS_RANK = { pending: 0, contacted: 1, converted: 2, cancelled: 2, spam: 2, not_interested: 2, completed: 3 };
const RESTORABLE = ["spam", "not_interested"];

export const canMoveStatus = (from, to) => {
  if (from === to) return true;
  if (to === "completed") return from === "converted";
  if (to === "pending" && RESTORABLE.includes(from)) return true;
  return STATUS_RANK[to] >= STATUS_RANK[from];
};

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
    // Latest follow-up date staff scheduled from a call note; drives the Follow-up tab.
    nextFollowUpAt: { type: DataTypes.DATE, defaultValue: null },
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
