import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiLogOut } from "react-icons/fi";
import axios from "axios";
import { serverUrl } from "../App.jsx";
import { clearUser } from "../redux/userSlice.js";
import { Avatar } from "./ui.jsx";

/** Minimal chrome shared by the Telecaller and Sales placeholder dashboards. */
const StaffShell = ({ icon: Icon, roleLabel, loginPath, children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);

  const signOut = async () => {
    await axios.post(serverUrl + "/api/auth/logout", {}, { withCredentials: true }).catch(() => {});
    dispatch(clearUser());
    toast.success("Signed out.");
    navigate(loginPath, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-slate-200 px-5 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <Icon size={17} />
          </div>
          <div>
            <p className="text-[13px] font-black tracking-wider text-slate-900">ONE SQUARE</p>
            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.14em]">
              {roleLabel} Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5">
            <Avatar name={userData?.name} src={userData?.avatar} size={32} />
            <div className="leading-tight">
              <p className="text-[13px] font-medium text-slate-800">{userData?.name}</p>
              <p className="text-[11px] text-slate-400">{userData?.email}</p>
            </div>
          </div>
          <button type="button" onClick={signOut} className="btn-secondary">
            <FiLogOut size={14} />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8">{children}</main>
    </div>
  );
};

export default StaffShell;
