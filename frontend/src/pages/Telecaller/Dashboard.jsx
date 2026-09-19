import { MdSupportAgent } from "react-icons/md";
import { FiPhoneCall, FiUsers, FiClipboard } from "react-icons/fi";
import { useSelector } from "react-redux";
import { EmptyState } from "../../components/ui.jsx";

const TelecallerDashboard = () => {
  const { userData } = useSelector((state) => state.user);

  return (
    <>
      <h1 className="page-title">Hi, {userData?.name?.split(" ")[0]}</h1>
      <p className="page-subtitle">Your call queue, customer lookups and follow-ups will live here.</p>

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        {[
          { icon: FiPhoneCall, label: "Call queue" },
          { icon: FiUsers, label: "Customers" },
          { icon: FiClipboard, label: "Follow-ups" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="card p-5">
            <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center">
              <Icon size={17} />
            </div>
            <p className="text-[13px] font-medium text-slate-800 mt-3">{label}</p>
            <p className="text-[12px] text-slate-400 mt-0.5">Coming soon</p>
          </div>
        ))}
      </div>

      <div className="card mt-6">
        <EmptyState
          icon={MdSupportAgent}
          title="No modules built yet"
          hint="This workspace is a placeholder — the Telecaller console (call queue, customer lookup, follow-ups) will be built next."
        />
      </div>
    </>
  );
};

export default TelecallerDashboard;
