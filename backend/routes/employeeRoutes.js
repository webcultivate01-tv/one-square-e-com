import express from "express";
import isAuth from "../middleware/isAuth.js";
import isAdmin, { requireAdminRole } from "../middleware/isAdmin.js";
import adminAvatarUpload from "../middleware/adminAvatarUpload.js";
import { readLimit, writeLimit } from "../middleware/rateLimit.js";
import {
  changeOwnPassword,
  createEmployee,
  deleteEmployee,
  getEmployeeById,
  getMe,
  listEmployees,
  removeOwnAvatar,
  resetEmployeePassword,
  setEmployeeStatus,
  updateEmployee,
  updateOwnAvatar,
  updateOwnProfile,
} from "../controllers/employeeController.js";

const router = express.Router();

// Any signed-in staff member (admin, telecaller or sales).
router.use(isAuth, isAdmin);

router.get("/me", readLimit, getMe);
router.put("/me", writeLimit, updateOwnProfile);
router.post("/me/change-password", writeLimit, changeOwnPassword);
router.put("/me/avatar", writeLimit, adminAvatarUpload.single("avatar"), updateOwnAvatar);
router.delete("/me/avatar", writeLimit, removeOwnAvatar);

/**
 * Employee Management — Admin only. Telecaller/Sales pass the staff gate above
 * (so they can use the rest of the console) but are blocked here.
 */
router.get("/employees", readLimit, requireAdminRole, listEmployees);
router.post("/employees", writeLimit, requireAdminRole, createEmployee);
router.get("/employees/:id", readLimit, requireAdminRole, getEmployeeById);
router.put("/employees/:id", writeLimit, requireAdminRole, updateEmployee);
router.patch("/employees/:id/status", writeLimit, requireAdminRole, setEmployeeStatus);
router.post("/employees/:id/reset-password", writeLimit, requireAdminRole, resetEmployeePassword);
router.delete("/employees/:id", writeLimit, requireAdminRole, deleteEmployee);

export default router;
