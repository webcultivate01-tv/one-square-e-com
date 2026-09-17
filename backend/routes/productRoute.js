import express from "express";
import isAuth from "../middleware/isAuth.js";
import isAdmin from "../middleware/isAdmin.js";
import hasPermission from "../middleware/hasPermission.js";
import upload from "../middleware/productUpload.js";
import { readLimit, writeLimit } from "../middleware/rateLimit.js";
import {
  bulkProducts,
  createProduct,
  deleteProduct,
  getAllProducts,
  getInventory,
  getProductById,
  getProductStats,
  getPublishedProducts,
  restoreProduct,
  updateProduct,
} from "../controllers/productController.js";

const router = express.Router();

const admin = [isAuth, isAdmin, hasPermission("products")];

// Public
router.get("/getpublished", getPublishedProducts);

// Admin — every static segment is registered BEFORE "/:id".
router.get("/stats", ...admin, readLimit, getProductStats);
router.get("/inventory", ...admin, readLimit, getInventory);
router.get("/getall", ...admin, readLimit, getAllProducts);
router.post("/bulk", ...admin, writeLimit, bulkProducts);
router.post("/create", ...admin, writeLimit, upload.array("images", 10), createProduct);
router.put("/update/:id", ...admin, writeLimit, upload.array("images", 10), updateProduct);
router.delete("/delete/:id", ...admin, writeLimit, deleteProduct);
router.post("/restore/:id", ...admin, writeLimit, restoreProduct);

// Public, registered LAST so it never shadows the static routes above.
router.get("/:id", getProductById);

export default router;
