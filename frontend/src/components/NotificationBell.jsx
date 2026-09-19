import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiAlertTriangle, FiBell, FiMail, FiShoppingCart } from "react-icons/fi";
import { EmptyState, relativeTime } from "./ui.jsx";

const SEEN_KEY = "admin_notifications_seen";
const MAX_SEEN = 300;

const loadSeen = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
};

const saveSeen = (ids) => {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-MAX_SEEN)));
  } catch {
    /* storage unavailable — badge just won't persist across reloads */
  }
};

const ICONS = { enquiry: FiMail, order: FiShoppingCart, stock: FiAlertTriangle };
const ICON_TONE = {
  enquiry: "bg-indigo-50 text-indigo-600",
  order: "bg-amber-50 text-amber-600",
  stock: "bg-red-50 text-red-600",
};

/**
 * Bell dropdown fed by live enquiries/orders/stock data (see AdminShell's
 * loadAlerts). "Unread" is tracked by notification id in localStorage since
 * these items don't carry a server-side read flag.
 */
const NotificationBell = ({ notifications = [] }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(loadSeen);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !seen.has(n.id)).length;

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next) {
        const merged = new Set(seen);
        notifications.forEach((n) => merged.add(n.id));
        saveSeen(merged);
        setSeen(merged);
      }
      return next;
    });
  };

  const openItem = (n) => {
    setOpen(false);
    navigate(n.link);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        className="relative w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
        aria-label={`${unreadCount} new notifications`}
      >
        <FiBell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-red-100 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] w-[340px] max-w-[90vw] bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden z-50 animate-fadeSlideDown">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-slate-800">Notifications</p>
            {notifications.length > 0 && (
              <span className="text-[11px] text-slate-400">{notifications.length} recent</span>
            )}
          </div>

          <ul className="max-h-[380px] overflow-y-auto scrollbar-refined divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <li>
                <EmptyState icon={FiBell} title="You're all caught up" hint="New enquiries, orders and stock alerts will show up here." />
              </li>
            ) : (
              notifications.map((n) => {
                const Icon = ICONS[n.type] || FiBell;
                const isUnread = !seen.has(n.id);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ICON_TONE[n.type] || "bg-slate-100 text-slate-500"}`}
                      >
                        <Icon size={14} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-slate-800 truncate">{n.title}</span>
                          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
                        </span>
                        {n.subtitle && (
                          <span className="block text-[12px] text-slate-500 truncate mt-0.5">{n.subtitle}</span>
                        )}
                        {n.time && (
                          <span className="block text-[11px] text-slate-400 mt-1">{relativeTime(n.time)}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
