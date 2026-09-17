import "dotenv/config";
import bcrypt from "bcryptjs";
import connectDB, { sequelize } from "../config/db.js";
import User from "../model/userModel.js";
import { isStrongPassword, PASSWORD_HINT, BCRYPT_ROUNDS } from "../utils/password.js";

/**
 * Idempotent admin seeder.
 * Re-running with the same email resets the password and re-asserts the role.
 *
 *   node scripts/createAdmin.js
 *   ADMIN_EMAIL=you@site.com ADMIN_PASSWORD="StrongPass123!" node scripts/createAdmin.js
 */
const run = async () => {
  const name = process.env.ADMIN_NAME || "GOBOXLY Admin";
  const email = String(process.env.ADMIN_EMAIL || "admin@goboxly.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@1234";

  if (!isStrongPassword(password)) {
    console.error(`[seed] ADMIN_PASSWORD is too weak. ${PASSWORD_HINT}`);
    process.exit(1);
  }

  await connectDB();

  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const existing = await User.findOne({ where: { email } });

  if (existing) {
    existing.name = name;
    existing.password = hashed;
    existing.role = "admin";
    existing.isActive = true;
    existing.isVerified = true;
    existing.mustChangePassword = false;
    existing.passwordChangedAt = new Date();
    existing.tokensValidFrom = new Date();
    await existing.save();
    console.log(`[seed] Updated existing admin: ${email}`);
  } else {
    await User.create({
      name,
      email,
      password: hashed,
      role: "admin",
      isActive: true,
      isVerified: true,
      passwordChangedAt: new Date(),
    });
    console.log(`[seed] Created admin: ${email}`);
  }

  console.log(`[seed] Sign in at /admin/login with ${email} / ${password}`);
  console.log("[seed] Change this password immediately.");

  await sequelize.close();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("[seed] failed:", error.message);
  await sequelize.close().catch(() => {});
  process.exit(1);
});
