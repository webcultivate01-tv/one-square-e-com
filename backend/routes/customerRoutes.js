import express from "express";
import isAuth from "../middleware/isAuth.js";
import isAdmin from "../middleware/isAdmin.js";
import hasPermission from "../middleware/hasPermission.js";
import { mailLimit, readLimit, writeLimit } from "../middleware/rateLimit.js";
import {
  addCustomerNote,
  bulkCustomerAction,
  bulkEmailCustomers,
  customerAnalytics,
  deleteCustomer,
  deleteCustomerNote,
  emailCustomer,
  exportCustomersCsv,
  forceLogoutCustomer,
  getCustomer,
  getCustomerActivity,
  getCustomerOrders,
  listCustomers,
  resetCustomerPassword,
  restoreCustomer,
  setCustomerStatus,
  setCustomerTags,
  setCustomerVerified,
} from "../controllers/customerController.js";

const router = express.Router();

// One gate for the whole router (blueprint section 13).
router.use(isAuth, isAdmin, hasPermission("customers"));

// Static segments BEFORE "/:id".
router.get("/analytics/summary", readLimit, customerAnalytics);
router.get("/export.csv", readLimit, exportCustomersCsv);
router.post("/bulk-action", writeLimit, bulkCustomerAction);
router.post("/bulk-email", mailLimit, bulkEmailCustomers);

router.get("/", readLimit, listCustomers);
router.get("/:id", readLimit, getCustomer);
router.get("/:id/orders", readLimit, getCustomerOrders);
router.get("/:id/activity", readLimit, getCustomerActivity);

router.patch("/:id/status", writeLimit, setCustomerStatus);
router.patch("/:id/verify", writeLimit, setCustomerVerified);
router.put("/:id/tags", writeLimit, setCustomerTags);
router.post("/:id/notes", writeLimit, addCustomerNote);
router.delete("/:id/notes/:noteId", writeLimit, deleteCustomerNote);
router.post("/:id/reset-password", writeLimit, resetCustomerPassword);
router.post("/:id/force-logout", writeLimit, forceLogoutCustomer);
router.post("/:id/email", mailLimit, emailCustomer);
router.delete("/:id", writeLimit, deleteCustomer);
router.post("/:id/restore", writeLimit, restoreCustomer);

export default router;
