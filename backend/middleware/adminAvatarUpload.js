import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { ADMIN_UPLOADS_ROOT } from "../utils/adminAvatarStorage.js";

/** Runs after isAuth, so req.userId is already the signed-in admin's id. */
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(ADMIN_UPLOADS_ROOT, String(req.userId));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safeExt = /^\.[a-zA-Z0-9]{1,10}$/.test(ext) ? ext : "";
    cb(null, `avatar-${crypto.randomUUID()}${safeExt}`);
  },
});

// SVG is deliberately excluded here — an avatar is rendered raw across the console
// and an uploaded SVG can carry a script payload.
const ALLOWED = /^image\/(jpe?g|png|webp|gif|avif)$/i;

const fileFilter = (_req, file, cb) => {
  if (ALLOWED.test(file.mimetype)) return cb(null, true);
  return cb(new Error("Only image files (JPG, PNG, WEBP, GIF, AVIF) are allowed."));
};

const adminAvatarUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
});

export default adminAvatarUpload;
