import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Layout (project root, sibling of backend/ and frontend/):
 *   uploads/
 *     admin/<adminId>/<file>   <- profile photo for that staff account
 */
export const UPLOADS_ROOT = path.join(__dirname, "..", "..", "uploads");
export const ADMIN_UPLOADS_ROOT = path.join(UPLOADS_ROOT, "admin");

const UPLOADS_URL_PREFIX = "/uploads/admin/";

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

ensureDir(ADMIN_UPLOADS_ROOT);

const baseUrl = () => process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

/** Public URL for a just-uploaded admin avatar file. */
export const adminAvatarUrl = (adminId, filename) =>
  `${baseUrl()}${UPLOADS_URL_PREFIX}${adminId}/${filename}`;

/** Remove every other file in this admin's avatar folder so old photos don't pile up. */
export const pruneOldAvatars = (adminId, keepFilename) => {
  const dir = path.join(ADMIN_UPLOADS_ROOT, String(adminId));
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name === keepFilename) continue;
    fs.unlink(path.join(dir, name), (err) => {
      if (err && err.code !== "ENOENT") console.warn("[adminAvatar] failed to prune:", err.message);
    });
  }
};

/** Delete a local admin avatar file by its public URL. External/foreign URLs are ignored. */
export const deleteAdminAvatarUrl = (url) => {
  const idx = String(url || "").indexOf(UPLOADS_URL_PREFIX);
  if (idx === -1) return;

  const relative = url.slice(idx + UPLOADS_URL_PREFIX.length);
  const filePath = path.join(ADMIN_UPLOADS_ROOT, relative);
  if (!filePath.startsWith(ADMIN_UPLOADS_ROOT)) return; // guard against path traversal

  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") console.warn("[adminAvatar] failed to delete:", err.message);
  });
};
