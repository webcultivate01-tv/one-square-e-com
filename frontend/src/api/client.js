import axios from "axios";

export const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

/** Every call carries the httpOnly session cookie. */
const api = axios.create({
  baseURL: `${serverUrl}/api`,
  withCredentials: true,
  timeout: 30000,
});

/** Normalised message for any axios failure. */
export const errMsg = (error, fallback = "Something went wrong.") => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === "ECONNABORTED") return "The request timed out.";
  if (error?.message === "Network Error") {
    return `Cannot reach the API at ${serverUrl}. Is the backend running?`;
  }
  return error?.message || fallback;
};

/** A 401 from any call means the session is gone — tell the app once. */
export const UNAUTHORIZED_EVENT = "goboxly:unauthorized";

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    // The boot probe handles its own 401 — don't broadcast during startup.
    const isProbe = url.includes("/user/getprofile");
    const isLogin = url.includes("/auth/login");
    if (status === 401 && !isProbe && !isLogin) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  }
);

export default api;
