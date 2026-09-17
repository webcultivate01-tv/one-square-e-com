import multer from "multer";

/** 404 for anything that reached the end of the router stack. */
export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

/**
 * Centralised Express error handler (blueprint section 23).
 * Controllers still guard their own happy path, but anything thrown by
 * middleware (multer, CORS, JSON parse errors) lands here with a clean shape.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  if (res.headersSent) return;

  if (err instanceof multer.MulterError) {
    const map = {
      LIMIT_FILE_SIZE: "File is too large.",
      LIMIT_FILE_COUNT: "Too many files uploaded.",
      LIMIT_UNEXPECTED_FILE: "Unexpected file field.",
    };
    return res.status(400).json({ message: map[err.code] || err.message });
  }

  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Malformed JSON body." });
  }

  if (err?.name === "ValidationError") {
    const first = Object.values(err.errors || {})[0];
    return res.status(400).json({ message: first?.message || "Validation failed." });
  }

  if (err?.name === "CastError") {
    return res.status(400).json({ message: `Invalid value for "${err.path}".` });
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || "value";
    return res.status(409).json({ message: `Duplicate ${field}. It is already in use.` });
  }

  if (String(err?.message || "").startsWith("CORS blocked")) {
    return res.status(403).json({ message: err.message });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error("[error]", err);

  return res.status(status).json({ message: err.message || "Internal server error." });
};
