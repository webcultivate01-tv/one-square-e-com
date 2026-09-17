import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowDownRight,
  FiArrowUpRight,
  FiCreditCard,
  FiDollarSign,
  FiPackage,
  FiPlus,
  FiShoppingCart,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { BsBoxSeam } from "react-icons/bs";
import api, { errMsg } from "../../api/client.js";
import { can } from "../../redux/userSlice.js";
import {
  Avatar,
  ErrorState,
  PaymentBadge,
  SectionLoader,
  StatusBadge,
  formatCompact,
  formatDate,
  formatMoney,
  padTwo,
} from "../../components/ui.jsx";
import {
  BarChart,
  ChartLegend,
  DonutChart,
  DualAreaChart,
  FunnelChart,
  InventoryBars,
  ProgressRow,
  RevenueChart,
  Sparkline,
} from "./components/charts.jsx";

const RANGES = [7, 14, 30];

const DeltaPill = ({ value }) => {
  const up = Number(value) >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
        up ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
      }`}
    >
      {up ? <FiArrowUpRight size={11} /> : <FiArrowDownRight size={11} />}
      {Math.abs(Number(value) || 0).toFixed(1)}%
    </span>
  );
};

/**
 * Tailwind's JIT scanner reads class strings literally, so tones must be
 * written out in full — never interpolated.
 */
const TONE_TILE = {
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  teal: "bg-teal-50 text-teal-700",
  amber: "bg-amber-50 text-amber-600",
  purple: "bg-purple-50 text-purple-600",
};

const TONE_BAR = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-600",
  amber: "bg-amber-500",
  purple: "bg-purple-500",
};

const KpiCard = ({ icon: Icon, tone, label, value, delta, spark, sparkColor }) => (
  <div className="card card-hover p-5">
    <div className="flex items-start justify-between mb-4">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          TONE_TILE[tone] || TONE_TILE.blue
        }`}
      >
        <Icon size={17} />
      </div>
      <DeltaPill value={delta} />
    </div>
    <p className="text-[12px] text-slate-500 font-medium">{label}</p>
    <p className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5 tabular-nums">
      {value}
    </p>
    <div className="mt-3 -mb-1">
      <Sparkline data={spark || []} color={sparkColor} width={200} height={34} />
    </div>
  </div>
);

const MiniStat = ({ label, value, tone }) => (
  <div className="card p-4 flex items-center gap-3">
    <span className={`w-1.5 h-9 rounded-full shrink-0 ${TONE_BAR[tone] || TONE_BAR.blue}`} />
    <div className="min-w-0">
      <p className="text-[11px] text-slate-500 truncate">{label}</p>
      <p className="text-lg font-bold text-slate-900 tabular-nums leading-tight">
        {padTwo(value)}
      </p>
    </div>
  </div>
);

const CardHead = ({ title, subtitle, right }) => (
  <div className="p-5 pb-3 border-b border-slate-100 flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h3 className="font-semibold text-slate-900 text-[15px]">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {right}
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);

  const [range, setRange] = useState(14);
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canSeeOrders = can(userData, "orders");

  const load = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      try {
        const { data: stats } = await api.get("/admin/dashboard/stats", { params: { range } });
        setData(stats);
        setError("");
      } catch (err) {
        // Keep the last good state on a background refresh — no error flash.
        if (!isBackground) setError(errMsg(err, "Could not load the dashboard."));
      } finally {
        if (!isBackground) setLoading(false);
      }
    },
    [range]
  );

  const loadOrders = useCallback(async () => {
    if (!canSeeOrders) return;
    try {
      const { data: res } = await api.get("/admin/getallorders", { params: { page: 1, limit: 5 } });
      setOrders(res.orders || []);
    } catch {
      /* the dashboard still renders without this strip */
    }
  }, [canSeeOrders]);

  useEffect(() => {
    load();
    loadOrders();
  }, [load, loadOrders]);

  // Poll every 60s, keeping the last good state on failure.
  useEffect(() => {
    const timer = setInterval(() => {
      load(true);
      loadOrders();
    }, 60000);
    return () => clearInterval(timer);
  }, [load, loadOrders]);

  if (loading && !data) return <SectionLoader rows={8} />;
  if (error && !data) return <ErrorState message={error} onRetry={() => load()} />;
  if (!data) return null;

  const { kpis, sparklines, miniStats, revenueSummary } = data;
  const firstName = (userData?.name || "there").split(" ")[0];

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <span className="font-medium text-slate-700">{firstName}</span>.
          </p>
        </div>
        <span className="text-[12px] text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={FiDollarSign}
          tone="blue"
          label="Total Revenue"
          value={formatMoney(kpis.totalRevenue)}
          delta={kpis.revenueDelta}
          spark={sparklines.revenue}
          sparkColor="#2563eb"
        />
        <KpiCard
          icon={FiShoppingCart}
          tone="emerald"
          label="Orders"
          value={formatCompact(kpis.totalOrders)}
          delta={kpis.ordersDelta}
          spark={sparklines.orders}
          sparkColor="#059669"
        />
        <KpiCard
          icon={BsBoxSeam}
          tone="teal"
          label="Products"
          value={formatCompact(kpis.totalProducts)}
          delta={kpis.productsDelta}
          spark={sparklines.products}
          sparkColor="#0f766e"
        />
        <KpiCard
          icon={FiUsers}
          tone="amber"
          label="Active Customers"
          value={formatCompact(kpis.activeCustomers)}
          delta={kpis.customersDelta}
          spark={sparklines.customers}
          sparkColor="#d97706"
        />
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Featured Products" value={miniStats.featuredProducts} tone="blue" />
        <MiniStat label="Available Now" value={miniStats.availableNow} tone="emerald" />
        <MiniStat label="Low Stock Items" value={miniStats.lowStock} tone="amber" />
        <MiniStat label="Team Members" value={miniStats.teamMembers} tone="purple" />
      </div>

      {/* Revenue + top categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <CardHead
            title="Revenue Overview"
            subtitle={`Last ${range} days`}
            right={
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 shrink-0">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${
                      range === r
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {r}d
                  </button>
                ))}
              </div>
            }
          />
          <div className="p-5 pt-4">
            <RevenueChart data={data.revenueByDay} labels={data.revenueLabels} />
          </div>
          <div className="grid grid-cols-3 border-t border-slate-100">
            {[
              ["Total", formatMoney(revenueSummary.total)],
              ["Avg Order", formatMoney(revenueSummary.avgOrder)],
              ["Fulfillment", `${revenueSummary.completion}%`],
            ].map(([label, value], i) => (
              <div
                key={label}
                className={`px-5 py-3.5 ${i < 2 ? "border-r border-slate-100" : ""}`}
              >
                <p className="text-[11px] text-slate-500">{label}</p>
                <p className="text-[15px] font-semibold text-slate-900 tabular-nums mt-0.5">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <CardHead title="Top Categories" subtitle={`By revenue, last ${range} days`} />
          <div className="p-5 space-y-4">
            {data.topCategories.length === 0 ? (
              <p className="text-[13px] text-slate-400 text-center py-6">No category sales yet.</p>
            ) : (
              data.topCategories.map((c) => (
                <ProgressRow
                  key={c.name}
                  label={c.name}
                  value={c.value}
                  amount={formatMoney(c.sales)}
                  color={c.color}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Donut + bar + funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card">
          <CardHead title="Order Status" subtitle="This month" />
          <div className="p-5">
            <DonutChart data={data.orderStatus} />
            {data.orderStatus.length > 0 && <ChartLegend data={data.orderStatus} />}
          </div>
        </div>

        <div className="card">
          <CardHead title="Weekly Sales" subtitle="Revenue per day" />
          <div className="p-5">
            <BarChart data={data.weeklySales} valueFormatter={(v) => formatCompact(Math.round(v))} />
          </div>
        </div>

        <div className="card">
          <CardHead title="Fulfillment Pipeline" subtitle="All time, cumulative" />
          <div className="p-5">
            <FunnelChart data={data.fulfillmentFunnel} />
          </div>
        </div>
      </div>

      {/* Acquisition + payment methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <CardHead
            title="Customer Acquisition"
            subtitle="New vs returning buyers"
            right={
              <div className="flex items-center gap-3 text-[11px] shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" />
                  <span className="text-slate-600">New ({data.customerAcquisition.newTotal})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0F766E]" />
                  <span className="text-slate-600">
                    Returning ({data.customerAcquisition.returningTotal})
                  </span>
                </span>
              </div>
            }
          />
          <div className="p-5">
            <DualAreaChart
              newData={data.customerAcquisition.newCustomers}
              returningData={data.customerAcquisition.returningCustomers}
            />
            <p className="text-[12px] text-slate-500 mt-3">
              Retention rate:{" "}
              <span className="font-semibold text-slate-900">
                {data.customerAcquisition.retention}%
              </span>{" "}
              of orders in this window came from returning buyers.
            </p>
          </div>
        </div>

        <div className="card">
          <CardHead title="Payment Methods" subtitle="Share of revenue" />
          <div className="p-5 space-y-4">
            {data.paymentMethods.length === 0 ? (
              <p className="text-[13px] text-slate-400 text-center py-6">No payments recorded.</p>
            ) : (
              data.paymentMethods.map((m) => (
                <ProgressRow
                  key={m.name}
                  label={m.name}
                  value={m.value}
                  amount={formatMoney(m.amount)}
                  color={m.color}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Inventory health */}
      <div className="card">
        <CardHead
          title="Inventory Health"
          subtitle="Products closest to their reorder threshold"
          right={
            can(userData, "products") ? (
              <Link to="/admin/products?stock=low" className="btn-secondary shrink-0">
                View all
              </Link>
            ) : null
          }
        />
        <div className="p-5">
          <InventoryBars data={data.inventoryHealth} />
        </div>
      </div>

      {/* Recent orders */}
      {canSeeOrders && (
        <div className="card overflow-hidden">
          <CardHead
            title="Recent Orders"
            subtitle="The five most recent transactions"
            right={
              <Link to="/admin/orders" className="btn-secondary shrink-0">
                View all
              </Link>
            }
          />
          {orders.length === 0 ? (
            <p className="text-[13px] text-slate-400 text-center py-10">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className="th">Order</th>
                    <th className="th">Customer</th>
                    <th className="th">Date</th>
                    <th className="th text-right">Total</th>
                    <th className="th">Payment</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr
                      key={o._id}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                      onClick={() => navigate("/admin/orders")}
                    >
                      <td className="td font-mono text-[12px] text-slate-500">#{o.shortId}</td>
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={o.user?.name || o.shippingAddress?.name} size={28} />
                          <div className="min-w-0">
                            <p className="text-[13px] text-slate-900 truncate">
                              {o.user?.name || o.shippingAddress?.name || "Guest"}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {o.user?.email || o.shippingAddress?.email || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="td text-slate-500">{formatDate(o.createdAt)}</td>
                      <td className="td text-right font-medium text-slate-900 tabular-nums">
                        {formatMoney(o.total, o.currency)}
                      </td>
                      <td className="td">
                        <PaymentBadge status={o.paymentStatus} />
                      </td>
                      <td className="td">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Add New Product",
            hint: "Create a catalog entry",
            icon: FiPlus,
            to: "/admin/products",
            permission: "products",
          },
          {
            label: "Review Payments",
            hint: "Refunds and disputes",
            icon: FiCreditCard,
            to: "/admin/payments",
            permission: "payments",
          },
          {
            label: "Customer Reports",
            hint: "Export and analytics",
            icon: FiTrendingUp,
            to: "/admin/customers",
            permission: "customers",
          },
        ]
          .filter((a) => can(userData, a.permission))
          .map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.to}
                className="card card-hover p-5 group flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0">
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                    {action.label}
                  </p>
                  <p className="text-[12px] text-slate-500 truncate">{action.hint}</p>
                </div>
              </Link>
            );
          })}
      </div>

      <div className="flex items-center justify-center gap-2 pt-2 pb-1">
        <FiPackage size={13} className="text-slate-300" />
        <p className="text-[11px] text-slate-400">
          Figures refresh automatically every 60 seconds.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
