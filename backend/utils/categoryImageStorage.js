import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Layout (project root, sibling of backend/ and frontend/):
 *   uploads/
 *     tmp/                        <- multer lands the file here first (no categoryId yet)
 *     category/<categoryId>/<file>
 */
export const UPLOADS_ROOT = path.join(__dirname, "..", "..", "uploads");
export const CATEGORY_UPLOADS_ROOT = path.join(UPLOADS_ROOT, "category");
export const TMP_ROOT = path.join(UPLOADS_ROOT, "tmp");

const UPLOADS_URL_PREFIX = "/uploads/category/";

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

ensureDir(TMP_ROOT);

const baseUrl = () => process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

const categoryDir = (categoryId) => path.join(CATEGORY_UPLOADS_ROOT, String(categoryId));

/** Move a newly-uploaded temp file into uploads/category/<categoryId>/, returning its public URL. */
export const commitCategoryImage = (file, categoryId) => {
  if (!file) return null;
  const dir = categoryDir(categoryId);
  ensureDir(dir);

  const name = path.basename(file.filename);
  const dest = path.join(dir, name);
  fs.renameSync(file.path, dest);
  return `${baseUrl()}${UPLOADS_URL_PREFIX}${categoryId}/${name}`;
};

/** Remove every other file in this category's image folder so old images don't pile up. */
export const pruneOldCategoryImages = (categoryId, keepFilename) => {
  const dir = categoryDir(categoryId);
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name === keepFilename) continue;
    fs.unlink(path.join(dir, name), (err) => {
      if (err && err.code !== "ENOENT") console.warn("[categoryImage] failed to prune:", err.message);
    });
  }
};

/** Delete a local category image file by its public URL. External/foreign URLs are ignored. */
export const deleteCategoryImageUrl = (url) => {
  const idx = String(url || "").indexOf(UPLOADS_URL_PREFIX);
  if (idx === -1) return;

  const relative = url.slice(idx + UPLOADS_URL_PREFIX.length);
  const filePath = path.join(CATEGORY_UPLOADS_ROOT, relative);
  if (!filePath.startsWith(CATEGORY_UPLOADS_ROOT)) return; // guard against path traversal

  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") console.warn("[categoryImage] failed to delete:", err.message);
  });
};

/** Remove a category's entire image folder (hard delete). */
export const deleteCategoryImageFolder = (categoryId) => {
  const dir = categoryDir(categoryId);
  fs.rm(dir, { recursive: true, force: true }, (err) => {
    if (err) console.warn("[categoryImage] failed to remove folder:", err.message);
  });
};
