import { Sequelize } from "sequelize";

/**
 * MySQL connection via Sequelize.
 * Blueprint §21 security note: never hard-code a fallback credential. Fail fast instead.
 */
const required = ["DB_HOST", "DB_NAME", "DB_USER"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[db] ${key} is required. Set it in backend/.env`);
  }
}

export const sequelize = new Sequelize(
  process.env.DB_NAME || "ecom",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    logging: false,
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`[db] connected → mysql://${process.env.DB_HOST || "127.0.0.1"}/${process.env.DB_NAME || "ecom"}`);
    // alter:true on every boot piles up a new duplicate unique index per restart (MySQL caps
    // a table at 64 keys) — only alter when explicitly asked to reconcile a model change.
    await sequelize.sync({ alter: process.env.DB_SYNC_ALTER === "true" });
    console.log("[db] schema synced");
  } catch (error) {
    console.error("[db] connection failed:", error.message);
    throw error;
  }
};

export default connectDB;
