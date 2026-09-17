/** Dependency-free IP + User-Agent parsing. */

const cleanIp = (ip = "") => String(ip).replace(/^::ffff:/, "").trim();

export const getIp = (req) => {
  const fwd = req.headers?.["x-forwarded-for"];
  if (fwd) return cleanIp(String(fwd).split(",")[0]);
  return cleanIp(req.ip || req.socket?.remoteAddress || "");
};

const detectBrowser = (ua) => {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  if (/postman/i.test(ua)) return "Postman";
  if (/curl/i.test(ua)) return "curl";
  return "Unknown browser";
};

const detectOs = (ua) => {
  if (/windows nt 10|windows nt 11/i.test(ua)) return "Windows 10/11";
  if (/windows/i.test(ua)) return "Windows";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Unknown OS";
};

const detectDeviceKind = (ua) => {
  if (/ipad|tablet/i.test(ua)) return "Tablet";
  if (/mobile|iphone|android/i.test(ua)) return "Mobile";
  return "Desktop";
};

export const getRequestContext = (req) => {
  const userAgent = String(req.headers?.["user-agent"] || "").slice(0, 500);
  const browser = detectBrowser(userAgent);
  const os = detectOs(userAgent);
  return {
    ip: getIp(req),
    userAgent,
    browser,
    os,
    deviceKind: detectDeviceKind(userAgent),
    device: `${browser} on ${os}`,
  };
};

export default getRequestContext;
