import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

/** Roles an admin can create/manage through Employee Management. */
export const EMPLOYEE_ROLES = ["telecaller", "sales"];
/** Every role that can sign into the admin console. */
export const STAFF_ROLES = ["admin", ...EMPLOYEE_ROLES];
export const ALL_ROLES = ["user", ...STAFF_ROLES];
export const CUSTOMER_STATUSES = ["active", "suspended", "blocked", "deleted"];
export const PERMISSION_KEYS = [
  "products",
  "categories",
  "orders",
  "payments",
  "customers",
  "enquiries",
  "reports",
];
export const TAG_SUGGESTIONS = [
  "VIP Customer",
  "Frequent Buyer",
  "Fraud Risk",
  "Wholesale Buyer",
  "New Customer",
  "High Spender",
];

class User extends Model {}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // Identity
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM(...ALL_ROLES), defaultValue: "user" },
    avatar: { type: DataTypes.STRING, defaultValue: "" },
    phone: { type: DataTypes.STRING, defaultValue: "" },
    gender: { type: DataTypes.ENUM("male", "female", "other", ""), defaultValue: "" },
    dateOfBirth: { type: DataTypes.DATE, defaultValue: null },
    address: {
      type: DataTypes.JSON,
      defaultValue: { street: "", city: "", state: "", zip: "", country: "" },
    },

    // Admin metadata
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    permissions: { type: DataTypes.JSON, defaultValue: [] },
    createdBy: { type: DataTypes.UUID, defaultValue: null },
    lastLogin: { type: DataTypes.DATE, defaultValue: null },
    mustChangePassword: { type: DataTypes.BOOLEAN, defaultValue: false },
    passwordChangedAt: { type: DataTypes.DATE, defaultValue: null },

    // OTP / verification
    otp: { type: DataTypes.STRING, defaultValue: null },
    otpExpiry: { type: DataTypes.DATE, defaultValue: null },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },

    // Customer management
    customerStatus: { type: DataTypes.ENUM(...CUSTOMER_STATUSES), defaultValue: "active" },
    statusReason: { type: DataTypes.STRING, defaultValue: "" },
    statusChangedAt: { type: DataTypes.DATE, defaultValue: null },
    statusChangedBy: { type: DataTypes.UUID, defaultValue: null },
    isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    deletedAt: { type: DataTypes.DATE, defaultValue: null },
    deletedBy: { type: DataTypes.UUID, defaultValue: null },
    tags: { type: DataTypes.JSON, defaultValue: [] },
    notes: { type: DataTypes.JSON, defaultValue: [] },

    // Session snapshot
    lastLoginIp: { type: DataTypes.STRING, defaultValue: "" },
    lastLoginUserAgent: { type: DataTypes.STRING(500), defaultValue: "" },
    lastLoginDevice: { type: DataTypes.STRING, defaultValue: "" },
    lastLoginLocation: { type: DataTypes.STRING, defaultValue: "" },
    loginCount: { type: DataTypes.INTEGER, defaultValue: 0 },

    // Force-logout marker
    tokensValidFrom: { type: DataTypes.DATE, defaultValue: null },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true,
    indexes: [
      { fields: ["role", "customerStatus"] },
      { fields: ["role", "createdAt"] },
      { fields: ["role", "isDeleted"] },
      { fields: ["phone"] },
    ],
  }
);

export default User;
