import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiLogOut, FiMenu, FiSearch, FiX } from "react-icons/fi";
import axios from "axios";
import { serverUrl } from "../App.jsx";
import { can, clearUser } from "../redux/userSlice.js";
import { Avatar } from "./ui.jsx";
import CommandPalette from "./CommandPalette.jsx";
import NotificationBell from "./NotificationBell.jsx";

const ROLE_LABEL = { admin: "ADMIN", telecaller: "TELECALLER", sales: "SALES", user: "USER" };

/**
 * Route layout for the single-role portals (Telecaller, Sales) — same sidebar +
 * topbar chrome as AdminShell. Pages render into the <Outlet />.
 *
 * `navItems`: [{ label, to, icon, end? }] — `to` is absolute.
 * `basePath`: portal root (e.g. "/talecaller"); the profile lives at `${basePath}/profile`.
 */
const StaffShell = ({ roleLabel, basePath, loginPath, navItems: allNavItems }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useSelector((state) => state.user);

  /** Only show modules the admin has granted (`permission` mirrors the server keys). */
  const navItems = useMemo(
    () => allNavItems.filter((item) => !item.permission || can(userData, item.permission)),
    [allNavItems, userData]
  );

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const commands = useMemo(
    () =>
      navItems.map((item) => ({
        label: item.label,
        to: item.to,
        icon: item.icon,
        section: roleLabel,
        keywords: item.label,
      })),
    [navItems, roleLabel]
  );

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const logout = async () => {
    try {
      await axios.post(serverUrl + "/api/auth/logout", {}, { withCredentials: true });
    } catch (error) {
      // The local session is cleared regardless.
      console.warn(error.response?.data?.message || error.message);
    }
    dispatch(clearUser());
    toast.success("Signed out.");
    navigate(loginPath, { replace: true });
  };

  const dateLabel = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const timeLabel = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  const sidebar = (
    <aside className="w-64 bg-white flex flex-col shrink-0 border-r border-slate-200 h-full">
      <div className="px-5 py-4 flex items-center justify-between">
        <button type="button" onClick={() => navigate(basePath)} className="flex items-center gap-2.5 text-left">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 font-black text-[13px] tracking-tight">
            OS
          </div>
          <div>
            <p className="text-[15px] font-black text-slate-900 tracking-wider leading-none">ONE SQUARE</p>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.14em] mt-1">
              {roleLabel} Portal
            </p>
          </div>
        </button>
        <button
          type="button"
          className="lg:hidden text-slate-400 hover:text-slate-700"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation"
        >
          <FiX size={18} />
        </button>
      </div>

      <nav className="lg:flex-1 overflow-y-auto scrollbar-slim px-3 pb-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `group relative w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-indigo-600 rounded-r-full" />
                      )}
                      <Icon
                        size={16}
                        className={
                          isActive
                            ? "text-indigo-600 shrink-0"
                            : "text-slate-400 group-hover:text-slate-600 shrink-0"
                        }
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 py-3 border-t border-slate-100">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <FiLogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-[#F7F8FA] overflow-hidden font-sans text-slate-700">
      <div className="hidden lg:flex">{sidebar}</div>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileNavOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!mobileNavOpen}
      >
        <div
          className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ease-out ${
            mobileNavOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileNavOpen(false)}
        />
        <div
          className={`absolute inset-y-0 left-0 max-w-[85vw] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${
            mobileNavOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
        >
          {sidebar}
        </div>
      </div>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden text-slate-500 hover:text-slate-900"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <FiMenu size={19} />
            </button>
            <span className="hidden sm:flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[12px] font-medium text-slate-600">Live</span>
              <span className="w-px h-4 bg-slate-200" />
              <span className="text-[12px] text-slate-500 tabular-nums whitespace-nowrap">
                {dateLabel} &middot; {timeLabel}
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 flex-1 max-w-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-left hover:bg-white hover:border-indigo-300 transition-colors"
          >
            <FiSearch size={14} className="text-slate-400 shrink-0" />
            <span className="text-[13px] text-slate-400 flex-1">Search sections...</span>
            <kbd className="text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-white">
              Ctrl K
            </kbd>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="md:hidden w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
              aria-label="Search"
            >
              <FiSearch size={16} />
            </button>

            <NotificationBell notifications={[]} />

            <span className="w-px h-6 bg-slate-200 hidden sm:block" />

            <button
              type="button"
              onClick={() => navigate(`${basePath}/profile`)}
              className="flex items-center gap-2.5 rounded-lg hover:bg-slate-50 px-1.5 py-1 transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-[13px] font-medium text-slate-900 leading-tight truncate max-w-[140px]">
                  {userData?.name}
                </p>
                <p className="text-[11px] text-slate-400 leading-tight truncate max-w-[140px]">
                  {userData?.email}
                </p>
              </div>
              <Avatar name={userData?.name} src={userData?.avatar} size={36} />
              <span className="text-[9px] font-bold tracking-wide text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 hidden sm:inline">
                {ROLE_LABEL[userData?.role] || "USER"}
              </span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-7 scrollbar-refined">
          <Outlet />
        </div>
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  );
};

export default StaffShell;
