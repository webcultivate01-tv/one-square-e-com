import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiCreditCard,
  FiDatabase,
  FiGrid,
  FiLogOut,
  FiMail,
  FiMenu,
  FiSearch,
  FiShield,
  FiShoppingCart,
  FiTag,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { BsBoxSeam } from "react-icons/bs";
import axios from "axios";
import { serverUrl } from "../../App.jsx";
import { can, clearUser } from "../../redux/userSlice.js";
import { Avatar } from "../../components/ui.jsx";
import CommandPalette from "../../components/CommandPalette.jsx";
import NotificationBell from "../../components/NotificationBell.jsx";

/** Nav model — `permission` mirrors the server's hasPermission keys. */
const SECTIONS = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/admin", icon: FiGrid, permission: "reports", end: true }],
  },
  {
    title: "Catalog",
    items: [
      { label: "Product Management", to: "/admin/products", icon: BsBoxSeam, permission: "products" },
      { label: "Categories Management", to: "/admin/categories", icon: FiTag, permission: "categories" },
      { label: "Order Management", to: "/admin/orders", icon: FiShoppingCart, permission: "orders" },
      { label: "Payment Management", to: "/admin/payments", icon: FiCreditCard, permission: "payments" },
    ],
  },
  {
    title: "Customers",
    items: [
      { label: "Customer Management", to: "/admin/customers", icon: FiUsers, permission: "customers" },
      { label: "Enquiry Management", to: "/admin/enquiries", icon: FiMail, permission: "enquiries" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Employee Management", to: "/admin/employees", icon: FiShield, permission: null, adminOnly: true },
      { label: "Reports", to: "/admin/export", icon: FiDatabase, permission: "reports" },
      { label: "My Profile", to: "/admin/profile", icon: FiUser, permission: null },
    ],
  },
];

const ROLE_LABEL = { admin: "ADMIN", telecaller: "TELECALLER", sales: "SALES", user: "USER" };

const AdminShell = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useSelector((state) => state.user);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [alerts, setAlerts] = useState({ lowStock: 0, pendingOrders: 0, newEnquiries: 0 });
  const [notifications, setNotifications] = useState([]);
  const [now, setNow] = useState(() => new Date());

  /** Only render nav entries this admin can actually use. */
  const visibleSections = useMemo(() => {
    const canManageEmployees = userData?.role === "admin";
    return SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.adminOnly) return canManageEmployees;
        if (!item.permission) return true;
        return can(userData, item.permission);
      }),
    })).filter((section) => section.items.length > 0);
  }, [userData]);

  const navItems = useMemo(
    () => visibleSections.flatMap((section) => section.items),
    [visibleSections]
  );

  const commands = useMemo(
    () =>
      visibleSections.flatMap((section) =>
        section.items.map((item) => ({
          label: item.label,
          to: item.to,
          icon: item.icon,
          section: section.title,
          keywords: item.label,
        }))
      ),
    [visibleSections]
  );

  // Ctrl-K / Cmd-K opens the palette.
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

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Live clock for the navbar.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  /** Live sidebar badges + bell notifications. Silent on failure — this is decoration. */
  const loadAlerts = useCallback(async () => {
    if (!can(userData, "products") && !can(userData, "orders") && !can(userData, "enquiries")) return;
    try {
      const [stats, orders, enquiries] = await Promise.all([
        can(userData, "products")
          ? axios
              .get(serverUrl + "/api/product/stats", { withCredentials: true })
              .then((r) => r.data.stats?.lowStock || 0)
          : Promise.resolve(0),
        can(userData, "orders")
          ? axios
              .get(serverUrl + "/api/order-request/getall", {
                params: { status: "pending", limit: 5 },
                withCredentials: true,
              })
              .then((r) => r.data)
          : Promise.resolve({ total: 0, requests: [] }),
        can(userData, "enquiries")
          ? axios
              .get(serverUrl + "/api/contact/getall", {
                params: { status: "new", limit: 5 },
                withCredentials: true,
              })
              .then((r) => r.data)
          : Promise.resolve({ total: 0, enquiries: [] }),
      ]);

      const inventory = can(userData, "products")
        ? await axios
            .get(serverUrl + "/api/product/inventory", { withCredentials: true })
            .then((r) => r.data.inventory || [])
            .catch(() => [])
        : [];

      setAlerts({ lowStock: stats, pendingOrders: orders.total || 0, newEnquiries: enquiries.total || 0 });

      const enquiryItems = (enquiries.enquiries || []).map((e) => ({
        id: `enquiry-${e._id}`,
        type: "enquiry",
        title: `New enquiry from ${e.name}`,
        subtitle: e.subject,
        time: e.createdAt,
        link: "/admin/enquiries",
      }));

      const orderItems = (orders.requests || []).map((r) => ({
        id: `order-${r._id}`,
        type: "order",
        title: `New order request — ${r.productName}`,
        subtitle: `${r.name} · Qty ${r.quantity}`,
        time: r.createdAt,
        link: "/admin/orders",
      }));

      const stockItems = inventory
        .filter((p) => p.isLow || p.isOut)
        .slice(0, 5)
        .map((p) => ({
          id: `stock-${p.productId}-${p.variant || "base"}`,
          type: "stock",
          title: p.isOut ? `${p.name} is out of stock` : `${p.name} is low on stock`,
          subtitle: [p.variant, `${p.stock} left`].filter(Boolean).join(" · "),
          time: null,
          link: "/admin/products",
        }));

      setNotifications(
        [...enquiryItems, ...orderItems, ...stockItems].sort(
          (a, b) => new Date(b.time || 0) - new Date(a.time || 0)
        )
      );
    } catch {
      /* decoration only */
    }
  }, [userData]);

  useEffect(() => {
    loadAlerts();
    const timer = setInterval(loadAlerts, 60000);
    return () => clearInterval(timer);
  }, [loadAlerts]);

  const logout = async () => {
    try {
      await axios.post(serverUrl + "/api/auth/logout", {}, { withCredentials: true });
    } catch (error) {
      // The local session is cleared regardless.
      console.warn(error.response?.data?.message || error.message);
    }
    dispatch(clearUser());
    toast.success("Signed out.");
    navigate("/admin/login", { replace: true });
  };

  const badgeFor = (label) => {
    if (label === "Product Management" && alerts.lowStock > 0) return alerts.lowStock;
    if (label === "Order Management" && alerts.pendingOrders > 0) return alerts.pendingOrders;
    if (label === "Enquiry Management" && alerts.newEnquiries > 0) return alerts.newEnquiries;
    return null;
  };

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeLabel = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const sidebar = (
    <aside className="w-64 bg-white flex flex-col shrink-0 border-r border-slate-200 h-full">
      {/* Brand */}
      <div className="px-5 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2.5 text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 font-black text-[13px] tracking-tight">
            OS
          </div>
          <div>
            <p className="text-[15px] font-black text-slate-900 tracking-wider leading-none">
              ONE SQUARE
            </p>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.14em] mt-1">
              Admin Panel
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

      {/* Navigation */}
      <nav className="lg:flex-1 overflow-y-auto scrollbar-slim px-3 pb-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const badge = badgeFor(item.label);
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
                      {badge !== null && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isActive
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sign out */}
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
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">{sidebar}</div>

      {/* Mobile drawer */}
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
        {/* Topbar */}
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

          {/* Search / palette trigger */}
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

            <NotificationBell notifications={notifications} />

            <span className="w-px h-6 bg-slate-200 hidden sm:block" />

            <button
              type="button"
              onClick={() => navigate("/admin/profile")}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-7 scrollbar-refined">
          <Outlet context={{ refreshAlerts: loadAlerts }} />
        </div>
      </main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />
    </div>
  );
};

export default AdminShell;
