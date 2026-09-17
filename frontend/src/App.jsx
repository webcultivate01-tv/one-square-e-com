import { Navigate, Route, Routes } from "react-router-dom";
import { FiAlertOctagon, FiTool } from "react-icons/fi";
import useGetCurrentUser from "./hooks/useGetCurrentUser.js";
import AdminRoute from "./components/AdminRoute.jsx";
import PermissionRoute from "./components/PermissionRoute.jsx";
import AdminShell from "./pages/Admin/AdminShell.jsx";
import Dashboard from "./pages/Admin/Dashboard.jsx";
import Products from "./pages/Admin/Products.jsx";
import Categories from "./pages/Admin/Categories.jsx";
import Employees from "./pages/Admin/Employees.jsx";
import Profile from "./pages/Admin/Profile.jsx";
import AdminOnlyRoute from "./components/AdminOnlyRoute.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";

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
      <Route path="/" element={<Navigate to="/admin" replace />} />
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
        <Route path="orders" element={<ComingSoon title="Orders" />} />
        <Route path="payments" element={<ComingSoon title="Payments" />} />
        <Route path="customers" element={<ComingSoon title="Customers" />} />
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

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default App;
