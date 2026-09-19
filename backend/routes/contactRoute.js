import express from "express";
import isAuth from "../middleware/isAuth.js";
import isAdmin from "../middleware/isAdmin.js";
import hasPermission from "../middleware/hasPermission.js";
import { mailLimit, readLimit, writeLimit } from "../middleware/rateLimit.js";
import {
  sendContactMessage,
  getAllEnquiries,
  updateEnquiryStatus,
  deleteEnquiry,
} from "../controllers/contactController.js";

const router = express.Router();

const admin = [isAuth, isAdmin, hasPermission("enquiries")];

router.post("/send", mailLimit, sendContactMessage);
router.get("/getall", ...admin, readLimit, getAllEnquiries);
router.put("/status/:id", ...admin, writeLimit, updateEnquiryStatus);
router.delete("/:id", ...admin, writeLimit, deleteEnquiry);

export default router;
