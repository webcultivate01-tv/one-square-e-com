import express from "express";
import isAuth from "../middleware/isAuth.js";
import isAdmin from "../middleware/isAdmin.js";
import hasPermission from "../middleware/hasPermission.js";
import upload from "../middleware/upload.js";
import { writeLimit } from "../middleware/rateLimit.js";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  updateCategory,
} from "../controllers/categoryController.js";

const router = express.Router();

const admin = [isAuth, isAdmin, hasPermission("categories")];

router.get("/getall", getAllCategories);
router.post("/create", ...admin, writeLimit, upload.single("image"), createCategory);
router.put("/update/:id", ...admin, writeLimit, upload.single("image"), updateCategory);
router.delete("/delete/:id", ...admin, writeLimit, deleteCategory);

export default router;
