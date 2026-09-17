import { FiTrendingUp, FiBox, FiShoppingBag, FiUsers } from "react-icons/fi";
import { useSelector } from "react-redux";
import StaffShell from "../../components/StaffShell.jsx";
import { EmptyState } from "../../components/ui.jsx";

const SalesDashboard = () => {
  const { userData } = useSelector((state) => state.user);

  return (
    <StaffShell icon={FiTrendingUp} roleLabel="Sales" loginPath="/sales/login">
      <h1 className="page-title">Hi, {userData?.name?.split(" ")[0]}</h1>
      <p className="page-subtitle">Your product catalog, orders and customer pipeline will live here.</p>

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        {[
          { icon: FiBox, label: "Catalog" },
          { icon: FiShoppingBag, label: "Orders" },
          { icon: FiUsers, label: "Leads" },
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
          icon={FiTrendingUp}
          title="No modules built yet"
          hint="This workspace is a placeholder — the Sales console (catalog, orders, leads) will be built next."
        />
      </div>
    </StaffShell>
  );
};

export default SalesDashboard;
