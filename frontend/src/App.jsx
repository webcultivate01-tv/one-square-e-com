import { Navigate, Route, Routes } from "react-router-dom";
import { FiAlertOctagon, FiGrid, FiMail, FiShoppingCart, FiTag, FiTool, FiUser } from "react-icons/fi";
import { BsBoxSeam } from "react-icons/bs";
import StaffShell from "./components/StaffShell.jsx";
import useGetCurrentUser from "./hooks/useGetCurrentUser.js";
import AdminRoute from "./components/AdminRoute.jsx";
import PermissionRoute from "./components/PermissionRoute.jsx";
import RoleRoute from "./components/RoleRoute.jsx";
import PublicLayout from "./components/PublicLayout.jsx";
import AdminShell from "./pages/Admin/AdminShell.jsx";
import Dashboard from "./pages/Admin/Dashboard.jsx";
import Products from "./pages/Admin/Products.jsx";
import Categories from "./pages/Admin/Categories.jsx";
import Orders from "./pages/Admin/Orders.jsx";
import Enquiries from "./pages/Admin/Enquiries.jsx";
import Employees from "./pages/Admin/Employees.jsx";
import Profile from "./pages/Admin/Profile.jsx";
import AdminOnlyRoute from "./components/AdminOnlyRoute.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import Home from "./pages/Home.jsx";
import StoreProducts from "./pages/Products.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import Favorites from "./pages/Favorites.jsx";
import NotFound from "./pages/NotFound.jsx";
import TelecallerLogin from "./pages/TelecallerLogin.jsx";
import SalesLogin from "./pages/SalesLogin.jsx";
import TelecallerDashboard from "./pages/Telecaller/Dashboard.jsx";
import SalesDashboard from "./pages/Sales/Dashboard.jsx";

/** Admin-granted modules an employee portal can expose — `permission` mirrors the server's hasPermission keys. */
const MODULES = [
  { label: "Products", path: "products", icon: BsBoxSeam, permission: "products", Page: Products },
  { label: "Categories", path: "categories", icon: FiTag, permission: "categories", Page: Categories },
  { label: "Orders", path: "orders", icon: FiShoppingCart, permission: "orders", Page: Orders },
  { label: "Enquiries", path: "enquiries", icon: FiMail, permission: "enquiries", Page: Enquiries },
];

const portalNav = (base) => [
  { label: "Dashboard", to: base, icon: FiGrid, end: true },
  ...MODULES.map((m) => ({ label: m.label, to: `${base}/${m.path}`, icon: m.icon, permission: m.permission })),
  { label: "My Profile", to: `${base}/profile`, icon: FiUser },
];

const portalModuleRoutes = (base) =>
  MODULES.map((m) => (
    <Route
      key={m.path}
      path={m.path}
      element={
        <PermissionRoute permission={m.permission} homePath={base}>
          <m.Page />
        </PermissionRoute>
      }
    />
  ));

const TELECALLER_NAV = portalNav("/talecaller");
const SALES_NAV = portalNav("/sales");

/** The deployed backend URL — imported wherever an API call is made. */
export const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

/** Placeholder for modules not built yet — keeps the sidebar/router honest about what's live. */
const ComingSoon = ({ title }) => (
  <div className="flex flex-col items-center justify-center text-center py-24">
    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
      <FiTool size={22} />
    </div>
    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    <p className="text-[13px] text-slate-500 mt-1.5 max-w-sm">This module is still being built.</p>
  </div>
);

const NoAccess = () => (
  <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center text-center p-4">
    <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
      <FiAlertOctagon size={22} />
    </div>
    <h2 className="text-lg font-semibold text-slate-900">No admin access</h2>
    <p className="text-[13px] text-slate-500 mt-1.5 max-w-sm">
      This account does not have access to the admin console.
    </p>
  </div>
);

const App = () => {
  useGetCurrentUser();

  return (
    <Routes>
      {/* ---------------------------------------------------------- storefront */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<StoreProducts />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* --------------------------------------------------------------- admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/no-access" element={<NoAccess />} />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminShell />
          </AdminRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route
          path="products"
          element={
            <PermissionRoute permission="products">
              <Products />
            </PermissionRoute>
          }
        />
        <Route
          path="categories"
          element={
            <PermissionRoute permission="categories">
              <Categories />
            </PermissionRoute>
          }
        />
        <Route
          path="orders"
          element={
            <PermissionRoute permission="orders">
              <Orders />
            </PermissionRoute>
          }
        />
        <Route path="payments" element={<ComingSoon title="Payments" />} />
        <Route path="customers" element={<ComingSoon title="Customers" />} />
        <Route
          path="enquiries"
          element={
            <PermissionRoute permission="enquiries">
              <Enquiries />
            </PermissionRoute>
          }
        />
        <Route path="export" element={<ComingSoon title="Data Export" />} />
        <Route
          path="employees"
          element={
            <AdminOnlyRoute>
              <Employees />
            </AdminOnlyRoute>
          }
        />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>

      {/* ---------------------------------------------------------- telecaller */}
      <Route path="/talecaller/login" element={<TelecallerLogin />} />
      <Route
        path="/talecaller/change-password"
        element={<ChangePassword homePath="/talecaller" loginPath="/talecaller/login" />}
      />
      <Route
        path="/talecaller"
        element={
          <RoleRoute
            role="telecaller"
            loginPath="/talecaller/login"
            changePasswordPath="/talecaller/change-password"
          >
            <StaffShell
              roleLabel="Telecaller"
              basePath="/talecaller"
              loginPath="/talecaller/login"
              navItems={TELECALLER_NAV}
            />
          </RoleRoute>
        }
      >
        <Route index element={<TelecallerDashboard />} />
        {portalModuleRoutes("/talecaller")}
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/talecaller" replace />} />
      </Route>

      {/* --------------------------------------------------------------- sales */}
      <Route path="/sales/login" element={<SalesLogin />} />
      <Route
        path="/sales/change-password"
        element={<ChangePassword homePath="/sales" loginPath="/sales/login" />}
      />
      <Route
        path="/sales"
        element={
          <RoleRoute role="sales" loginPath="/sales/login" changePasswordPath="/sales/change-password">
            <StaffShell roleLabel="Sales" basePath="/sales" loginPath="/sales/login" navItems={SALES_NAV} />
          </RoleRoute>
        }
      >
        <Route index element={<SalesDashboard />} />
        {portalModuleRoutes("/sales")}
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/sales" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
