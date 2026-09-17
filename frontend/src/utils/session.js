import axios from "axios";

/** A 401 from any call means the session is gone — tell the app once. */
export const UNAUTHORIZED_EVENT = "goboxly:unauthorized";

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    // The boot probe and the login form handle their own 401s.
    const isProbe = url.includes("/user/getprofile");
    const isLogin = url.includes("/auth/login");
    if (status === 401 && !isProbe && !isLogin) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  }
);
