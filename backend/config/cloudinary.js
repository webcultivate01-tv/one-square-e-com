import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * One function, two behaviours (blueprint §3.4) — so the project runs with
 * zero third-party config in development.
 */
export const handleImageUpload = async (file) => {
  if (!file) return null;

  if (!isCloudinaryConfigured()) {
    const base = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    return `${base}/public/${file.filename}`;
  }

  try {
    const result = await cloudinary.uploader.upload(file.path, { folder: "goboxly" });
    try {
      fs.unlinkSync(file.path);
    } catch {
      /* temp file already gone — not fatal */
    }
    return result.secure_url;
  } catch (error) {
    console.warn("[cloudinary] upload failed, falling back to local:", error.message);
    const base = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    return `${base}/public/${file.filename}`;
  }
};

/** Sequential uploads so Cloudinary rate limits don't bite. */
export const uploadAll = async (files = []) => {
  const urls = [];
  for (const file of files) {
    const url = await handleImageUpload(file);
    if (url) urls.push(url);
  }
  return urls;
};

export default cloudinary;
