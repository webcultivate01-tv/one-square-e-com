import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Behind a proxy (Render/Heroku/Nginx) so req.ip and secure cookies resolve correctly.
app.set("trust proxy", 1);

/* -------------------------------------------------------------------- CORS */

const allowList = String(process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl / Postman / same-origin
      if (allowList.includes(origin)) return cb(null, true);
      if (
        process.env.NODE_ENV !== "production" &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return cb(null, true);
      }
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

/* ------------------------------------------------------------------ parsers */

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// Uploaded images when Cloudinary is not configured.
app.use("/public", express.static(path.join(__dirname, "public")));

// Product images: <project root>/uploads/products/<category>/<productId>/<file>.
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

/* ------------------------------------------------------------------ routes */

app.get("/api/health", (_req, res) =>
  res.status(200).json({ ok: true, uptime: process.uptime(), env: process.env.NODE_ENV || "development" })
);

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/product", productRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/admin/customers", customerRoutes);
app.use("/api/admin", employeeRoutes);
app.use("/api/admin", adminRoutes);

/* ------------------------------------------------------- 404 + error handler */

app.use(notFound);
app.use(errorHandler);

export default app;
