/**
 * Dependency-free sliding-window limiter, keyed by req.userId (falls back to IP).
 * Single-process only — swap for Redis before running more than one Node process.
 */
const buckets = new Map();

const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}, 60_000);
sweep.unref?.();

export const makeLimiter = ({ windowMs = 60_000, max = 120, keyPrefix = "rl" } = {}) => {
  return (req, res, next) => {
    // Disabled in test runs so the smoke test is not throttled.
    if (process.env.DISABLE_RATE_LIMIT === "true") return next();

    const who = req.userId || req.ip || "anon";
    const key = `${keyPrefix}:${who}`;
    const now = Date.now();

    let entry = buckets.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }

    entry.count += 1;

    const remaining = Math.max(0, max - entry.count);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res
        .status(429)
        .json({ message: `Too many requests. Try again in ${retryAfter}s.` });
    }

    return next();
  };
};

export const readLimit = makeLimiter({ windowMs: 60_000, max: 240, keyPrefix: "read" });
export const writeLimit = makeLimiter({ windowMs: 60_000, max: 60, keyPrefix: "write" });
export const mailLimit = makeLimiter({ windowMs: 60_000, max: 10, keyPrefix: "mail" });
export const authLimit = makeLimiter({ windowMs: 60_000, max: 20, keyPrefix: "auth" });

export default makeLimiter;
