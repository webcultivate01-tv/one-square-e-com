import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

export const ACTIVITY_TYPES = [
  "login",
  "logout",
  "signup",
  "password_change",
  "password_reset",
  "profile_update",
  "order_placed",
  "order_cancelled",
  "email_sent",
  "admin_action",
  "system",
];

/** Append-only audit timeline. Kept in its own table — a loyal customer
 *  can generate 10k+ rows and we never want that inside the user row. */
class CustomerActivity extends Model {}

CustomerActivity.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    customer: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.ENUM(...ACTIVITY_TYPES), defaultValue: "system" },
    action: { type: DataTypes.STRING, defaultValue: "" },
    message: { type: DataTypes.STRING, defaultValue: "" },

    actor: { type: DataTypes.UUID, defaultValue: null },
    actorName: { type: DataTypes.STRING, defaultValue: "" },
    actorRole: { type: DataTypes.STRING, defaultValue: "" },

    ip: { type: DataTypes.STRING, defaultValue: "" },
    userAgent: { type: DataTypes.STRING(500), defaultValue: "" },
    device: { type: DataTypes.STRING, defaultValue: "" },
    browser: { type: DataTypes.STRING, defaultValue: "" },
    os: { type: DataTypes.STRING, defaultValue: "" },

    meta: { type: DataTypes.JSON, defaultValue: {} },
  },
  {
    sequelize,
    modelName: "CustomerActivity",
    tableName: "customer_activities",
    timestamps: true,
    indexes: [{ fields: ["customer", "createdAt"] }],
  }
);

export default CustomerActivity;
