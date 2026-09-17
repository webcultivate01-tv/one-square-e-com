/**
 * Route-level enforcement of the granular `permissions` array.
 * Blueprint section 23: in the old build this array was informational only —
 * here it is enforced on the server, not just mirrored in the UI.
 *
 * The Admin role implicitly holds every permission.
 * Telecaller and Sales must carry the key explicitly.
 */
const hasPermission = (key) => (req, res, next) => {
  const admin = req.adminUser;
  if (!admin) return res.status(403).json({ message: "Access denied. Admins only." });

  if (admin.role === "admin") return next();

  const granted = Array.isArray(admin.permissions) ? admin.permissions : [];
  if (granted.includes(key)) return next();

  return res
    .status(403)
    .json({ message: `Access denied. The "${key}" permission is required.` });
};

/** Helper used by controllers that need the same check inline. */
export const permits = (admin, key) => {
  if (!admin) return false;
  if (admin.role === "admin") return true;
  return Array.isArray(admin.permissions) && admin.permissions.includes(key);
};

export default hasPermission;
