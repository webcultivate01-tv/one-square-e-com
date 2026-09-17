import express from "express";
import {
  login,
  logout,
  resetPassword,
  sendOtp,
  signup,
  verifyOtp,
} from "../controllers/authController.js";
import { authLimit } from "../middleware/rateLimit.js";

const router = express.Router();

router.post("/signup", authLimit, signup);
router.post("/login", authLimit, login);
router.post("/logout", logout);
router.post("/sendotp", authLimit, sendOtp);
router.post("/verifyotp", authLimit, verifyOtp);
router.post("/resetpassword", authLimit, resetPassword);

export default router;
