import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import { LEAD_SOURCES } from "./leadNoteModel.js";

export const PAYMENT_TYPES = ["advance", "full"];
export const PAYMENT_METHODS = ["cash", "upi", "card", "bank_transfer", "cheque"];
export const SALES_PAYMENT_STATUSES = ["advance_paid", "paid"];

/**
 * An order confirmed by staff after a call — payment is taken offline
 * (advance or full) and recorded here. Doubles as the bill / invoice.
 * Separate from Order (model/orderModel.js), which is the Stripe ledger.
 */
class SalesOrder extends Model {}

SalesOrder.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    invoiceNumber: { type: DataTypes.STRING, allowNull: false, unique: true },

    sourceType: { type: DataTypes.ENUM(...LEAD_SOURCES), allowNull: false },
    // One confirmed order per lead.
    sourceId: { type: DataTypes.UUID, allowNull: false, unique: true },

    customerName: { type: DataTypes.STRING, allowNull: false },
    customerEmail: { type: DataTypes.STRING, defaultValue: "" },
    customerPhone: { type: DataTypes.STRING, defaultValue: "" },
    customerAddress: { type: DataTypes.TEXT },

    // [{ product, name, quantity, price, amount }]
    items: { type: DataTypes.JSON, defaultValue: [] },
    subtotal: { type: DataTypes.FLOAT, defaultValue: 0 },
    taxPercent: { type: DataTypes.FLOAT, defaultValue: 0 },
    tax: { type: DataTypes.FLOAT, defaultValue: 0 },
    total: { type: DataTypes.FLOAT, defaultValue: 0 },

    paymentType: { type: DataTypes.ENUM(...PAYMENT_TYPES), allowNull: false },
    paymentMethod: { type: DataTypes.ENUM(...PAYMENT_METHODS), defaultValue: "cash" },
    paymentReference: { type: DataTypes.STRING, defaultValue: "" },
    amountPaid: { type: DataTypes.FLOAT, defaultValue: 0 },
    balanceDue: { type: DataTypes.FLOAT, defaultValue: 0 },
    paymentStatus: { type: DataTypes.ENUM(...SALES_PAYMENT_STATUSES), defaultValue: "paid" },
    status: { type: DataTypes.STRING, defaultValue: "confirmed" },
    paidAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },

    createdBy: { type: DataTypes.UUID, defaultValue: null },
    createdByName: { type: DataTypes.STRING, defaultValue: "" },
  },
  {
    sequelize,
    modelName: "SalesOrder",
    tableName: "sales_orders",
    timestamps: true,
    indexes: [{ fields: ["createdAt"] }],
  }
);

export default SalesOrder;
