import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

export const ORDER_STATUSES = ["confirmed", "shipped", "in_transit", "delivered", "cancelled"];
export const PAYMENT_STATUSES = ["paid", "refunded", "partially_refunded", "disputed"];

/**
 * Core invariant (blueprint section 5.3): an Order row exists ONLY after the
 * payment provider confirms the charge. There is no "unpaid order" state, and
 * the Order table doubles as the payment ledger.
 */
class Order extends Model {}

Order.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user: { type: DataTypes.UUID, allowNull: false },
    // [{ product, name, quantity, price, variantId, variantOptions }]
    items: { type: DataTypes.JSON, defaultValue: [] },

    shippingAddress: {
      type: DataTypes.JSON,
      defaultValue: {
        name: "",
        street: "",
        line2: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        phone: "",
        altPhone: "",
        email: "",
        addressType: "home",
        instructions: "",
      },
    },

    subtotal: { type: DataTypes.FLOAT, defaultValue: 0 },
    discount: { type: DataTypes.FLOAT, defaultValue: 0 },
    // { couponId, code, type, value, discount }
    coupon: { type: DataTypes.JSON, defaultValue: null },
    shippingCost: { type: DataTypes.FLOAT, defaultValue: 0 },
    tax: { type: DataTypes.FLOAT, defaultValue: 0 },
    total: { type: DataTypes.FLOAT, defaultValue: 0 },
    currency: { type: DataTypes.STRING, defaultValue: "USD" },

    status: { type: DataTypes.ENUM(...ORDER_STATUSES), defaultValue: "confirmed" },
    paymentStatus: { type: DataTypes.ENUM(...PAYMENT_STATUSES), defaultValue: "paid" },

    stripePaymentId: { type: DataTypes.STRING, allowNull: false, unique: true },
    stripeChargeId: { type: DataTypes.STRING, defaultValue: "" },
    stripeRefundId: { type: DataTypes.STRING, defaultValue: "" },
    paymentMethod: { type: DataTypes.STRING, defaultValue: "card" },
    cardBrand: { type: DataTypes.STRING, defaultValue: "" },
    cardLast4: { type: DataTypes.STRING, defaultValue: "" },
    receiptUrl: { type: DataTypes.STRING, defaultValue: "" },

    paidAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    refundedAt: { type: DataTypes.DATE, defaultValue: null },
    refundedAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
    refundEmailSent: { type: DataTypes.BOOLEAN, defaultValue: false },

    invoiceNumber: { type: DataTypes.STRING, defaultValue: null, unique: true },
    invoiceUrl: { type: DataTypes.STRING, defaultValue: "" },
    invoiceEmailSent: { type: DataTypes.BOOLEAN, defaultValue: false },
    trackingNumber: { type: DataTypes.STRING, defaultValue: "" },
    carrier: { type: DataTypes.STRING, defaultValue: "" },

    // [{ status, at, by, byName }]
    statusHistory: { type: DataTypes.JSON, defaultValue: [] },
  },
  {
    sequelize,
    modelName: "Order",
    tableName: "orders",
    timestamps: true,
    indexes: [{ fields: ["createdAt"] }, { fields: ["paidAt"] }],
  }
);

export default Order;
