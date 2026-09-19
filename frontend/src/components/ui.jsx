import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiAlertTriangle, FiChevronLeft, FiChevronRight, FiInbox, FiX } from "react-icons/fi";

/* ------------------------------------------------------------------ atoms */

export const Spinner = ({ size = 18, className = "" }) => (
  <svg
    className={`animate-spin ${className}`}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
    <path
      d="M22 12a10 10 0 0 0-10-10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

export const FullPageLoader = ({ label = "Loading console..." }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA] gap-3">
    <Spinner size={34} className="text-indigo-600" />
    <p className="text-[13px] text-slate-500">{label}</p>
  </div>
);

export const SectionLoader = ({ rows = 5 }) => (
  <div className="p-5 space-y-3" aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
    ))}
  </div>
);

export const EmptyState = ({ icon: Icon = FiInbox, title, hint, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6">
    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
      <Icon size={20} />
    </div>
    <p className="text-[14px] font-medium text-slate-700">{title}</p>
    {hint && <p className="text-[13px] text-slate-400 mt-1 max-w-sm">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-6">
    <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
      <FiAlertTriangle size={20} />
    </div>
    <p className="text-[14px] font-medium text-slate-800">Could not load this section</p>
    <p className="text-[13px] text-slate-500 mt-1 max-w-md">{message}</p>
    {onRetry && (
      <button type="button" onClick={onRetry} className="btn-secondary mt-4">
        Try again
      </button>
    )}
  </div>
);

/* ----------------------------------------------------------------- badges */

const dotClass = "w-1.5 h-1.5 rounded-full";

const BADGE = {
  // order status
  confirmed: ["bg-blue-50 text-blue-700", "bg-blue-500", "Confirmed"],
  shipped: ["bg-indigo-50 text-indigo-700", "bg-indigo-500", "Shipped"],
  in_transit: ["bg-orange-50 text-orange-700", "bg-orange-500", "In Transit"],
  delivered: ["bg-emerald-50 text-emerald-700", "bg-emerald-600", "Delivered"],
  cancelled: ["bg-rose-50 text-rose-700", "bg-rose-500", "Cancelled"],
  pending: ["bg-amber-50 text-amber-700", "bg-amber-500", "Pending"],
  // buy-now request status
  contacted: ["bg-blue-50 text-blue-700", "bg-blue-500", "Contacted"],
  converted: ["bg-emerald-50 text-emerald-700", "bg-emerald-600", "Converted"],
  // enquiry status
  new: ["bg-amber-50 text-amber-700", "bg-amber-500", "New"],
  in_progress: ["bg-blue-50 text-blue-700", "bg-blue-500", "In Progress"],
  resolved: ["bg-emerald-50 text-emerald-700", "bg-emerald-600", "Resolved"],
  spam: ["bg-rose-50 text-rose-700", "bg-rose-500", "Spam"],
  // product status
  active: ["bg-emerald-50 text-emerald-700", "bg-emerald-500", "Active"],
  draft: ["bg-slate-100 text-slate-600", "bg-slate-400", "Draft"],
  out_of_stock: ["bg-amber-50 text-amber-700", "bg-amber-500", "Out of Stock"],
  archived: ["bg-slate-100 text-slate-500", "bg-slate-400", "Archived"],
  // customer status
  suspended: ["bg-amber-50 text-amber-700", "bg-amber-500", "Suspended"],
  blocked: ["bg-red-50 text-red-700", "bg-red-500", "Blocked"],
  deleted: ["bg-slate-100 text-slate-600", "bg-slate-400", "Deleted"],
  // coupon / event state
  scheduled: ["bg-blue-50 text-blue-700", "bg-blue-500", "Scheduled"],
  expired: ["bg-slate-100 text-slate-500", "bg-slate-400", "Expired"],
  exhausted: ["bg-amber-50 text-amber-700", "bg-amber-500", "Exhausted"],
  disabled: ["bg-slate-100 text-slate-600", "bg-slate-400", "Disabled"],
  live: ["bg-emerald-50 text-emerald-700", "bg-emerald-500", "Live"],
};

export const StatusBadge = ({ status, label }) => {
  const [cls, dot, fallback] = BADGE[status] || [
    "bg-slate-100 text-slate-600",
    "bg-slate-400",
    status,
  ];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium ${cls}`}
    >
      <span className={`${dotClass} ${dot}`} />
      {label || fallback || "Unknown"}
    </span>
  );
};

const PAYMENT_BADGE = {
  paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  refunded: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  partially_refunded: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  disputed: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const PAYMENT_LABEL = {
  paid: "Paid",
  refunded: "Refunded",
  partially_refunded: "Partly refunded",
  disputed: "Disputed",
};

export const PaymentBadge = ({ status }) => (
  <span
    className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium ${
      PAYMENT_BADGE[status] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
    }`}
  >
    {PAYMENT_LABEL[status] || status}
  </span>
);

const ROLE_BADGE = {
  admin: ["bg-blue-50 text-blue-700 border-blue-200", "bg-blue-500", "Admin"],
  telecaller: ["bg-purple-50 text-purple-700 border-purple-200", "bg-purple-500", "Telecaller"],
  sales: ["bg-emerald-50 text-emerald-700 border-emerald-200", "bg-emerald-500", "Sales"],
  user: ["bg-slate-50 text-slate-600 border-slate-200", "bg-slate-400", "Customer"],
};

export const RoleBadge = ({ role }) => {
  const [cls, dot, label] = ROLE_BADGE[role] || ROLE_BADGE.user;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium ${cls}`}
    >
      <span className={`${dotClass} ${dot}`} />
      {label}
    </span>
  );
};

export const VerifiedBadge = ({ verified }) =>
  verified ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700">
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500">
      Unverified
    </span>
  );

const TAG_PALETTES = [
  "bg-purple-50 text-purple-700",
  "bg-blue-50 text-blue-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-pink-50 text-pink-700",
  "bg-indigo-50 text-indigo-700",
];

/** Stable string hash so a given tag always gets the same colour. */
const hashString = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

export const TagPill = ({ tag, onRemove }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
      TAG_PALETTES[hashString(tag) % TAG_PALETTES.length]
    }`}
  >
    {tag}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="hover:opacity-60 transition-opacity"
        aria-label={`Remove tag ${tag}`}
      >
        <FiX size={11} />
      </button>
    )}
  </span>
);

export const CARD_BRAND_CLASS = {
  visa: "text-indigo-600",
  mastercard: "text-orange-600",
  amex: "text-blue-600",
  discover: "text-amber-600",
};

/* ---------------------------------------------------------------- avatars */

export const Avatar = ({ name = "", src = "", size = 36, className = "" }) => {
  const initials =
    String(name)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        decoding="async"
        style={{ width: size, height: size }}
        className={`rounded-lg object-cover bg-slate-100 shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={`rounded-lg bg-slate-100 text-slate-600 font-semibold flex items-center justify-center shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
};

/* ----------------------------------------------------------------- modals */

export const Modal = ({ open, onClose, title, subtitle, children, footer, size = "md" }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className={`relative bg-white rounded-xl shadow-2xl w-full ${widths[size]} max-h-[92vh] flex flex-col animate-fadeSlideDown`}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4 rounded-t-xl">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900 text-[15px] truncate">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0 transition-colors"
            aria-label="Close"
          >
            <FiX size={17} />
          </button>
        </div>

        <div className="overflow-y-auto scrollbar-refined flex-1">{children}</div>

        {footer && (
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-white rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  tone = "danger",
  busy = false,
}) => (
  <Modal open={open} onClose={busy ? () => {} : onClose} title={title} size="sm">
    <div className="p-5 flex gap-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          tone === "danger" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
        }`}
      >
        <FiAlertTriangle size={19} />
      </div>
      <p className="text-[13px] text-slate-600 leading-relaxed pt-1">{message}</p>
    </div>
    <div className="px-5 pb-5 flex items-center justify-end gap-2">
      <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
        Cancel
      </button>
      <button
        type="button"
        className={tone === "danger" ? "btn-danger" : "btn-primary"}
        onClick={onConfirm}
        disabled={busy}
      >
        {busy && <Spinner size={14} />}
        {confirmLabel}
      </button>
    </div>
  </Modal>
);

/* ----------------------------------------------------------------- drawer */

export const Drawer = ({ open, onClose, title, subtitle, children, width = "max-w-2xl" }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end lg:justify-center lg:items-center lg:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative bg-white w-full ${width} h-full lg:h-auto lg:max-h-[90vh] lg:rounded-xl flex flex-col shadow-2xl animate-slideInRight lg:animate-popIn`}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900 text-[15px] truncate">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0 transition-colors"
            aria-label="Close"
          >
            <FiX size={17} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-refined">{children}</div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------- pagination */

export const Pagination = ({ page, pages, total, limit, onChange, label = "records" }) => {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
      <p className="text-[12px] text-slate-500 tabular-nums">
        Showing <span className="font-medium text-slate-700">{from}</span>–
        <span className="font-medium text-slate-700">{to}</span> of{" "}
        <span className="font-medium text-slate-700">{total}</span> {label}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-secondary px-2 py-1.5"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <FiChevronLeft size={15} />
        </button>
        <span className="text-[12px] text-slate-500 px-2 tabular-nums">
          Page {page} of {pages}
        </span>
        <button
          type="button"
          className="btn-secondary px-2 py-1.5"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
        >
          <FiChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------- toggles */

export const Toggle = ({ checked, onChange, label, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
      checked ? "bg-indigo-600" : "bg-slate-200"
    }`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-[18px]" : "translate-x-[3px]"
      }`}
    />
  </button>
);

/* ------------------------------------------------------------ formatters */

export const formatMoney = (value, currency = "INR") => {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `₹${n.toFixed(2)}`;
  }
};

export const formatCompact = (value) => {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  return String(n);
};

export const formatDate = (value, withTime = false) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

export const relativeTime = (value) => {
  if (!value) return "Never";
  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff)) return "Never";
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
};

/** Values under 10 are zero-padded in the mini-stat row: 7 -> "07". */
export const padTwo = (n) => String(Number(n) || 0).padStart(2, "0");
