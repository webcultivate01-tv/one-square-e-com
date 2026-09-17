import express from "express";
import isAuth from "../middleware/isAuth.js";
import isAdmin from "../middleware/isAdmin.js";
import hasPermission from "../middleware/hasPermission.js";
import { readLimit, writeLimit } from "../middleware/rateLimit.js";
import { getDashboardStats } from "../controllers/dashboardController.js";
import {
  deleteOrder,
  getAdminSummary,
  getAllOrders,
  getOrderStats,
  getPaymentById,
  getPayments,
  getPaymentStats,
  refundOrder,
  updateOrderStatus,
} from "../controllers/adminController.js";
import { exportDataset, listDatasets } from "../controllers/dataExportController.js";

const router = express.Router();

// One gate for the whole router.
router.use(isAuth, isAdmin);

// Dashboard
router.get("/dashboard/stats", readLimit, hasPermission("reports"), getDashboardStats);
router.get("/getstats", readLimit, hasPermission("reports"), getAdminSummary);

// Orders — static segments first.
router.get("/orders/stats", readLimit, hasPermission("orders"), getOrderStats);
router.get("/getallorders", readLimit, hasPermission("orders"), getAllOrders);
router.put("/updateorderstatus/:id", writeLimit, hasPermission("orders"), updateOrderStatus);
router.post("/order/:id/refund", writeLimit, hasPermission("payments"), refundOrder);
router.delete("/order/:id", writeLimit, hasPermission("orders"), deleteOrder);

// Payments — "/payments/stats" must beat "/payments/:id".
router.get("/payments/stats", readLimit, hasPermission("payments"), getPaymentStats);
router.get("/payments", readLimit, hasPermission("payments"), getPayments);
router.get("/payments/:id", readLimit, hasPermission("payments"), getPaymentById);

// Data export
router.get("/export", readLimit, hasPermission("reports"), listDatasets);
router.get("/export/:dataset", readLimit, hasPermission("reports"), exportDataset);

export default router;
