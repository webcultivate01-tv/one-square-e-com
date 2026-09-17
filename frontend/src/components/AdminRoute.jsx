import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { FullPageLoader } from "./ui.jsx";
import { isStaffRole } from "../redux/userSlice.js";

/**
 * Gate for everything under /admin.
 *
 * Unauthenticated visitors go to the ADMIN login (not the storefront one),
 * with the attempted path preserved in location.state.from.
 * `mustChangePassword` is enforced here, before any console route renders.
 */
const AdminRoute = ({ children }) => {
  const { userData, authChecked } = useSelector((state) => state.user);
  const location = useLocation();

  if (!authChecked) return <FullPageLoader label="Checking your session..." />;

  if (!userData) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (!isStaffRole(userData.role)) {
    return <Navigate to="/admin/no-access" replace />;
  }

  if (userData.mustChangePassword && location.pathname !== "/admin/change-password") {
    return <Navigate to="/admin/change-password" replace />;
  }

  return children;
};

export default AdminRoute;
