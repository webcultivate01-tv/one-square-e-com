import { validate as validateUuid } from "uuid";
import { Op, fn, col, where as sequelizeWhere } from "sequelize";

/** lowercase, dashes, strip non-alphanumerics */
export const toSlug = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "item";

/** Escape a user string so it is safe inside a SQL LIKE pattern. */
export const escapeLike = (s = "") => String(s).replace(/[%_\\]/g, "\\$&");

/** `%term%` wrapper for a case-insensitive Sequelize Op.like search. */
export const likeTerm = (s = "") => `%${escapeLike(String(s).trim())}%`;

/** LIKE search against a field nested inside a JSON column (MySQL JSON_EXTRACT). */
export const jsonLike = (columnName, path, term) =>
  sequelizeWhere(fn("JSON_UNQUOTE", fn("JSON_EXTRACT", col(columnName), `$.${path}`)), {
    [Op.like]: term,
  });

/** Case-insensitive equality against a field nested inside a JSON column. */
export const jsonEq = (columnName, path, value) =>
  sequelizeWhere(fn("JSON_UNQUOTE", fn("JSON_EXTRACT", col(columnName), `$.${path}`)), {
    [Op.eq]: String(value).trim(),
  });

/** True when a JSON array column contains the given scalar value. */
export const jsonContains = (columnName, value) =>
  sequelizeWhere(fn("JSON_CONTAINS", col(columnName), JSON.stringify(value)), { [Op.eq]: 1 });

export const isValidId = (id) => Boolean(id) && validateUuid(String(id));

/** Parse a JSON string coming through multipart form-data. */
export const safeJson = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
};

/** Multipart booleans arrive as the strings "true"/"false". */
export const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const s = String(value).toLowerCase();
  if (["true", "1", "yes", "on"].includes(s)) return true;
  if (["false", "0", "no", "off"].includes(s)) return false;
  return fallback;
};

export const toNum = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Comma-separated string or array -> clean string array. */
export const toStringArray = (value) => {
  if (value === undefined || value === null || value === "") return [];
  const raw = Array.isArray(value) ? value : safeJson(value, null) ?? String(value).split(",");
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((v) => String(v).trim()).filter(Boolean))];
};

/** Clamp pagination input. Limits are always enforced server-side. */
export const parsePaging = (query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = Math.max(1, Math.trunc(toNum(query.page, 1)) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Math.trunc(toNum(query.limit, defaultLimit)) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

/** "all" and "" mean "no filter". */
export const isFilterActive = (value) =>
  value !== undefined && value !== null && value !== "" && value !== "all";

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Percentage delta between a current and previous window. */
export const pct = (a, b) => {
  const cur = Number(a) || 0;
  const prev = Number(b) || 0;
  if (prev > 0) return round2(((cur - prev) / prev) * 100);
  return cur > 0 ? 100 : 0;
};

/** YYYY-MM-DD in local time (used as the key for day series). */
export const dayKey = (date) => {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

export const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/** Every date key for the last `n` days, oldest first — so charts never have holes. */
export const buildDaySeries = (n = 14, endDate = new Date()) => {
  const out = [];
  const end = startOfDay(endDate);
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    out.push({ key: dayKey(d), date: new Date(d) });
  }
  return out;
};

/** Build a unique slug by appending -2, -3 ... until free. */
export const buildUniqueSlug = async (Model, name, excludeId = null) => {
  const { Op } = await import("sequelize");
  const base = toSlug(name);
  let candidate = base;
  let n = 1;
  /* eslint-disable no-await-in-loop */
  while (true) {
    const where = { slug: candidate };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    const clash = await Model.findOne({ where, attributes: ["id"] });
    if (!clash) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
    if (n > 500) return `${base}-${Date.now()}`;
  }
};

/** Whitelisted sort translation — never accept a raw sort clause from the client. */
export const resolveSort = (sortMap, key, fallbackKey) =>
  sortMap[key] || sortMap[fallbackKey] || [["createdAt", "DESC"]];
