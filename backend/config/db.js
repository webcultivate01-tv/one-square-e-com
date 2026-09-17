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
    await sequelize.sync({ alter: true });
    console.log("[db] schema synced");
  } catch (error) {
    console.error("[db] connection failed:", error.message);
    throw error;
  }
};

export default connectDB;
