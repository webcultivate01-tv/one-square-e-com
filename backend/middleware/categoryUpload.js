import crypto from "crypto";
import path from "path";
import multer from "multer";
import { TMP_ROOT } from "../utils/categoryImageStorage.js";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TMP_ROOT),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safeExt = /^\.[a-zA-Z0-9]{1,10}$/.test(ext) ? ext : "";
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

const ALLOWED = /^image\/(jpe?g|png|webp|gif|avif)$/i;

const fileFilter = (_req, file, cb) => {
  if (ALLOWED.test(file.mimetype)) return cb(null, true);
  return cb(new Error("Only image files (JPG, PNG, WEBP, GIF, AVIF) are allowed."));
};

const categoryUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

export default categoryUpload;
