import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import validator from "validator";
import User, { EMPLOYEE_ROLES, PERMISSION_KEYS } from "../model/userModel.js";
import { toAdminDTO } from "../utils/dto.js";
import { isValidId, isFilterActive, likeTerm } from "../utils/helpers.js";
import { isStrongPassword, PASSWORD_HINT, BCRYPT_ROUNDS } from "../utils/password.js";
import { sendAdminInviteMail } from "../config/nodemailer.js";
import { adminAvatarUrl, deleteAdminAvatarUrl, pruneOldAvatars } from "../utils/adminAvatarStorage.js";

const GENDERS = ["male", "female", "other", ""];

const cleanAddress = (address, fallback = {}) => ({
  street: address?.street ?? fallback?.street ?? "",
  city: address?.city ?? fallback?.city ?? "",
  state: address?.state ?? fallback?.state ?? "",
  zip: address?.zip ?? fallback?.zip ?? "",
  country: address?.country ?? fallback?.country ?? "",
});

/* --------------------------------------------------- permission matrix */

/** Only the Admin role manages employees, and only telecaller/sales are targets. */
export const canActOn = (actor, target) => {
  if (!actor || !target) return false;
  if (String(actor.id) === String(target.id)) return false; // never act on self here
  if (actor.role !== "admin") return false;
  return EMPLOYEE_ROLES.includes(target.role);
};

const cleanPermissions = (list) =>
  [...new Set((Array.isArray(list) ? list : []).map(String))].filter((p) =>
    PERMISSION_KEYS.includes(p)
  );

/* ------------------------------------------------------------- own profile */

// GET /api/admin/me
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({ admin: toAdminDTO(req.adminUser) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/me/change-password
export const changeOwnPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are both required." });
    }

    const me = await User.findByPk(req.userId);
    if (!me) return res.status(404).json({ message: "Account not found." });

    const ok = await bcrypt.compare(String(currentPassword), me.password);
    if (!ok) return res.status(401).json({ message: "Current password is incorrect." });

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_HINT });
    }

    const same = await bcrypt.compare(String(newPassword), me.password);
    if (same) {
      return res
        .status(400)
        .json({ message: "New password must be different from the current one." });
    }

    me.password = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);
    me.passwordChangedAt = new Date();
    me.mustChangePassword = false;
    await me.save();

    return res.status(200).json({ message: "Password updated." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/me — name, email, phone, gender, date of birth, address
export const updateOwnProfile = async (req, res) => {
  try {
    const { name, email, phone, gender, dateOfBirth, address } = req.body || {};
    const me = await User.findByPk(req.userId);
    if (!me) return res.status(404).json({ message: "Account not found." });

    if (typeof name === "string") {
      if (!name.trim()) return res.status(400).json({ message: "Name cannot be empty." });
      me.name = name.trim();
    }

    if (typeof email === "string" && email.trim()) {
      const nextEmail = email.toLowerCase().trim();
      if (!validator.isEmail(nextEmail)) {
        return res.status(400).json({ message: "Enter a valid email address." });
      }
      if (nextEmail !== me.email) {
        const clash = await User.findOne({ where: { email: nextEmail, id: { [Op.ne]: me.id } } });
        if (clash) return res.status(409).json({ message: "Email already in use." });
        me.email = nextEmail;
      }
    }

    if (typeof phone === "string") me.phone = phone.trim();
    if (gender !== undefined && GENDERS.includes(gender)) me.gender = gender;
    if (dateOfBirth !== undefined) me.dateOfBirth = dateOfBirth || null;

    if (address && typeof address === "object") {
      me.address = {
        street: address.street ?? me.address?.street ?? "",
        city: address.city ?? me.address?.city ?? "",
        state: address.state ?? me.address?.state ?? "",
        zip: address.zip ?? me.address?.zip ?? "",
        country: address.country ?? me.address?.country ?? "",
      };
    }

    await me.save();

    return res.status(200).json({ admin: toAdminDTO(me), message: "Profile updated." });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Email already in use." });
    }
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/me/avatar — multipart field "avatar"
export const updateOwnAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "An image file is required." });

    const me = await User.findByPk(req.userId);
    if (!me) return res.status(404).json({ message: "Account not found." });

    me.avatar = adminAvatarUrl(me.id, req.file.filename);
    pruneOldAvatars(me.id, req.file.filename);
    await me.save();

    return res.status(200).json({ admin: toAdminDTO(me), message: "Profile photo updated." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/me/avatar — remove the photo and fall back to initials
export const removeOwnAvatar = async (req, res) => {
  try {
    const me = await User.findByPk(req.userId);
    if (!me) return res.status(404).json({ message: "Account not found." });

    if (me.avatar) deleteAdminAvatarUrl(me.avatar);
    me.avatar = "";
    await me.save();

    return res.status(200).json({ admin: toAdminDTO(me), message: "Profile photo removed." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ----------------------------------------------------------- employee CRUD */

// GET /api/admin/employees
export const listEmployees = async (req, res) => {
  try {
    const dbWhere = { role: { [Op.in]: EMPLOYEE_ROLES } };

    if (req.query.search) {
      const term = likeTerm(req.query.search);
      dbWhere[Op.or] = [
        { name: { [Op.like]: term } },
        { email: { [Op.like]: term } },
        { phone: { [Op.like]: term } },
      ];
    }
    if (isFilterActive(req.query.role) && EMPLOYEE_ROLES.includes(req.query.role)) {
      dbWhere.role = req.query.role;
    }
    if (isFilterActive(req.query.status)) {
      dbWhere.isActive = req.query.status === "active";
    }

    const rows = await User.findAll({
      where: dbWhere,
      attributes: { exclude: ["password", "otp", "otpExpiry", "notes"] },
      include: [{ model: User, as: "createdByDetails", attributes: ["id", "name", "email", "role"] }],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      employees: rows.map((r) => toAdminDTO(r.toJSON())),
      total: rows.length,
      permissionKeys: PERMISSION_KEYS,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/employees/:id
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid employee ID." });

    const employee = await User.findOne({
      where: { id, role: { [Op.in]: EMPLOYEE_ROLES } },
      attributes: { exclude: ["password", "otp", "otpExpiry", "notes"] },
      include: [{ model: User, as: "createdByDetails", attributes: ["id", "name", "email", "role"] }],
    });
    if (!employee) return res.status(404).json({ message: "Employee not found." });

    return res.status(200).json({ employee: toAdminDTO(employee.toJSON()) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/employees
export const createEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      phone = "",
      password,
      role,
      gender = "",
      address = {},
      permissions = [],
      mustChangePassword = true,
    } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }
    if (!validator.isEmail(String(email))) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (!EMPLOYEE_ROLES.includes(role)) {
      return res.status(400).json({ message: "Select either Telecaller or Sales." });
    }
    if (gender !== undefined && gender !== "" && !GENDERS.includes(gender)) {
      return res.status(400).json({ message: "Select a valid gender." });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_HINT });
    }

    const exists = await User.findOne({ where: { email: String(email).toLowerCase().trim() } });
    if (exists) return res.status(409).json({ message: "Email already in use." });

    const employee = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      phone: String(phone).trim(),
      password: await bcrypt.hash(String(password), BCRYPT_ROUNDS),
      role,
      gender: GENDERS.includes(gender) ? gender : "",
      address: cleanAddress(address),
      permissions: cleanPermissions(permissions),
      isActive: true,
      isVerified: true,
      mustChangePassword: Boolean(mustChangePassword),
      passwordChangedAt: new Date(),
      createdBy: req.adminUser.id,
    });

    sendAdminInviteMail(employee.email, {
      name: employee.name,
      email: employee.email,
      password: String(password),
    }).catch((e) => console.warn(e.message));

    return res.status(201).json({ employee: toAdminDTO(employee), message: "Employee created." });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Email already in use." });
    }
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/employees/:id
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid employee ID." });

    const target = await User.findOne({ where: { id, role: { [Op.in]: EMPLOYEE_ROLES } } });
    if (!target) return res.status(404).json({ message: "Employee not found." });
    if (!canActOn(req.adminUser, target)) {
      return res.status(403).json({ message: "You do not have permission to edit this employee." });
    }

    const { name, phone, role, gender, address, permissions, isActive } = req.body || {};

    if (role !== undefined && role !== target.role) {
      if (!EMPLOYEE_ROLES.includes(role)) {
        return res.status(400).json({ message: "Select either Telecaller or Sales." });
      }
      target.role = role;
    }

    if (isActive !== undefined && Boolean(isActive) !== target.isActive) {
      target.isActive = Boolean(isActive);
      if (!target.isActive) target.tokensValidFrom = new Date();
    }

    if (typeof name === "string" && name.trim()) target.name = name.trim();
    if (typeof phone === "string") target.phone = phone.trim();
    if (gender !== undefined) {
      if (gender !== "" && !GENDERS.includes(gender)) {
        return res.status(400).json({ message: "Select a valid gender." });
      }
      target.gender = gender;
    }
    if (address && typeof address === "object") target.address = cleanAddress(address, target.address);
    if (permissions !== undefined) target.permissions = cleanPermissions(permissions);

    await target.save();

    return res.status(200).json({ employee: toAdminDTO(target), message: "Employee updated." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PATCH /api/admin/employees/:id/status
export const setEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};

    if (!isValidId(id)) return res.status(400).json({ message: "Invalid employee ID." });
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be true or false." });
    }

    const target = await User.findOne({ where: { id, role: { [Op.in]: EMPLOYEE_ROLES } } });
    if (!target) return res.status(404).json({ message: "Employee not found." });
    if (!canActOn(req.adminUser, target)) {
      return res.status(403).json({ message: "You do not have permission to change this employee." });
    }

    target.isActive = isActive;
    if (!isActive) target.tokensValidFrom = new Date(); // sign them out everywhere
    await target.save();

    return res.status(200).json({
      employee: toAdminDTO(target),
      message: isActive ? "Employee activated." : "Employee deactivated.",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/employees/:id/reset-password
export const resetEmployeePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, mustChangePassword = true } = req.body || {};

    if (!isValidId(id)) return res.status(400).json({ message: "Invalid employee ID." });
    if (!password) return res.status(400).json({ message: "A new password is required." });
    if (!isStrongPassword(password)) return res.status(400).json({ message: PASSWORD_HINT });

    const target = await User.findOne({ where: { id, role: { [Op.in]: EMPLOYEE_ROLES } } });
    if (!target) return res.status(404).json({ message: "Employee not found." });
    if (!canActOn(req.adminUser, target)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to reset this password." });
    }

    target.password = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
    target.passwordChangedAt = new Date();
    target.mustChangePassword = Boolean(mustChangePassword);
    target.tokensValidFrom = new Date();
    await target.save();

    return res.status(200).json({ message: `Password reset for ${target.name}.` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/employees/:id
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid employee ID." });

    const target = await User.findOne({ where: { id, role: { [Op.in]: EMPLOYEE_ROLES } } });
    if (!target) return res.status(404).json({ message: "Employee not found." });
    if (!canActOn(req.adminUser, target)) {
      return res.status(403).json({ message: "You do not have permission to delete this employee." });
    }

    await target.destroy();
    return res.status(200).json({ message: `${target.name} was removed.` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
