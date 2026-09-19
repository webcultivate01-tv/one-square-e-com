import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FiRefreshCw, FiSearch, FiShoppingCart, FiX } from "react-icons/fi";
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
import LeadDetailDrawer from "../../components/LeadDetailDrawer.jsx";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "cancelled", label: "Cancelled" },
];

const Orders = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [openId, setOpenId] = useState(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 350);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 12 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(serverUrl + "/api/order-request/getall", {
        params: { search: debouncedSearch || undefined, status: status || undefined, page, limit: 12 },
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
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const changeStatus = async (request, nextStatus) => {
    setBusyId(request._id);
    try {
      const { data } = await axios.put(
        serverUrl + `/api/order-request/status/${request._id}`,
        { status: nextStatus },
        { withCredentials: true }
      );
      toast.success(data.message || "Status updated.");
      setRequests((prev) => prev.map((r) => (r._id === request._id ? data.request : r)));
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update the status.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Order Management</h1>
          <p className="page-subtitle">
            {pagination.total} Buy Now request{pagination.total === 1 ? "" : "s"} from the storefront.
          </p>
        </div>
        <button type="button" onClick={load} className="btn-secondary" title="Refresh">
          <FiRefreshCw size={14} />
        </button>
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
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((o) => (
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
            title="No Buy Now requests yet"
            hint="Requests submitted from the storefront's Buy Now popup will show up here."
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
                    <th className="th">Received</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((r) => (
                    <tr
                      key={r._id}
                      onClick={() => setOpenId(r._id)}
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
                        {formatDate(r.createdAt, true)}
                      </td>
                      <td className="td">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="td" onClick={(ev) => ev.stopPropagation()}>
                        <select
                          className="input !w-auto !py-1.5 !text-[12px]"
                          value={r.status}
                          disabled={busyId === r._id}
                          onChange={(e) => changeStatus(r, e.target.value)}
                        >
                          {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
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

      <LeadDetailDrawer
        kind="order_request"
        lead={requests.find((x) => x._id === openId) || null}
        statusOptions={STATUS_OPTIONS.filter((o) => o.value)}
        onClose={() => setOpenId(null)}
        onChange={(next) => setRequests((prev) => prev.map((x) => (x._id === next._id ? { ...x, ...next } : x)))}
      />
    </div>
  );
};

export default Orders;
