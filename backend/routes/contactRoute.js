import express from "express";
import { sendContactMessage } from "../controllers/contactController.js";
import { mailLimit } from "../middleware/rateLimit.js";

const router = express.Router();

router.post("/send", mailLimit, sendContactMessage);

export default router;
