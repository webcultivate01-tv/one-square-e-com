import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { FiLock } from "react-icons/fi";

/**
 * Employee Management is Admin-only — Telecaller/Sales never see this screen,
 * mirroring the server's requireAdminRole gate.
 */
const AdminOnlyRoute = ({ children }) => {
  const { userData } = useSelector((state) => state.user);

  if (userData?.role === "admin") return children;

  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
        <FiLock size={22} />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">Admins only</h2>
      <p className="text-[13px] text-slate-500 mt-1.5 max-w-sm">
        Employee Management is restricted to the Admin role.
      </p>
      <Link to="/admin" className="btn-secondary mt-5">
        Back to dashboard
      </Link>
    </div>
  );
};

export default AdminOnlyRoute;
