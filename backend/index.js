import "dotenv/config"; // MUST be first — before anything reads process.env

import app from "./app.js";
import connectDB from "./config/db.js";
import { verifyMailer } from "./config/nodemailer.js";
import { defineAssociations } from "./model/associations.js";

defineAssociations();

const PORT = Number(process.env.PORT) || 5000;

if (!process.env.JWT_SECRET) {
  console.error("[boot] JWT_SECRET is required. Set it in backend/.env");
  process.exit(1);
}

const server = app.listen(PORT, async () => {
  console.log(`[boot] API listening on http://localhost:${PORT}`);
  try {
    await connectDB();
  } catch {
    console.error("[boot] Database unavailable — shutting down.");
    server.close(() => process.exit(1));
    return;
  }
  verifyMailer().catch(() => {});
});

const shutdown = (signal) => {
  console.log(`\n[boot] ${signal} received, closing server...`);
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("[boot] Unhandled rejection:", reason);
});
