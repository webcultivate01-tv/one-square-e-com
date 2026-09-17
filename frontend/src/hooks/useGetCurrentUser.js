import { useEffect } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { serverUrl } from "../App.jsx";
import { UNAUTHORIZED_EVENT } from "../utils/session.js";
import { clearUser, setAuthChecked, setUserData } from "../redux/userSlice.js";

/**
 * Auth probe on boot. Runs once; every guard waits on `authChecked`
 * so there is no redirect flash while it resolves.
 */
const useGetCurrentUser = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;

    const probe = async () => {
      try {
        const { data } = await axios.get(serverUrl + "/api/user/getprofile", {
          withCredentials: true,
        });
        if (!cancelled) dispatch(setUserData(data.user));
      } catch {
        if (!cancelled) dispatch(clearUser());
      } finally {
        if (!cancelled) dispatch(setAuthChecked(true));
      }
    };

    probe();

    // Any later 401 means the session died (force-logout, deactivation, expiry).
    const onUnauthorized = () => dispatch(clearUser());
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

    return () => {
      cancelled = true;
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, [dispatch]);
};

export default useGetCurrentUser;
