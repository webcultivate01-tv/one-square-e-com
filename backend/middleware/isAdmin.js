import User from "../model/userModel.js";
import { STAFF_ROLES } from "../model/userModel.js";

/** Runs after isAuth. Puts the full staff document (admin/telecaller/sales) on req.adminUser. */
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ["password", "otp", "otpExpiry", "notes"] },
    });
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "This admin account has been deactivated." });
    }
    req.adminUser = user;
    return next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/** Route-level gate for Employee Management — only the Admin role may pass. */
export const requireAdminRole = (req, res, next) => {
  if (req.adminUser?.role !== "admin") {
    return res.status(403).json({ message: "Only Admins can manage employees." });
  }
  return next();
};

export default isAdmin;
