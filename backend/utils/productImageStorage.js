import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Layout (project root, sibling of backend/ and frontend/):
 *   uploads/
 *     tmp/                              <- multer lands files here first (no productId yet)
 *     products/<categorySlug>/<productId>/<file>
 */
export const UPLOADS_ROOT = path.join(__dirname, "..", "..", "uploads");
export const PRODUCTS_ROOT = path.join(UPLOADS_ROOT, "products");
export const TMP_ROOT = path.join(UPLOADS_ROOT, "tmp");

const UPLOADS_URL_PREFIX = "/uploads/products/";

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

ensureDir(TMP_ROOT);

const baseUrl = () => process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

const productDir = (categorySlug, productId) => path.join(PRODUCTS_ROOT, categorySlug, productId);

/** Move newly-uploaded temp files into uploads/products/<category>/<productId>/, returning their public URLs. */
export const commitProductImages = (files = [], categorySlug, productId) => {
  if (!files.length) return [];
  const dir = productDir(categorySlug, productId);
  ensureDir(dir);

  const urls = [];
  for (const file of files) {
    const name = path.basename(file.filename);
    const dest = path.join(dir, name);
    try {
      fs.renameSync(file.path, dest);
      urls.push(`${baseUrl()}${UPLOADS_URL_PREFIX}${categorySlug}/${productId}/${name}`);
    } catch (error) {
      console.warn("[productImages] failed to store upload:", error.message);
    }
  }
  return urls;
};

/** Delete local product image files by their public URL. External/Cloud URLs are ignored. */
export const deleteProductImageUrls = (urls = []) => {
  for (const url of urls) {
    const idx = String(url || "").indexOf(UPLOADS_URL_PREFIX);
    if (idx === -1) continue;

    const relative = url.slice(idx + UPLOADS_URL_PREFIX.length);
    const filePath = path.join(PRODUCTS_ROOT, relative);
    if (!filePath.startsWith(PRODUCTS_ROOT)) continue; // guard against path traversal

    fs.unlink(filePath, (err) => {
      if (err && err.code !== "ENOENT") console.warn("[productImages] failed to delete:", err.message);
    });
  }
};

/** Move a product's whole image folder when its category changes. Returns true if a folder was moved. */
export const moveProductImageFolder = (oldCategorySlug, newCategorySlug, productId) => {
  if (oldCategorySlug === newCategorySlug) return false;
  const oldDir = productDir(oldCategorySlug, productId);
  const newDir = productDir(newCategorySlug, productId);
  if (!fs.existsSync(oldDir)) return false;

  ensureDir(path.dirname(newDir));
  fs.renameSync(oldDir, newDir);
  return true;
};

/** Rewrite stored image URLs after a folder move so they point at the new category path. */
export const remapProductImageUrls = (images = [], productId, oldCategorySlug, newCategorySlug) => {
  const oldPrefix = `${UPLOADS_URL_PREFIX}${oldCategorySlug}/${productId}/`;
  const newPrefix = `${UPLOADS_URL_PREFIX}${newCategorySlug}/${productId}/`;
  return images.map((url) => (String(url).includes(oldPrefix) ? url.replace(oldPrefix, newPrefix) : url));
};

/** Remove a product's entire image folder (hard delete). */
export const deleteProductImageFolder = (categorySlug, productId) => {
  const dir = productDir(categorySlug, productId);
  fs.rm(dir, { recursive: true, force: true }, (err) => {
    if (err) console.warn("[productImages] failed to remove folder:", err.message);
  });
};
