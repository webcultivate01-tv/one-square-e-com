import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCheckCircle,
  FiKey,
  FiMail,
  FiShield,
} from "react-icons/fi";
import axios from "axios";
import { serverUrl } from "../App.jsx";
import { LOGO_URL } from "../utils/site.js";
import PasswordField, { RulesChecklist, StrengthMeter, isStrongPassword } from "./PasswordField.jsx";
import { Spinner } from "./ui.jsx";

const RESEND_SECONDS = 60;
const post = (path, body) => axios.post(serverUrl + path, body, { withCredentials: true });

/**
 * Forgot-password flow shared by the admin, sales and telecaller login pages:
 * email -> emailed 6-digit code -> new password + confirm -> back to sign in.
 * `onBack(email?)` returns to the login form.
 */
const ForgotPassword = ({ roleLabel = "Admin", onBack, initialEmail = "" }) => {
  const [step, setStep] = useState("email"); // email | code | reset | done
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async (e) => {
    e?.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    setBusy(true);
    try {
      await post("/api/auth/sendotp", { email: email.trim() });
      toast.success("Verification code sent to your email.");
      setCode("");
      setCooldown(RESEND_SECONDS);
      setStep("code");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send the code.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError("");
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setBusy(true);
    try {
      await post("/api/auth/verifyotp", { email: email.trim(), otp: code });
      setStep("reset");
    } catch (err) {
      setError(err.response?.data?.message || "Could not verify the code.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    setError("");
    setBusy(true);
    try {
      await post("/api/auth/sendotp", { email: email.trim() });
      toast.success("A new code has been sent.");
      setCode("");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err.response?.data?.message || "Could not send the code.");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (!isStrongPassword(password)) {
      setError("The new password does not meet every requirement below.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await post("/api/auth/resetpassword", {
        email: email.trim(),
        otp: code,
        password,
        confirmPassword: confirm,
      });
      toast.success("Password updated.");
      setStep("done");
    } catch (err) {
      const message = err.response?.data?.message || "Could not update the password.";
      setError(message);
      // A burned/expired code cannot be reused — restart from the email step.
      if (err.response?.status === 400 && /code/i.test(message)) {
        setPassword("");
        setConfirm("");
        setStep("email");
      }
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    email: ["Forgot password?", "Enter your account email and we will send you a verification code."],
    code: ["Check your email", `We sent a 6-digit code to ${email.trim()}. It expires in 10 minutes.`],
    reset: ["Set a new password", "Choose a strong password you do not use anywhere else."],
    done: ["Password updated", "Your password has been changed. You can now sign in with it."],
  };
  const [title, subtitle] = titles[step];
  const StepIcon = { email: FiMail, code: FiKey, reset: FiShield, done: FiCheckCircle }[step];

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-[380px] rounded-2xl border border-slate-200 bg-white shadow-sm p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-6">
          <img src={LOGO_URL} alt="One Square Associates" className="h-14 w-auto object-contain" />
          <p className="text-[12px] font-medium text-slate-500 uppercase tracking-[0.14em] mt-4">
            {roleLabel} Password Reset
          </p>
        </div>

        <div className="flex items-start gap-3 mb-5">
          <div
            className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${
              step === "done" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
            }`}
          >
            <StepIcon size={17} />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-slate-900 leading-tight">{title}</h1>
            <p className="text-[12.5px] text-slate-500 mt-1 break-words">{subtitle}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
            <FiAlertCircle className="text-red-500 mt-0.5 shrink-0" size={15} />
            <p className="text-[12.5px] text-red-700">{error}</p>
          </div>
        )}

        {step === "email" && (
          <form onSubmit={sendCode} className="space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="fp-email">
                Email address
              </label>
              <div className="relative">
                <FiMail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={15}
                />
                <input
                  id="fp-email"
                  type="email"
                  className="input pl-9"
                  placeholder="you@onesquare.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  disabled={busy}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full !py-2.5" disabled={busy}>
              {busy && <Spinner size={15} />}
              {busy ? "Sending code..." : "Send verification code"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verifyCode} className="space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="fp-code">
                Verification code
              </label>
              <input
                id="fp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="input text-center text-lg font-semibold tracking-[0.5em]"
                placeholder="------"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
                disabled={busy}
              />
            </div>
            <button type="submit" className="btn-primary w-full !py-2.5" disabled={busy}>
              {busy && <Spinner size={15} />}
              {busy ? "Verifying..." : "Verify code"}
            </button>
            <div className="flex items-center justify-between text-[12px]">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep("email");
                }}
                className="text-slate-500 hover:text-slate-700 transition-colors"
                disabled={busy}
              >
                Change email
              </button>
              <button
                type="button"
                onClick={resend}
                disabled={cooldown > 0 || busy}
                className="text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={resetPassword} className="space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="fp-new">
                New password
              </label>
              <PasswordField
                id="fp-new"
                value={password}
                onChange={setPassword}
                placeholder="Choose a strong password"
                disabled={busy}
              />
              <StrengthMeter value={password} />
              <RulesChecklist value={password} />
            </div>
            <div>
              <label className="label" htmlFor="fp-confirm">
                Confirm new password
              </label>
              <PasswordField
                id="fp-confirm"
                value={confirm}
                onChange={setConfirm}
                placeholder="Type it again"
                disabled={busy}
                error={Boolean(confirm) && confirm !== password}
              />
            </div>
            <button type="submit" className="btn-primary w-full !py-2.5" disabled={busy}>
              {busy && <Spinner size={15} />}
              {busy ? "Saving..." : "Change password"}
            </button>
          </form>
        )}

        {step === "done" && (
          <button
            type="button"
            className="btn-primary w-full !py-2.5"
            onClick={() => onBack(email.trim())}
          >
            Back to sign in
          </button>
        )}

        {step !== "done" && (
          <button
            type="button"
            onClick={() => onBack()}
            className="w-full flex items-center justify-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 mt-5 transition-colors"
            disabled={busy}
          >
            <FiArrowLeft size={13} />
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
