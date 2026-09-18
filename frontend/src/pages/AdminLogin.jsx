import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiAlertCircle, FiArrowRight, FiLock, FiMail } from "react-icons/fi";
import axios from "axios";
import { serverUrl } from "../App.jsx";
import { isStaffRole, setUserData } from "../redux/userSlice.js";
import { LOGO_URL } from "../utils/site.js";
import PasswordField from "../components/PasswordField.jsx";
import { FullPageLoader, Spinner } from "../components/ui.jsx";

/**
 * The role check happens BEFORE any navigation, so a customer account
 * never lands inside the console shell.
 */
const AdminLogin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, authChecked } = useSelector((state) => state.user);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!authChecked) return <FullPageLoader label="Checking your session..." />;

  // Already signed in as staff — skip the form.
  if (userData && isStaffRole(userData.role)) {
    return <Navigate to={location.state?.from || "/admin"} replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setBusy(true);
    try {
      const { data } = await axios.post(
        serverUrl + "/api/auth/login",
        { email: email.trim(), password },
        { withCredentials: true }
      );
      const user = data.user;

      // Role check BEFORE navigating.
      if (!isStaffRole(user?.role)) {
        await axios.post(serverUrl + "/api/auth/logout", {}, { withCredentials: true }).catch(() => {});
        setError("This account does not have admin access.");
        setBusy(false);
        return;
      }

      dispatch(setUserData(user));
      toast.success(`Welcome back, ${user.name.split(" ")[0]}.`);

      if (user.mustChangePassword) {
        navigate("/admin/change-password", { replace: true });
        return;
      }
      navigate(location.state?.from || "/admin", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Sign-in failed.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-[380px] rounded-2xl border border-slate-200 bg-white shadow-sm p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-7">
          <img src={LOGO_URL} alt="One Square Associates" className="h-14 w-auto object-contain" />
          <p className="text-[12px] font-medium text-slate-500 uppercase tracking-[0.14em] mt-4">
            Admin Login
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
            <FiAlertCircle className="text-red-500 mt-0.5 shrink-0" size={15} />
            <p className="text-[12.5px] text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="admin-email">
              Email address
            </label>
            <div className="relative">
              <FiMail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={15}
              />
              <input
                id="admin-email"
                type="email"
                className="input pl-9"
                placeholder="you@onesquare.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                disabled={busy}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="admin-password">
              Password
            </label>
            <PasswordField
              id="admin-password"
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={busy}
            />
          </div>

          <button type="submit" className="btn-primary w-full !py-2.5" disabled={busy}>
            {busy ? <Spinner size={15} /> : <FiLock size={15} />}
            {busy ? "Signing in..." : "Sign in"}
            {!busy && <FiArrowRight size={15} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
