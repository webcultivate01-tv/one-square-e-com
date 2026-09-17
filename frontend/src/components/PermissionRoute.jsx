import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { FiLock } from "react-icons/fi";
import { can } from "../redux/userSlice.js";

/**
 * Mirrors the server's hasPermission middleware so a sub-admin never sees a
 * screen that would 403 on every request it makes.
 */
const PermissionRoute = ({ permission, children }) => {
  const { userData } = useSelector((state) => state.user);

  if (can(userData, permission)) return children;

  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
        <FiLock size={22} />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">Permission required</h2>
      <p className="text-[13px] text-slate-500 mt-1.5 max-w-sm">
        Your account does not have the <span className="font-medium text-slate-700">{permission}</span>{" "}
        permission. Ask an Admin to grant it from Employee Management.
      </p>
      <Link to="/admin" className="btn-secondary mt-5">
        Back to dashboard
      </Link>
    </div>
  );
};

export default PermissionRoute;
