import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiAlertCircle, FiShield } from "react-icons/fi";
import api, { errMsg } from "../api/client.js";
import { clearUser, setUserData } from "../redux/userSlice.js";
import PasswordField, { RulesChecklist, StrengthMeter, isStrongPassword } from "../components/PasswordField.jsx";
import { Spinner } from "../components/ui.jsx";

/**
 * Forced change-password screen. AdminRoute redirects here whenever
 * `mustChangePassword` is set, so no other console route can render first.
 */
const ChangePassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const forced = Boolean(userData?.mustChangePassword);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!currentPassword || !newPassword) {
      setError("Fill in both your current and new password.");
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setError("The new password does not meet every requirement below.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The two new passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("The new password must be different from the current one.");
      return;
    }

    setBusy(true);
    try {
      await api.post("/admin/me/change-password", { currentPassword, newPassword });
      dispatch(setUserData({ ...userData, mustChangePassword: false }));
      toast.success("Password updated.");
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(errMsg(err, "Could not update the password."));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await api.post("/auth/logout").catch(() => {});
    dispatch(clearUser());
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-7">
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          <FiShield size={19} />
        </div>

        <h1 className="text-xl font-semibold text-slate-900 tracking-tight mt-4">
          {forced ? "Choose a new password" : "Change your password"}
        </h1>
        <p className="text-[13px] text-slate-500 mt-1">
          {forced
            ? "Your account was created or reset by an administrator. Set your own password to continue."
            : "Pick something you do not use anywhere else."}
        </p>

        {error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
            <FiAlertCircle className="text-red-500 mt-0.5 shrink-0" size={15} />
            <p className="text-[12.5px] text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="cur-pass">
              Current password
            </label>
            <PasswordField
              id="cur-pass"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Your current password"
              autoComplete="current-password"
              disabled={busy}
            />
          </div>

          <div>
            <label className="label" htmlFor="new-pass">
              New password
            </label>
            <PasswordField
              id="new-pass"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Choose a strong password"
              disabled={busy}
            />
            <StrengthMeter value={newPassword} />
            <RulesChecklist value={newPassword} />
          </div>

          <div>
            <label className="label" htmlFor="confirm-pass">
              Confirm new password
            </label>
            <PasswordField
              id="confirm-pass"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Type it again"
              disabled={busy}
              error={Boolean(confirmPassword) && confirmPassword !== newPassword}
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy && <Spinner size={15} />}
            {busy ? "Saving..." : "Update password"}
          </button>
        </form>

        <button
          type="button"
          onClick={signOut}
          className="w-full text-center text-[12px] text-slate-500 hover:text-slate-700 mt-4 transition-colors"
        >
          Sign out instead
        </button>
      </div>
    </div>
  );
};

export default ChangePassword;
