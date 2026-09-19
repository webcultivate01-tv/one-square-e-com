import crypto from "crypto";
import bcrypt from "bcryptjs";
import validator from "validator";
import User, { STAFF_ROLES } from "../model/userModel.js";
import { generateToken, cookieOptions } from "../config/token.js";
import { toPublicUser } from "../utils/dto.js";
import { getRequestContext } from "../utils/requestContext.js";
import { logActivity } from "../utils/activity.js";
import { sendPasswordResetMail, sendWelcomeMail } from "../config/nodemailer.js";
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

// ---- Forgot-password flow (admin / sales / telecaller only) ----------------------------------
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

/** Wrong-code counter per email. Single-process, like the rate limiter; entries only exist for real staff. */
const otpAttempts = new Map();

const findStaffByEmail = (email) =>
  User.findOne({ where: { email: String(email).toLowerCase().trim() } });

// POST /api/auth/sendotp — emails a 6-digit reset code to an existing, active staff account.
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "Email is required." });
    if (!validator.isEmail(String(email))) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const user = await findStaffByEmail(email);
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return res.status(404).json({ message: "No admin account found with this email." });
    }
    if (!user.isActive) {
      return res
        .status(403)
        .json({ message: "This account has been deactivated. Contact an Admin." });
    }

    // Resend cooldown: the current code was issued at (otpExpiry - TTL).
    if (user.otp && user.otpExpiry) {
      const issuedAt = new Date(user.otpExpiry).getTime() - OTP_TTL_MS;
      const wait = Math.ceil((issuedAt + OTP_RESEND_MS - Date.now()) / 1000);
      if (wait > 0) {
        return res.status(429).json({ message: `A code was just sent. Try again in ${wait}s.` });
      }
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    user.otp = await bcrypt.hash(otp, BCRYPT_ROUNDS);
    user.otpExpiry = new Date(Date.now() + OTP_TTL_MS);
    await user.save();
    otpAttempts.delete(user.email);

    const mail = await sendPasswordResetMail(user.email, user.name, otp);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[auth] reset code for ${user.email}: ${otp}`);
    }
    if (!mail.sent && process.env.NODE_ENV === "production") {
      user.otp = null;
      user.otpExpiry = null;
      await user.save();
      return res
        .status(503)
        .json({ message: "Could not send the email right now. Please try again shortly." });
    }

    return res.status(200).json({ message: "A verification code has been sent to your email." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/** Returns the user when the code is valid; counts failures and burns the code after too many. */
const verifyOtpFor = async (email, otp) => {
  const user = await findStaffByEmail(email);
  if (!user || !STAFF_ROLES.includes(user.role) || !user.isActive) return null;
  if (!user.otp || !user.otpExpiry) return null;
  if (new Date(user.otpExpiry).getTime() < Date.now()) return null;

  const ok = await bcrypt.compare(String(otp).trim(), user.otp);
  if (ok) return user;

  const failed = (otpAttempts.get(user.email) || 0) + 1;
  if (failed >= OTP_MAX_ATTEMPTS) {
    otpAttempts.delete(user.email);
    user.otp = null;
    user.otpExpiry = null;
    await user.save();
  } else {
    otpAttempts.set(user.email, failed);
  }
  return null;
};

const INVALID_CODE = "Invalid or expired code. Request a new one if it keeps failing.";

// POST /api/auth/verifyotp
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) return res.status(400).json({ message: "Email and code are required." });

    const user = await verifyOtpFor(email, otp);
    if (!user) return res.status(400).json({ message: INVALID_CODE });

    return res.status(200).json({ message: "Code verified." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/resetpassword
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, password, confirmPassword } = req.body || {};
    if (!email || !otp || !password) {
      return res.status(400).json({ message: "Email, code and new password are required." });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: "The two passwords do not match." });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_HINT });
    }

    const user = await verifyOtpFor(email, otp);
    if (!user) return res.status(400).json({ message: INVALID_CODE });

    user.password = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
    user.otp = null;
    user.otpExpiry = null;
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    user.tokensValidFrom = new Date(); // sign out everywhere
    await user.save();
    otpAttempts.delete(user.email);

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
