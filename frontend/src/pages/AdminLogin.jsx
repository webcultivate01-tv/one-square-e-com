import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiAlertCircle, FiArrowRight, FiLock, FiMail } from "react-icons/fi";
import { MdLocalShipping } from "react-icons/md";
import axios from "axios";
import { serverUrl } from "../App.jsx";
import { isStaffRole, setUserData } from "../redux/userSlice.js";
import PasswordField from "../components/PasswordField.jsx";
import { FullPageLoader, Spinner } from "../components/ui.jsx";

/**
 * The console sign-in screen.
 *
 * It wears the SLATE/BLUE console palette, not the storefront orange, so the
 * two surfaces read as different products. The role check happens BEFORE any
 * navigation, so a customer account never lands inside the console shell.
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
      <div className="w-full max-w-[860px] grid lg:grid-cols-2 rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between bg-slate-900 p-9 text-white">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <MdLocalShipping size={21} />
              </div>
              <div>
                <p className="text-[15px] font-black tracking-wider">GOBOXLY</p>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.14em]">
                  Admin Console
                </p>
              </div>
            </div>

            <h1 className="text-[26px] font-semibold tracking-tight mt-12 leading-snug">
              Run the whole operation
              <br />
              from one console.
            </h1>
            <p className="text-[13px] text-slate-400 mt-3 leading-relaxed">
              Catalog, orders, payments, customers and promotions — with role-based access
              and a full audit trail.
            </p>
          </div>

          <ul className="space-y-2.5 text-[12px] text-slate-400">
            {[
              "Admin, Telecaller and Sales roles with server-enforced permissions",
              "Sign-out-everywhere on any account change",
              "CSV, Excel and PDF exports for every dataset",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <MdLocalShipping size={18} />
            </div>
            <div>
              <p className="text-[14px] font-black tracking-wider text-slate-900">GOBOXLY</p>
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.14em]">
                Admin Console
              </p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Sign in</h2>
          <p className="text-[13px] text-slate-500 mt-1">
            Use your administrator credentials to continue.
          </p>

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
              <FiAlertCircle className="text-red-500 mt-0.5 shrink-0" size={15} />
              <p className="text-[12.5px] text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
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
                  placeholder="admin@goboxly.com"
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
              {busy ? "Signing in..." : "Sign in to console"}
              {!busy && <FiArrowRight size={15} />}
            </button>
          </form>

          <p className="text-[11.5px] text-slate-400 mt-6 leading-relaxed">
            Access is restricted to authorised staff. Every sign-in is recorded with its IP
            address and device. Lost your password? Ask an Admin to reset it from Employee
            Management.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
