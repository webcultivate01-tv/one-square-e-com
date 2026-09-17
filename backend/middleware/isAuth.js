import jwt from "jsonwebtoken";
import User from "../model/userModel.js";

/**
 * Verify the httpOnly session cookie.
 *
 * More than a plain jwt.verify: bumping `user.tokensValidFrom` invalidates every
 * JWT issued before that moment, which gives us a working "sign out everywhere"
 * with no session store and no token blacklist (blueprint section 3.3).
 */
const isAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Unauthorized. No token." });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }

    const user = await User.findByPk(decoded.id, { attributes: ["id", "tokensValidFrom", "isActive"] });
    if (!user) return res.status(401).json({ message: "Account no longer exists." });

    if (
      user.tokensValidFrom &&
      decoded.iat * 1000 < new Date(user.tokensValidFrom).getTime()
    ) {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }

    req.userId = decoded.id;
    return next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/** Attaches req.userId when a valid cookie exists, otherwise continues as a guest. */
export const optionalAuth = async (req, _res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, { attributes: ["id", "tokensValidFrom"] });
    if (!user) return next();
    if (
      user.tokensValidFrom &&
      decoded.iat * 1000 < new Date(user.tokensValidFrom).getTime()
    ) {
      return next();
    }
    req.userId = decoded.id;
    return next();
  } catch {
    return next();
  }
};

export default isAuth;
