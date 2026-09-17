import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import User from "../model/userModel.js";
import Category from "../model/categoryModel.js";
import Product from "../model/productModel.js";
import Order from "../model/orderModel.js";
import CustomerActivity from "../model/customerActivityModel.js";
import { toSlug } from "../utils/helpers.js";
import { BCRYPT_ROUNDS } from "../utils/password.js";

/**
 * Populates the console with realistic demo data so every chart, filter and
 * table has something to show. Safe to re-run: it wipes the demo collections
 * first, but never touches admin accounts.
 *
 *   npm run seed:demo
 */

const CATEGORIES = [
  { name: "Corrugated Boxes", description: "Single and double wall shipping cartons." },
  { name: "Mailers & Envelopes", description: "Padded mailers and poly bags." },
  { name: "Packing Tape", description: "Carton sealing and reinforced tapes." },
  { name: "Void Fill", description: "Bubble wrap, kraft paper and foam." },
  { name: "Labels & Stickers", description: "Thermal labels and handling stickers." },
];

const PRODUCT_SEED = [
  ["Single Wall Carton 12x9x6", "Corrugated Boxes", 0.89, 1400, "SW-12096"],
  ["Double Wall Carton 18x18x18", "Corrugated Boxes", 2.45, 620, "DW-181818"],
  ["Heavy Duty Export Carton 24x18x18", "Corrugated Boxes", 3.9, 180, "HD-241818"],
  ["Flat Pack Book Wrap A4", "Corrugated Boxes", 0.62, 40, "FP-A4"],
  ["Padded Bubble Mailer #2", "Mailers & Envelopes", 0.34, 5200, "PM-002"],
  ["Poly Mailer 10x13 (100pk)", "Mailers & Envelopes", 8.75, 310, "PY-1013"],
  ["Document Enclosed Wallet", "Mailers & Envelopes", 0.11, 9800, "DE-A6"],
  ["Clear Packing Tape 48mm x 66m", "Packing Tape", 1.75, 2400, "CT-4866"],
  ["Reinforced Kraft Tape 70mm", "Packing Tape", 6.4, 95, "RK-70"],
  ["Fragile Printed Tape 48mm", "Packing Tape", 2.2, 8, "FR-48"],
  ["Bubble Wrap Roll 500mm x 100m", "Void Fill", 22.5, 140, "BW-500"],
  ["Kraft Paper Void Fill 400mm", "Void Fill", 18.9, 76, "KP-400"],
  ["Biodegradable Loose Fill 15cuft", "Void Fill", 31.0, 0, "BL-15"],
  ["Thermal Shipping Label 4x6 (500)", "Labels & Stickers", 12.4, 430, "TL-46"],
  ["Handle With Care Sticker Roll", "Labels & Stickers", 5.6, 22, "HC-ROLL"],
];

const CUSTOMERS = [
  ["Priya Nair", "priya.nair@example.com", "Mumbai", "Maharashtra", "India"],
  ["Daniel Okafor", "daniel.okafor@example.com", "Austin", "TX", "USA"],
  ["Mei Chen", "mei.chen@example.com", "Vancouver", "BC", "Canada"],
  ["Lukas Braun", "lukas.braun@example.com", "Berlin", "Berlin", "Germany"],
  ["Sofia Rossi", "sofia.rossi@example.com", "Milan", "Lombardy", "Italy"],
  ["Ahmed Hassan", "ahmed.hassan@example.com", "Dubai", "Dubai", "UAE"],
  ["Grace Miller", "grace.miller@example.com", "Leeds", "England", "UK"],
  ["Tomas Silva", "tomas.silva@example.com", "Lisbon", "Lisbon", "Portugal"],
  ["Aiko Tanaka", "aiko.tanaka@example.com", "Osaka", "Osaka", "Japan"],
  ["Noah Dubois", "noah.dubois@example.com", "Lyon", "ARA", "France"],
  ["Ravi Sharma", "ravi.sharma@example.com", "Pune", "Maharashtra", "India"],
  ["Emma Novak", "emma.novak@example.com", "Prague", "Prague", "Czechia"],
];

const CARD_BRANDS = ["visa", "mastercard", "amex", "discover"];
const ORDER_STATUS = ["confirmed", "shipped", "in_transit", "delivered", "cancelled"];
const TAGS = ["VIP Customer", "Frequent Buyer", "Wholesale Buyer", "New Customer", "High Spender"];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const round2 = (n) => Math.round(n * 100) / 100;
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

const run = async () => {
  await connectDB();
  console.log("[demo] clearing previous demo data...");

  await Promise.all([
    Order.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    CustomerActivity.deleteMany({}),
    User.deleteMany({ role: "user" }),
  ]);

  const admin = await User.findOne({ role: "admin" }).select("_id");
  const createdBy = admin?._id || null;

  /* ------------------------------------------------------------ categories */
  const categories = await Category.insertMany(
    CATEGORIES.map((c) => ({
      ...c,
      slug: toSlug(c.name),
      isActive: true,
      createdBy,
    }))
  );
  const catByName = new Map(categories.map((c) => [c.name, c]));
  console.log(`[demo] ${categories.length} categories`);

  /* -------------------------------------------------------------- products */
  const products = [];
  for (let i = 0; i < PRODUCT_SEED.length; i += 1) {
    const [name, catName, price, stock, sku] = PRODUCT_SEED[i];
    const hasDiscount = i % 4 === 0;
    products.push({
      name,
      slug: toSlug(name),
      sku,
      description: `${name} — warehouse grade packaging supply, sold per unit.`,
      brand: "GOBOXLY",
      category: catByName.get(catName)._id,
      tags: [catName.toLowerCase().split(" ")[0], "packaging"],
      price,
      discountPrice: hasDiscount ? round2(price * 0.85) : 0,
      costPrice: round2(price * 0.6),
      tax: 5,
      stock,
      lowStockThreshold: 25,
      images: [],
      status: stock === 0 ? "out_of_stock" : "active",
      isPublished: true,
      isFeatured: i % 5 === 0,
      isBestseller: i % 7 === 0,
      isNewArrival: i >= PRODUCT_SEED.length - 3,
      salesCount: rand(0, 400),
      viewsCount: rand(20, 3000),
      averageRating: round2(3.5 + Math.random() * 1.5),
      reviewCount: rand(0, 90),
      createdAt: daysAgo(rand(0, 40)),
      createdBy,
    });
  }
  const savedProducts = await Product.insertMany(products);
  console.log(`[demo] ${savedProducts.length} products`);

  /* ------------------------------------------------------------- customers */
  const password = await bcrypt.hash("Customer@123", BCRYPT_ROUNDS);
  const customerDocs = CUSTOMERS.map(([name, email, city, state, country], i) => ({
    name,
    email,
    password,
    role: "user",
    phone: `+1${rand(200, 999)}${rand(1000000, 9999999)}`,
    isVerified: i % 3 !== 0,
    customerStatus: i === 5 ? "suspended" : i === 9 ? "blocked" : "active",
    statusReason: i === 5 ? "Chargeback under review" : i === 9 ? "Repeated fraud reports" : "",
    tags: i % 3 === 0 ? [pick(TAGS)] : [],
    address: { street: `${rand(1, 200)} Warehouse Rd`, city, state, zip: String(rand(10000, 99999)), country },
    lastLogin: daysAgo(rand(0, 20)),
    loginCount: rand(1, 60),
    lastLoginDevice: pick(["Chrome on Windows 10/11", "Safari on iOS", "Firefox on Linux"]),
    createdAt: daysAgo(rand(1, 60)),
  }));
  const customers = await User.insertMany(customerDocs);
  console.log(`[demo] ${customers.length} customers`);

  /* ---------------------------------------------------------------- orders */
  const orders = [];
  for (let i = 0; i < 140; i += 1) {
    const customer = pick(customers);
    const lineCount = rand(1, 4);
    const items = [];
    let subtotal = 0;

    for (let j = 0; j < lineCount; j += 1) {
      const p = pick(savedProducts);
      const qty = rand(1, 12);
      const unit = p.discountPrice > 0 ? p.discountPrice : p.price;
      items.push({ product: p._id, name: p.name, quantity: qty, price: unit });
      subtotal += unit * qty;
    }

    subtotal = round2(subtotal);
    const discount = i % 6 === 0 ? round2(subtotal * 0.1) : 0;
    const taxable = subtotal - discount;
    const tax = round2(taxable * 0.0725);
    const shippingCost = taxable >= 500 ? 0 : 24.99;
    const total = round2(taxable + tax + shippingCost);

    const placedAt = daysAgo(rand(0, 29));
    const status = pick(ORDER_STATUS);
    const refunded = i % 17 === 0;
    const partial = i % 29 === 0 && !refunded;
    const disputed = i % 41 === 0 && !refunded && !partial;

    orders.push({
      user: customer._id,
      items,
      shippingAddress: {
        name: customer.name,
        street: customer.address.street,
        city: customer.address.city,
        state: customer.address.state,
        zip: customer.address.zip,
        country: customer.address.country,
        phone: customer.phone,
        email: customer.email,
      },
      subtotal,
      discount,
      coupon: discount ? { code: "WELCOME10", type: "percentage", value: 10, discount } : {},
      shippingCost,
      tax,
      total,
      currency: "USD",
      status: refunded ? "cancelled" : status,
      paymentStatus: refunded
        ? "refunded"
        : partial
          ? "partially_refunded"
          : disputed
            ? "disputed"
            : "paid",
      stripePaymentId: `pi_demo_${Date.now()}_${i}`,
      stripeChargeId: `ch_demo_${i}`,
      cardBrand: pick(CARD_BRANDS),
      cardLast4: String(rand(1000, 9999)),
      paymentMethod: "card",
      paidAt: placedAt,
      refundedAmount: refunded ? total : partial ? round2(total * 0.4) : 0,
      refundedAt: refunded || partial ? placedAt : null,
      invoiceNumber: `INV-${placedAt.toISOString().slice(0, 10).replace(/-/g, "")}-${String(i).padStart(4, "0")}`,
      createdAt: placedAt,
      updatedAt: placedAt,
    });
  }
  await Order.insertMany(orders);
  console.log(`[demo] ${orders.length} orders`);

  /* -------------------------------------------------------------- activity */
  const activity = [];
  for (const c of customers) {
    activity.push(
      {
        customer: c._id,
        type: "signup",
        action: "account.created",
        message: "Account created.",
        createdAt: c.createdAt,
      },
      {
        customer: c._id,
        type: "login",
        action: "auth.login",
        message: `Signed in from ${c.lastLoginDevice}.`,
        device: c.lastLoginDevice,
        createdAt: c.lastLogin,
      }
    );
  }
  await CustomerActivity.insertMany(activity);
  console.log(`[demo] ${activity.length} activity rows`);

  console.log("\n[demo] Done. Customer demo login: priya.nair@example.com / Customer@123");
  await mongoose.connection.close();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("[demo] failed:", error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
