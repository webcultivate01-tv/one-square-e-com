import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { FullPageLoader } from "./ui.jsx";

/**
 * Gate for a single-role portal (Telecaller, Sales). Unlike AdminRoute, this
 * rejects every OTHER staff role too — an admin or sales account hitting
 * /talecaller is sent back to that portal's own login, not waved through.
 */
const RoleRoute = ({ role, loginPath, changePasswordPath, children }) => {
  const { userData, authChecked } = useSelector((state) => state.user);
  const location = useLocation();

  if (!authChecked) return <FullPageLoader label="Checking your session..." />;

  if (!userData || userData.role !== role) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  if (userData.mustChangePassword && location.pathname !== changePasswordPath) {
    return <Navigate to={changePasswordPath} replace />;
  }

  return children;
};

export default RoleRoute;
