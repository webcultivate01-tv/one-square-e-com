import express from "express";
import isAuth from "../middleware/isAuth.js";
import isAdmin from "../middleware/isAdmin.js";
import hasPermission from "../middleware/hasPermission.js";
import { mailLimit, readLimit, writeLimit } from "../middleware/rateLimit.js";
import {
  createOrderRequest,
  getAllOrderRequests,
  getOrderRequestById,
  updateOrderRequestStatus,
} from "../controllers/orderRequestController.js";

const router = express.Router();

const admin = [isAuth, isAdmin, hasPermission("orders")];

router.post("/create", mailLimit, createOrderRequest);
router.get("/getall", ...admin, readLimit, getAllOrderRequests);
router.get("/:id", ...admin, readLimit, getOrderRequestById);
router.put("/status/:id", ...admin, writeLimit, updateOrderRequestStatus);

export default router;
