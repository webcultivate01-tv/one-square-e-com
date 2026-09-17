import bcrypt from "bcryptjs";
import validator from "validator";
import User, { STAFF_ROLES } from "../model/userModel.js";
import { generateToken, cookieOptions } from "../config/token.js";
import { toPublicUser } from "../utils/dto.js";
import { getRequestContext } from "../utils/requestContext.js";
import { logActivity } from "../utils/activity.js";
import { sendOtpMail, sendWelcomeMail } from "../config/nodemailer.js";
import { isStrongPassword, PASSWORD_HINT, BCRYPT_ROUNDS } from "../utils/password.js";

// POST /api/auth/signup
export const signup = async (req, res) => {
  try {
    const { name, email, phone = "", password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }
    if (!validator.isEmail(String(email))) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_HINT });
    }

    const exists = await User.findOne({ where: { email: String(email).toLowerCase() } });
    if (exists) return res.status(409).json({ message: "Email already in use." });

    const hashed = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      phone: String(phone).trim(),
      password: hashed,
      role: "user",
      passwordChangedAt: new Date(),
    });

    const ctx = getRequestContext(req);
    logActivity({
      customer: user.id,
      type: "signup",
      action: "account.created",
      message: "Account created.",
      context: ctx,
    }).catch((e) => console.warn(e.message));
    sendWelcomeMail(user.email, user.name).catch((e) => console.warn(e.message));

    res.cookie("token", generateToken(user.id), cookieOptions());
    return res.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ where: { email: String(email).toLowerCase().trim() } });
    if (!user) return res.status(401).json({ message: "Invalid email or password." });

    const ok = await bcrypt.compare(String(password), user.password);
    if (!ok) return res.status(401).json({ message: "Invalid email or password." });

    const isAdminAccount = STAFF_ROLES.includes(user.role);

    if (isAdminAccount && !user.isActive) {
      return res.status(403).json({
        message: "This admin account has been deactivated. Contact an Admin.",
      });
    }
    if (!isAdminAccount) {
      if (user.isDeleted) {
        return res.status(403).json({ message: "This account is no longer available." });
      }
      if (user.customerStatus === "blocked") {
        return res
          .status(403)
          .json({ message: "Your account has been blocked. Please contact support." });
      }
      if (user.customerStatus === "suspended") {
        return res.status(403).json({
          message: user.statusReason
            ? `Your account is suspended: ${user.statusReason}`
            : "Your account is suspended. Please contact support.",
        });
      }
    }

    const ctx = getRequestContext(req);
    user.lastLogin = new Date();
    user.lastLoginIp = ctx.ip;
    user.lastLoginUserAgent = ctx.userAgent;
    user.lastLoginDevice = ctx.device;
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    logActivity({
      customer: user.id,
      type: "login",
      action: "auth.login",
      message: `Signed in from ${ctx.device}.`,
      context: ctx,
    }).catch((e) => console.warn(e.message));

    res.cookie("token", generateToken(user.id), cookieOptions());
    return res.status(200).json({ user: toPublicUser(user) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  try {
    const opts = cookieOptions();
    delete opts.maxAge;
    res.clearCookie("token", opts);
    return res.status(200).json({ message: "Signed out." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/sendotp  — always reports success so emails cannot be enumerated.
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ where: { email: String(email).toLowerCase().trim() } });
    if (user) {
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      user.otp = await bcrypt.hash(otp, BCRYPT_ROUNDS);
      user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      sendOtpMail(user.email, otp).catch((e) => console.warn(e.message));
      if (process.env.NODE_ENV !== "production") {
        console.log(`[auth] OTP for ${user.email}: ${otp}`);
      }
    }

    return res
      .status(200)
      .json({ message: "If that email exists, a verification code has been sent." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const verifyOtpFor = async (email, otp) => {
  const user = await User.findOne({ where: { email: String(email).toLowerCase().trim() } });
  if (!user || !user.otp || !user.otpExpiry) return null;
  if (new Date(user.otpExpiry).getTime() < Date.now()) return null;
  const ok = await bcrypt.compare(String(otp), user.otp);
  return ok ? user : null;
};

// POST /api/auth/verifyotp
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) return res.status(400).json({ message: "Email and code are required." });

    const user = await verifyOtpFor(email, otp);
    if (!user) return res.status(400).json({ message: "Invalid or expired code." });

    return res.status(200).json({ message: "Code verified." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/resetpassword
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body || {};
    if (!email || !otp || !password) {
      return res.status(400).json({ message: "Email, code and new password are required." });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_HINT });
    }

    const user = await verifyOtpFor(email, otp);
    if (!user) return res.status(400).json({ message: "Invalid or expired code." });

    user.password = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
    user.otp = null;
    user.otpExpiry = null;
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    user.tokensValidFrom = new Date(); // sign out everywhere
    await user.save();

    logActivity({
      customer: user.id,
      type: "password_reset",
      action: "auth.password_reset",
      message: "Password reset via email code.",
      context: getRequestContext(req),
    }).catch((e) => console.warn(e.message));

    return res.status(200).json({ message: "Password updated. Please sign in." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
