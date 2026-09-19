import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

/** What a note can be attached to: a Contact-page enquiry or a Buy Now request. */
export const LEAD_SOURCES = ["enquiry", "order_request"];
export const NOTE_TYPES = ["call", "follow_up", "note", "system"];

/** Append-only call / follow-up log kept per lead by telecallers and sales. */
class LeadNote extends Model {}

LeadNote.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    sourceType: { type: DataTypes.ENUM(...LEAD_SOURCES), allowNull: false },
    sourceId: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.ENUM(...NOTE_TYPES), defaultValue: "call" },
    text: { type: DataTypes.TEXT, allowNull: false },
    followUpAt: { type: DataTypes.DATE, defaultValue: null },
    authorId: { type: DataTypes.UUID, defaultValue: null },
    authorName: { type: DataTypes.STRING, defaultValue: "" },
    authorRole: { type: DataTypes.STRING, defaultValue: "" },
  },
  {
    sequelize,
    modelName: "LeadNote",
    tableName: "lead_notes",
    timestamps: true,
    indexes: [{ fields: ["sourceType", "sourceId", "createdAt"] }],
  }
);

export default LeadNote;
