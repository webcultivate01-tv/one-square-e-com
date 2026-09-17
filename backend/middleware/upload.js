import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "public");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || "file")
      .replace(/[^\w.\-]+/g, "_")
      .slice(-80);
    cb(null, `${Date.now()}-${safe}`);
  },
});

const ALLOWED = /^image\/(jpe?g|png|webp|gif|avif|svg\+xml)$/i;

const fileFilter = (_req, file, cb) => {
  if (ALLOWED.test(file.mimetype)) return cb(null, true);
  return cb(new Error("Only image files are allowed."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
});

export default upload;
