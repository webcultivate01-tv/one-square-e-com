import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiRefreshCw, FiSearch, FiShoppingCart, FiSlash, FiThumbsDown, FiX } from "react-icons/fi";
import axios from "axios";
import { serverUrl } from "../../App.jsx";
import useDebounced from "../../hooks/useDebounced.js";
import {
  EmptyState,
  ErrorState,
  Pagination,
  SectionLoader,
  StatusBadge,
  formatDate,
} from "../../components/ui.jsx";
import { ORDER_STATUS_OPTIONS, allowedStatusOptions } from "../../utils/orderStatus.js";

const TABS = [
  { value: "pending", label: "Pending", empty: "No pending requests", hint: "New Buy Now requests waiting for a call show up here." },
  { value: "follow_up", label: "Follow-up", empty: "No follow-ups scheduled", hint: "Requests with a next follow-up date show up here, soonest first." },
  { value: "confirmed", label: "Confirmed", empty: "No confirmed orders", hint: "Orders confirmed after a call show up here until they're completed." },
  { value: "completed", label: "Completed", empty: "No completed orders", hint: "Confirmed orders that have been delivered show up here." },
  { value: "cancelled", label: "Cancelled", empty: "No cancelled orders", hint: "Cancelled requests are listed here." },
  { value: "not_interested", label: "Not interested", empty: "Nobody marked as not interested", hint: "Customers who declined after follow-ups are listed here." },
  { value: "spam", label: "Spam", empty: "No spam requests", hint: "Requests marked as spam or filled by mistake are listed here." },
  { value: "all", label: "All", empty: "No requests", hint: "Every Buy Now request, whatever its status." },
];

// Statuses that already ended the conversation — no Spam / Not interested shortcuts.
const CLOSED = ["converted", "completed", "cancelled", "spam", "not_interested"];

const Orders = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 350);
  const [view, setView] = useState("pending");
  const [status, setStatus] = useState(""); // filter dropdown; only applies on the "All" tab
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 12 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(serverUrl + "/api/order-request/getall", {
        params: { search: debouncedSearch || undefined, view, status: view === "all" ? status || undefined : undefined, page, limit: 12 },
        withCredentials: true,
      });
      setRequests(data.requests || []);
      setPagination({ page: data.page, pages: data.pages, total: data.total, limit: 12 });
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load Buy Now requests.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, view, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, view, status]);

  const changeStatus = async (request, nextStatus) => {
    setBusyId(request._id);
    try {
      const { data } = await axios.put(
        serverUrl + `/api/order-request/status/${request._id}`,
        { status: nextStatus },
        { withCredentials: true }
      );
      toast.success(data.message || "Status updated.");
      // The request usually belongs to a different tab now, so reload instead of patching the row.
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update the status.");
    } finally {
      setBusyId(null);
    }
  };

  const markAs = (request, nextStatus, question) => {
    if (window.confirm(question)) changeStatus(request, nextStatus);
  };

  const activeTab = TABS.find((t) => t.value === view);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Order Management</h1>
          <p className="page-subtitle">
            {pagination.total} Buy Now request{pagination.total === 1 ? "" : "s"} in {activeTab.label.toLowerCase()}.
          </p>
        </div>
        <button type="button" onClick={load} className="btn-secondary" title="Refresh">
          <FiRefreshCw size={14} />
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setView(t.value);
              setStatus("");
            }}
            className={`px-3.5 py-2 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              view === t.value
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            className="input pl-9"
            placeholder="Search by name, email, phone, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <FiX size={14} />
            </button>
          )}
        </div>
        <select
          className="input !w-auto"
          value={view === "all" ? status : ""}
          onChange={(e) => {
            setView("all");
            setStatus(e.target.value);
          }}
        >
          <option value="">Filter by status</option>
          {ORDER_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <SectionLoader rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={FiShoppingCart}
            title={activeTab.empty}
            hint={activeTab.hint}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className="th">Product</th>
                    <th className="th">Customer</th>
                    <th className="th">Address</th>
                    <th className="th">{view === "follow_up" ? "Follow up on" : "Received"}</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((r) => (
                    <tr
                      key={r._id}
                      onClick={() => navigate(`/${pathname.split("/")[1]}/orders/${r._id}`, { state: { lead: r } })}
                      className="hover:bg-slate-50/60 transition-colors align-top cursor-pointer"
                    >
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          {r.product?.images?.[0] ? (
                            <img
                              src={r.product.images[0]}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="w-9 h-9 rounded-lg object-cover bg-slate-100 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-300 flex items-center justify-center shrink-0">
                              <FiShoppingCart size={14} />
                            </div>
                          )}
                          <div>
                            <p className="text-[13px] font-medium text-slate-900 max-w-[180px] truncate">
                              {r.productName}
                            </p>
                            <p className="text-[11.5px] text-slate-500">Qty: {r.quantity}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td">
                        <p className="text-[13px] font-medium text-slate-800">{r.name}</p>
                        <p className="text-[12px] text-slate-500">{r.email}</p>
                        <p className="text-[12px] text-slate-500">{r.phone}</p>
                      </td>
                      <td className="td max-w-[240px]">
                        <p className="text-[12.5px] text-slate-600 whitespace-pre-wrap">{r.address}</p>
                        {r.message && (
                          <p className="text-[11.5px] text-slate-400 mt-1 whitespace-pre-wrap">"{r.message}"</p>
                        )}
                      </td>
                      <td className="td text-[12.5px] text-slate-500 whitespace-nowrap">
                        {formatDate(view === "follow_up" ? r.nextFollowUpAt : r.createdAt, true)}
                      </td>
                      <td className="td">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="td" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {!CLOSED.includes(r.status) && (
                            <>
                              <button
                                type="button"
                                className="btn-secondary !py-1.5 !text-[12px]"
                                disabled={busyId === r._id}
                                onClick={() => markAs(r, "spam", "Mark this customer as spam?")}
                              >
                                <FiSlash size={13} /> Spam
                              </button>
                              <button
                                type="button"
                                className="btn-secondary !py-1.5 !text-[12px]"
                                disabled={busyId === r._id}
                                onClick={() => markAs(r, "not_interested", "Mark this customer as not interested?")}
                              >
                                <FiThumbsDown size={13} /> Not interested
                              </button>
                            </>
                          )}
                          <select
                            className="input !w-auto !py-1.5 !text-[12px]"
                            value={r.status}
                            disabled={busyId === r._id}
                            onChange={(e) => changeStatus(r, e.target.value)}
                          >
                            {allowedStatusOptions(r.status).map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={pagination.page}
              pages={pagination.pages}
              total={pagination.total}
              limit={pagination.limit}
              onChange={setPage}
              label="requests"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Orders;
