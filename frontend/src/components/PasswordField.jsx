import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One number", test: (v) => /\d/.test(v) },
  {
    label: "One symbol",
    test: (v) => /[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/.test(v),
  },
];

/** Mirrors the server's PASSWORD_RULE exactly. */
export const isStrongPassword = (value) => PASSWORD_RULES.every((r) => r.test(String(value || "")));

const STRENGTH = [
  ["Very weak", "bg-red-500", "text-red-600"],
  ["Weak", "bg-orange-500", "text-orange-600"],
  ["Fair", "bg-amber-500", "text-amber-600"],
  ["Good", "bg-blue-500", "text-blue-600"],
  ["Strong", "bg-emerald-500", "text-emerald-600"],
  ["Excellent", "bg-emerald-600", "text-emerald-700"],
];

export const scorePassword = (value = "") => {
  if (!value) return 0;
  let score = PASSWORD_RULES.filter((r) => r.test(value)).length;
  if (value.length >= 14) score += 1;
  return Math.min(score, 6);
};

const AMBIGUOUS = /[l1IO0]/g;

/** Guaranteed-valid password: one of each class, shuffled, no ambiguous glyphs. */
export const generatePassword = (length = 14) => {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_=+?";
  const all = (lower + upper + digits + symbols).replace(AMBIGUOUS, "");

  const pickFrom = (set) => set[Math.floor(Math.random() * set.length)];
  const chars = [pickFrom(lower), pickFrom(upper), pickFrom(digits), pickFrom(symbols)];
  while (chars.length < length) chars.push(pickFrom(all));

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};

export const StrengthMeter = ({ value }) => {
  const score = scorePassword(value);
  const [label, , textClass] = STRENGTH[Math.max(0, score - 1)] || STRENGTH[0];

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < score ? STRENGTH[Math.max(0, score - 1)][1] : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      {value && (
        <p className={`text-[11px] mt-1.5 font-medium ${textClass}`}>{label} password</p>
      )}
    </div>
  );
};

export const RulesChecklist = ({ value }) => (
  <ul className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
    {PASSWORD_RULES.map((rule) => {
      const ok = rule.test(String(value || ""));
      return (
        <li
          key={rule.label}
          className={`text-[11px] flex items-center gap-1.5 ${
            ok ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-300"}`}
          />
          {rule.label}
        </li>
      );
    })}
  </ul>
);

const PasswordField = ({
  value,
  onChange,
  placeholder = "Enter a password",
  autoComplete = "new-password",
  error,
  id,
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        className={`input pr-10 ${error ? "input-error" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {visible ? <FiEyeOff size={16} /> : <FiEye size={16} />}
      </button>
    </div>
  );
};

export default PasswordField;
