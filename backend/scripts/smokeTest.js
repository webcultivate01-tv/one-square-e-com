/**
 * End-to-end smoke test.
 *
 * Boots an in-memory MongoDB, starts the real Express app, and drives the same
 * HTTP endpoints the admin panel uses — auth, RBAC, products, categories,
 * customers, dashboard and exports.
 *
 *   npm run smoke
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "smoke-test-secret-key-not-for-production";
process.env.DISABLE_RATE_LIMIT = "true";

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";

let passed = 0;
let failed = 0;
const failures = [];

const check = (name, condition, detail = "") => {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const section = (title) => console.log(`\n== ${title} ==`);

const run = async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri("goboxly_smoke");

  const { default: app } = await import("../app.js");
  const { default: User } = await import("../model/userModel.js");
  const { default: Category } = await import("../model/categoryModel.js");
  const { default: Product } = await import("../model/productModel.js");
  const { default: Order } = await import("../model/orderModel.js");
  const { BCRYPT_ROUNDS } = await import("../utils/password.js");

  await mongoose.connect(process.env.MONGO_URI);

  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;

  /** Minimal cookie-aware fetch wrapper. */
  const makeClient = () => {
    let cookie = "";
    return async (method, path, body, opts = {}) => {
      const headers = {};
      if (cookie) headers.cookie = cookie;
      let payload;
      if (body instanceof FormData) payload = body;
      else if (body !== undefined) {
        headers["content-type"] = "application/json";
        payload = JSON.stringify(body);
      }
      const res = await fetch(`${base}${path}`, { method, headers, body: payload });
      const setCookie = res.headers.getSetCookie?.() || [];
      for (const c of setCookie) {
        const pair = c.split(";")[0];
        if (pair.startsWith("token=")) cookie = pair.endsWith("token=") ? "" : pair;
      }
      if (opts.raw) return { status: res.status, buffer: Buffer.from(await res.arrayBuffer()), res };
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text.slice(0, 200) };
      }
      return { status: res.status, body: json };
    };
  };

  const superAdmin = makeClient();
  const subAdmin = makeClient();
  const customer = makeClient();
  const guest = makeClient();

  /* ------------------------------------------------------------- fixtures */
  const hash = await bcrypt.hash("Admin@1234", BCRYPT_ROUNDS);
  await User.create({
    name: "Root Admin",
    email: "root@goboxly.com",
    password: hash,
    role: "super_admin",
    isActive: true,
    isVerified: true,
  });

  /* ----------------------------------------------------------------- auth */
  section("Auth & session");
  let r = await guest("GET", "/api/health");
  check("health endpoint responds", r.status === 200 && r.body.ok === true);

  r = await superAdmin("POST", "/api/auth/login", {
    email: "root@goboxly.com",
    password: "wrong-password",
  });
  check("bad password is rejected (401)", r.status === 401, `got ${r.status}`);

  r = await superAdmin("POST", "/api/auth/login", {
    email: "root@goboxly.com",
    password: "Admin@1234",
  });
  check("super admin signs in", r.status === 200 && r.body.user?.role === "super_admin", JSON.stringify(r.body));

  r = await superAdmin("GET", "/api/user/getprofile");
  check("session probe returns the profile", r.status === 200 && r.body.user?.email === "root@goboxly.com");

  r = await guest("GET", "/api/user/getprofile");
  check("unauthenticated probe is 401", r.status === 401, `got ${r.status}`);

  r = await guest("GET", "/api/admin/dashboard/stats");
  check("admin route blocks anonymous callers", r.status === 401, `got ${r.status}`);

  /* ------------------------------------------------------------- customer */
  section("Customer signup & role gate");
  r = await customer("POST", "/api/auth/signup", {
    name: "Test Buyer",
    email: "buyer@example.com",
    password: "Buyer@1234",
  });
  check("customer signs up", r.status === 201 && r.body.user?.role === "user", JSON.stringify(r.body));

  r = await customer("POST", "/api/auth/signup", {
    name: "Weak",
    email: "weak@example.com",
    password: "abc",
  });
  check("weak password is rejected (400)", r.status === 400);

  r = await customer("GET", "/api/admin/dashboard/stats");
  check("customer cannot reach admin routes (403)", r.status === 403, `got ${r.status}`);

  /* ----------------------------------------------------------- categories */
  section("Categories");
  const form = new FormData();
  form.set("name", "Corrugated Boxes");
  form.set("description", "Shipping cartons");
  r = await superAdmin("POST", "/api/category/create", form);
  check("category created", r.status === 201 && Boolean(r.body.category?._id), JSON.stringify(r.body));
  const categoryId = r.body.category?._id;

  const dupe = new FormData();
  dupe.set("name", "Corrugated Boxes");
  r = await superAdmin("POST", "/api/category/create", dupe);
  check("duplicate category name rejected (400)", r.status === 400, `got ${r.status}`);

  r = await guest("GET", "/api/category/getall");
  check("category list is public", r.status === 200 && r.body.categories?.length === 1);

  /* ------------------------------------------------------------- products */
  section("Products");
  const pForm = new FormData();
  pForm.set("name", "Single Wall Carton 12x9x6");
  pForm.set("category", categoryId);
  pForm.set("price", "0.89");
  pForm.set("discountPrice", "0.75");
  pForm.set("stock", "500");
  pForm.set("sku", "SW-12096");
  pForm.set("status", "active");
  pForm.set("isPublished", "true");
  pForm.set("tags", JSON.stringify(["carton", "packaging"]));
  pForm.set("dimensions", JSON.stringify({ length: 12, width: 9, height: 6 }));
  r = await superAdmin("POST", "/api/product/create", pForm);
  check("product created", r.status === 201 && Boolean(r.body.product?._id), JSON.stringify(r.body));
  const productId = r.body.product?._id;
  const productSlug = r.body.product?.slug;

  const badPrice = new FormData();
  badPrice.set("name", "Bad Product");
  badPrice.set("category", categoryId);
  badPrice.set("price", "10");
  badPrice.set("discountPrice", "20");
  r = await superAdmin("POST", "/api/product/create", badPrice);
  check("discount above price rejected (400)", r.status === 400, `got ${r.status}`);

  const dupeSku = new FormData();
  dupeSku.set("name", "Another Carton");
  dupeSku.set("category", categoryId);
  dupeSku.set("price", "1.50");
  dupeSku.set("sku", "SW-12096");
  r = await superAdmin("POST", "/api/product/create", dupeSku);
  check("duplicate SKU rejected (409)", r.status === 409, `got ${r.status}`);

  r = await superAdmin("GET", "/api/product/stats");
  check("product stats route beats /:id", r.status === 200 && r.body.stats?.total === 1, JSON.stringify(r.body));

  r = await superAdmin("GET", "/api/product/inventory");
  check("inventory report renders", r.status === 200 && r.body.inventory?.length === 1);

  r = await superAdmin("GET", "/api/product/getall?q=carton&status=active&sort=price_asc");
  check("admin product filters work", r.status === 200 && r.body.products?.length === 1, JSON.stringify(r.body.pagination));

  r = await guest("GET", `/api/product/${productSlug}`);
  check("public product lookup by slug", r.status === 200 && r.body.product?.name?.includes("Carton"));

  r = await guest("GET", "/api/product/getpublished");
  check("published catalog is public", r.status === 200 && r.body.products?.length === 1);

  r = await superAdmin("POST", "/api/product/bulk", {
    ids: [productId],
    action: "updateStock",
    value: 8,
  });
  check("bulk stock update applies", r.status === 200 && r.body.modified === 1, JSON.stringify(r.body));

  r = await superAdmin("GET", "/api/product/getall?stock=low");
  check("low-stock filter uses $expr correctly", r.status === 200 && r.body.products?.length === 1, JSON.stringify(r.body.pagination));

  const updForm = new FormData();
  updForm.set("name", "Single Wall Carton 12x9x6 (V2)");
  updForm.set("stock", "500");
  r = await superAdmin("PUT", `/api/product/update/${productId}`, updForm);
  check("product update + reslug", r.status === 200 && r.body.product?.slug !== productSlug, JSON.stringify(r.body.message));

  r = await superAdmin("DELETE", `/api/product/delete/${productId}`);
  check("soft delete", r.status === 200);
  r = await superAdmin("GET", "/api/product/getall");
  check("soft-deleted product is hidden by default", r.body.products?.length === 0);
  r = await superAdmin("GET", "/api/product/getall?includeDeleted=true");
  check("includeDeleted opts back in", r.body.products?.length === 1);
  r = await superAdmin("POST", `/api/product/restore/${productId}`);
  check("restore works", r.status === 200);

  /* --------------------------------------------- category delete guard */
  section("Category delete guard");
  r = await superAdmin("DELETE", `/api/category/delete/${categoryId}`);
  check("delete blocked while products reference it (409)", r.status === 409, `got ${r.status}`);

  const spare = new FormData();
  spare.set("name", "Spare Category");
  const spareRes = await superAdmin("POST", "/api/category/create", spare);
  const spareId = spareRes.body.category?._id;
  r = await superAdmin("DELETE", `/api/category/delete/${spareId}`);
  check("unused category deletes cleanly", r.status === 200, `got ${r.status}`);

  /* ------------------------------------------------------ admin management */
  section("Admin management & role matrix");
  r = await superAdmin("GET", "/api/admin/management/me");
  check("/me is not swallowed by /admins/:id", r.status === 200 && r.body.admin?.role === "super_admin");

  r = await superAdmin("POST", "/api/admin/management/admins", {
    name: "Sub Operator",
    email: "sub@goboxly.com",
    password: "SubAdmin@123",
    role: "sub_admin",
    permissions: ["products", "orders"],
    mustChangePassword: false,
  });
  check("super admin creates a sub admin", r.status === 201, JSON.stringify(r.body));
  const subAdminId = r.body.admin?._id;

  r = await superAdmin("POST", "/api/admin/management/admins", {
    name: "Dupe",
    email: "sub@goboxly.com",
    password: "SubAdmin@123",
    role: "sub_admin",
  });
  check("duplicate admin email rejected (409)", r.status === 409, `got ${r.status}`);

  r = await superAdmin("POST", "/api/admin/management/admins", {
    name: "Weak Pass",
    email: "weak-admin@goboxly.com",
    password: "password",
    role: "sub_admin",
  });
  check("weak admin password rejected (400)", r.status === 400);

  const me = await User.findOne({ email: "root@goboxly.com" });
  r = await superAdmin("PUT", `/api/admin/management/admins/${me._id}`, { role: "admin" });
  check("cannot act on self via admin management (403)", r.status === 403, `got ${r.status}`);

  r = await superAdmin("PATCH", `/api/admin/management/admins/${me._id}/status`, { isActive: false });
  check("last super admin cannot be deactivated", r.status === 403 || r.status === 400, `got ${r.status}`);

  /* ------------------------------------------------- permission enforcement */
  section("Route-level permission enforcement");
  r = await subAdmin("POST", "/api/auth/login", {
    email: "sub@goboxly.com",
    password: "SubAdmin@123",
  });
  check("sub admin signs in", r.status === 200 && r.body.user?.role === "sub_admin");

  r = await subAdmin("GET", "/api/product/getall");
  check("sub admin with products permission can list products", r.status === 200, `got ${r.status}`);

  r = await subAdmin("GET", "/api/admin/customers");
  check("sub admin without customers permission is blocked (403)", r.status === 403, `got ${r.status}`);

  r = await subAdmin("GET", "/api/admin/dashboard/stats");
  check("sub admin without reports permission is blocked (403)", r.status === 403, `got ${r.status}`);

  r = await subAdmin("POST", "/api/admin/management/admins", {
    name: "Nope",
    email: "nope@goboxly.com",
    password: "Nope@12345",
    role: "admin",
  });
  check("sub admin cannot create admins (403)", r.status === 403, `got ${r.status}`);

  /* ----------------------------------------------------------- force logout */
  section("Force logout (tokensValidFrom)");
  r = await superAdmin("PATCH", `/api/admin/management/admins/${subAdminId}/status`, {
    isActive: false,
  });
  check("sub admin deactivated", r.status === 200, JSON.stringify(r.body));

  r = await subAdmin("GET", "/api/product/getall");
  check("deactivated admin's existing session is invalidated", r.status === 401, `got ${r.status}`);

  await superAdmin("PATCH", `/api/admin/management/admins/${subAdminId}/status`, { isActive: true });

  /* -------------------------------------------------------------- customers */
  section("Customer management");
  const buyer = await User.findOne({ email: "buyer@example.com" });

  r = await superAdmin("GET", "/api/admin/customers?search=buyer&sort=newest");
  check("customer listing aggregation runs", r.status === 200 && r.body.customers?.length === 1, JSON.stringify(r.body));
  check("listing joins order aggregates", r.body.customers?.[0]?.totalOrders === 0);

  r = await superAdmin("GET", "/api/admin/customers/analytics/summary");
  check("analytics summary (static route beats /:id)", r.status === 200 && r.body.summary?.total === 1, JSON.stringify(r.body.summary));

  r = await superAdmin("GET", `/api/admin/customers/${buyer._id}`);
  check("customer detail + analytics", r.status === 200 && r.body.analytics?.totalOrders === 0);

  r = await superAdmin("PUT", `/api/admin/customers/${buyer._id}/tags`, {
    tags: ["VIP Customer", "VIP Customer", "New Customer"],
  });
  check("tags are deduped", r.status === 200 && r.body.customer?.tags?.length === 2, JSON.stringify(r.body.customer?.tags));

  r = await superAdmin("POST", `/api/admin/customers/${buyer._id}/notes`, { body: "Called about a bulk quote." });
  check("private note added", r.status === 201 && r.body.customer?.notes?.length === 1);
  const noteId = r.body.customer?.notes?.[0]?._id;
  r = await superAdmin("DELETE", `/api/admin/customers/${buyer._id}/notes/${noteId}`);
  check("note deleted", r.status === 200 && r.body.customer?.notes?.length === 0);

  r = await superAdmin("PATCH", `/api/admin/customers/${buyer._id}/status`, {
    status: "suspended",
    reason: "Payment dispute",
  });
  check("customer suspended", r.status === 200 && r.body.customer?.customerStatus === "suspended");

  r = await customer("GET", "/api/user/getprofile");
  check("suspension force-logs the customer out", r.status === 401, `got ${r.status}`);

  r = await customer("POST", "/api/auth/login", { email: "buyer@example.com", password: "Buyer@1234" });
  check("suspended customer cannot sign in (403)", r.status === 403, `got ${r.status}`);

  await superAdmin("PATCH", `/api/admin/customers/${buyer._id}/status`, { status: "active" });
  r = await customer("POST", "/api/auth/login", { email: "buyer@example.com", password: "Buyer@1234" });
  check("reactivated customer can sign in again", r.status === 200, `got ${r.status}`);

  r = await superAdmin("GET", `/api/admin/customers/${buyer._id}/activity`);
  check("activity timeline records events", r.status === 200 && r.body.activity?.length > 0, `${r.body.activity?.length} rows`);

  r = await superAdmin("GET", "/api/admin/customers/export.csv");
  check("customer CSV export streams", r.status === 200);

  /* -------------------------------------------------- orders, payments, KPIs */
  section("Orders, payments & dashboard");
  const prod = await Product.findById(productId);
  const cat = await Category.findById(categoryId);
  check("fixtures intact", Boolean(prod && cat));

  await Order.create({
    user: buyer._id,
    items: [{ product: prod._id, name: prod.name, quantity: 3, price: 0.75 }],
    shippingAddress: { name: "Test Buyer", city: "Austin", country: "USA", email: "buyer@example.com" },
    subtotal: 2.25,
    tax: 0.16,
    shippingCost: 24.99,
    total: 27.4,
    status: "confirmed",
    paymentStatus: "paid",
    stripePaymentId: "pi_smoke_1",
    cardBrand: "visa",
    cardLast4: "4242",
    paidAt: new Date(),
  });

  r = await superAdmin("GET", "/api/admin/getallorders");
  check("order list returns rows", r.status === 200 && r.body.orders?.length === 1, JSON.stringify(r.body));
  const orderId = r.body.orders?.[0]?._id;
  check("short order id is derived", r.body.orders?.[0]?.shortId?.length === 8);

  r = await superAdmin("PUT", `/api/admin/updateorderstatus/${orderId}`, { status: "shipped", trackingNumber: "TRK123" });
  check("order status updated", r.status === 200 && r.body.order?.status === "shipped", JSON.stringify(r.body.message));

  r = await superAdmin("PUT", `/api/admin/updateorderstatus/${orderId}`, { status: "teleported" });
  check("invalid status rejected (400)", r.status === 400);

  r = await superAdmin("GET", "/api/admin/payments/stats");
  check("payment stats route beats /payments/:id", r.status === 200 && r.body.stats?.paidCount === 1, JSON.stringify(r.body.stats));

  r = await superAdmin("GET", "/api/admin/payments?search=4242");
  check("payment search across card last4", r.status === 200 && r.body.payments?.length === 1);

  r = await superAdmin("POST", `/api/admin/order/${orderId}/refund`);
  check("refund mirrors onto the order synchronously", r.status === 200 && r.body.order?.paymentStatus === "refunded", JSON.stringify(r.body.message));

  r = await superAdmin("POST", `/api/admin/order/${orderId}/refund`);
  check("double refund is rejected (409)", r.status === 409, `got ${r.status}`);

  r = await superAdmin("GET", "/api/admin/dashboard/stats?range=14");
  check("dashboard aggregate responds", r.status === 200, JSON.stringify(r.body).slice(0, 160));
  check("KPIs present", typeof r.body.kpis?.totalRevenue === "number");
  check("sparklines have one point per day", r.body.sparklines?.revenue?.length === 14, `${r.body.sparklines?.revenue?.length}`);
  check("weekly sales has 7 buckets", r.body.weeklySales?.length === 7);
  check("funnel is monotonically decreasing", (() => {
    const v = (r.body.fulfillmentFunnel || []).map((s) => s.value);
    return v.every((n, i) => i === 0 || n <= v[i - 1]);
  })());
  check("charts ship their own colours", Boolean(r.body.fulfillmentFunnel?.[0]?.color));

  r = await superAdmin("GET", "/api/admin/dashboard/stats?range=7");
  check("range=7 is honoured", r.body.sparklines?.revenue?.length === 7, `${r.body.sparklines?.revenue?.length}`);

  r = await superAdmin("GET", "/api/admin/dashboard/stats?range=30");
  check("range=30 is honoured", r.body.sparklines?.revenue?.length === 30);

  /* ---------------------------------------------------------------- exports */
  section("Data export");
  r = await superAdmin("GET", "/api/admin/export");
  check("dataset registry lists datasets", r.status === 200 && r.body.datasets?.length === 6, JSON.stringify(r.body.datasets?.map((d) => d.key)));

  for (const format of ["csv", "xlsx", "pdf"]) {
    const out = await superAdmin("GET", `/api/admin/export/orders?format=${format}`, undefined, { raw: true });
    check(`${format} export streams a file`, out.status === 200 && out.buffer.length > 100, `${out.buffer.length} bytes`);
  }

  const out = await superAdmin("GET", "/api/admin/export/products?format=xlsx", undefined, { raw: true });
  check("xlsx has a zip signature", out.buffer.slice(0, 2).toString() === "PK");

  r = await superAdmin("GET", "/api/admin/export/nope?format=csv");
  check("unknown dataset is 404", r.status === 404);

  /* ----------------------------------------------------- own password change */
  section("Change own password");
  r = await superAdmin("POST", "/api/admin/management/me/change-password", {
    currentPassword: "wrong",
    newPassword: "NewPass@123",
  });
  check("wrong current password rejected (401)", r.status === 401, `got ${r.status}`);

  r = await superAdmin("POST", "/api/admin/management/me/change-password", {
    currentPassword: "Admin@1234",
    newPassword: "Admin@1234",
  });
  check("reusing the same password is rejected (400)", r.status === 400);

  r = await superAdmin("POST", "/api/admin/management/me/change-password", {
    currentPassword: "Admin@1234",
    newPassword: "Rotated@2024",
  });
  check("password rotated", r.status === 200, JSON.stringify(r.body));

  const fresh = makeClient();
  r = await fresh("POST", "/api/auth/login", { email: "root@goboxly.com", password: "Rotated@2024" });
  check("new password works", r.status === 200);

  /* ------------------------------------------------------------------- 404 */
  section("Error handling");
  r = await guest("GET", "/api/does-not-exist");
  check("unknown route returns a JSON 404", r.status === 404 && typeof r.body.message === "string");

  r = await superAdmin("GET", "/api/product/not-a-real-id");
  check("bad product identifier is 404 not a crash", r.status === 404, `got ${r.status}`);

  r = await superAdmin("GET", "/api/admin/customers/12345");
  check("invalid ObjectId is 400", r.status === 400, `got ${r.status}`);

  /* --------------------------------------------------------------- teardown */
  await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.close();
  await mongod.stop();

  console.log(`\n${"=".repeat(52)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log("\n  Failures:");
    for (const f of failures) console.log(`   - ${f}`);
  }
  console.log(`${"=".repeat(52)}\n`);
  process.exit(failed === 0 ? 0 : 1);
};

run().catch((error) => {
  console.error("\n[smoke] crashed:", error);
  process.exit(1);
});
