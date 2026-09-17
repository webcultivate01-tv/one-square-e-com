import "dotenv/config";
import bcrypt from "bcryptjs";
import connectDB, { sequelize } from "../config/db.js";
import User from "../model/userModel.js";
import { BCRYPT_ROUNDS } from "../utils/password.js";

/**
 * Seeds 10 demo employees (5 sales, 5 telecaller) so Employee Management has
 * something to show. Idempotent: re-running resets each employee's password
 * and details instead of duplicating rows.
 *
 *   node scripts/seedEmployees.js
 */

const DEFAULT_PERMISSIONS = {
  telecaller: ["customers", "orders"],
  sales: ["products", "orders"],
};

const TEMP_PASSWORD = "Employee@123";

const EMPLOYEES = [
  ["Sales", "Ananya Iyer", "ananya.iyer@goboxly.com", "+919820011122", "female", { street: "12 MG Road", city: "Mumbai", state: "Maharashtra", zip: "400001", country: "India" }],
  ["Sales", "Rohan Kapoor", "rohan.kapoor@goboxly.com", "+919820011123", "male", { street: "45 Park Street", city: "Kolkata", state: "West Bengal", zip: "700016", country: "India" }],
  ["Sales", "Neha Verma", "neha.verma@goboxly.com", "+919820011124", "female", { street: "78 Brigade Road", city: "Bengaluru", state: "Karnataka", zip: "560025", country: "India" }],
  ["Sales", "Karan Malhotra", "karan.malhotra@goboxly.com", "+919820011125", "male", { street: "23 Anna Salai", city: "Chennai", state: "Tamil Nadu", zip: "600002", country: "India" }],
  ["Sales", "Simran Kaur", "simran.kaur@goboxly.com", "+919820011126", "female", { street: "9 Sector 17", city: "Chandigarh", state: "Chandigarh", zip: "160017", country: "India" }],
  ["Telecaller", "Vikram Rao", "vikram.rao@goboxly.com", "+919820011127", "male", { street: "56 FC Road", city: "Pune", state: "Maharashtra", zip: "411005", country: "India" }],
  ["Telecaller", "Priya Menon", "priya.menon@goboxly.com", "+919820011128", "female", { street: "31 MI Road", city: "Jaipur", state: "Rajasthan", zip: "302001", country: "India" }],
  ["Telecaller", "Arjun Nair", "arjun.nair@goboxly.com", "+919820011129", "male", { street: "14 SG Highway", city: "Ahmedabad", state: "Gujarat", zip: "380015", country: "India" }],
  ["Telecaller", "Divya Pillai", "divya.pillai@goboxly.com", "+919820011130", "female", { street: "67 Hazratganj", city: "Lucknow", state: "Uttar Pradesh", zip: "226001", country: "India" }],
  ["Telecaller", "Aditya Joshi", "aditya.joshi@goboxly.com", "+919820011131", "male", { street: "88 Camp Road", city: "Nagpur", state: "Maharashtra", zip: "440001", country: "India" }],
];

const run = async () => {
  await connectDB();

  const admin = await User.findOne({ where: { role: "admin" } });
  const createdBy = admin?.id || null;
  const hashed = await bcrypt.hash(TEMP_PASSWORD, BCRYPT_ROUNDS);

  for (const [roleLabel, name, emailRaw, phone, gender, address] of EMPLOYEES) {
    const role = roleLabel.toLowerCase() === "sales" ? "sales" : "telecaller";
    const email = emailRaw.toLowerCase();
    const existing = await User.findOne({ where: { email } });

    if (existing) {
      existing.name = name;
      existing.phone = phone;
      existing.role = role;
      existing.gender = gender;
      existing.address = address;
      existing.password = hashed;
      existing.permissions = DEFAULT_PERMISSIONS[role];
      existing.isActive = true;
      existing.isVerified = true;
      existing.mustChangePassword = true;
      existing.passwordChangedAt = new Date();
      existing.tokensValidFrom = new Date();
      existing.createdBy = existing.createdBy || createdBy;
      await existing.save();
      console.log(`[seed] Updated ${role}: ${email}`);
    } else {
      await User.create({
        name,
        email,
        phone,
        gender,
        address,
        password: hashed,
        role,
        permissions: DEFAULT_PERMISSIONS[role],
        isActive: true,
        isVerified: true,
        mustChangePassword: true,
        passwordChangedAt: new Date(),
        createdBy,
      });
      console.log(`[seed] Created ${role}: ${email}`);
    }
  }

  console.log(`\n[seed] Done. 5 sales + 5 telecaller accounts. Temp password: ${TEMP_PASSWORD}`);
  await sequelize.close();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("[seed] failed:", error.message);
  await sequelize.close().catch(() => {});
  process.exit(1);
});
