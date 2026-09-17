import jwt from "jsonwebtoken";

export const TOKEN_TTL_DAYS = 7;

/** Sign a 7-day session token. Payload key is `id` (isAuth reads decoded.id). */
export const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return jwt.sign({ id: String(userId) }, secret, { expiresIn: `${TOKEN_TTL_DAYS}d` });
};

/** Cookie options shared by login and logout so the cookie actually clears. */
export const cookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  };
};
