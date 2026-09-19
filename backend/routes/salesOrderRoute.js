import express from "express";
import isAuth from "../middleware/isAuth.js";
import isAdmin from "../middleware/isAdmin.js";
import { readLimit, writeLimit } from "../middleware/rateLimit.js";
import { createSalesOrder, getSalesOrder } from "../controllers/salesOrderController.js";

const router = express.Router();

// Permission is checked per lead type inside the controller (enquiries / orders).
router.post("/create", isAuth, isAdmin, writeLimit, createSalesOrder);
router.get("/:id", isAuth, isAdmin, readLimit, getSalesOrder);

export default router;
