import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FiMail, FiRefreshCw, FiSearch, FiTrash2, FiX } from "react-icons/fi";
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
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "spam", label: "Spam" },
];

const Enquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
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
      const { data } = await axios.get(serverUrl + "/api/contact/getall", {
        params: { search: debouncedSearch || undefined, status: status || undefined, page, limit: 12 },
        withCredentials: true,
      });
      setEnquiries(data.enquiries || []);
      setPagination({ page: data.page, pages: data.pages, total: data.total, limit: 12 });
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load enquiries.");
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

  const changeStatus = async (enquiry, nextStatus) => {
    setBusyId(enquiry._id);
    try {
      const { data } = await axios.put(
        serverUrl + `/api/contact/status/${enquiry._id}`,
        { status: nextStatus },
        { withCredentials: true }
      );
      toast.success(data.message || "Status updated.");
      setEnquiries((prev) => prev.map((e) => (e._id === enquiry._id ? data.enquiry : e)));
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update the status.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (enquiry) => {
    if (!window.confirm(`Delete the enquiry from ${enquiry.name}?`)) return;
    setBusyId(enquiry._id);
    try {
      const { data } = await axios.delete(serverUrl + `/api/contact/${enquiry._id}`, {
        withCredentials: true,
      });
      toast.success(data.message || "Enquiry deleted.");
      setEnquiries((prev) => prev.filter((e) => e._id !== enquiry._id));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete the enquiry.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Enquiry Management</h1>
          <p className="page-subtitle">
            {pagination.total} enquir{pagination.total === 1 ? "y" : "ies"} from the Contact page.
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
            placeholder="Search by name, email, phone, subject..."
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
        ) : enquiries.length === 0 ? (
          <EmptyState
            icon={FiMail}
            title="No enquiries yet"
            hint="Messages submitted from the storefront's Contact page will show up here."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className="th">Customer</th>
                    <th className="th">Subject</th>
                    <th className="th">Message</th>
                    <th className="th">Received</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enquiries.map((e) => (
                    <tr
                      key={e._id}
                      onClick={() => setOpenId(e._id)}
                      className="hover:bg-slate-50/60 transition-colors align-top cursor-pointer"
                    >
                      <td className="td">
                        <p className="text-[13px] font-medium text-slate-800">{e.name}</p>
                        <p className="text-[12px] text-slate-500">{e.email}</p>
                        <p className="text-[12px] text-slate-500">{e.phone}</p>
                      </td>
                      <td className="td max-w-[180px]">
                        <p className="text-[12.5px] text-slate-700 truncate">{e.subject}</p>
                      </td>
                      <td className="td max-w-[260px]">
                        {e.message ? (
                          <p className="text-[12.5px] text-slate-600 whitespace-pre-wrap">{e.message}</p>
                        ) : (
                          <p className="text-[12px] text-slate-400 italic">No message</p>
                        )}
                      </td>
                      <td className="td text-[12.5px] text-slate-500 whitespace-nowrap">
                        {formatDate(e.createdAt, true)}
                      </td>
                      <td className="td">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="td" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <select
                            className="input !w-auto !py-1.5 !text-[12px]"
                            value={e.status}
                            disabled={busyId === e._id}
                            onChange={(ev) => changeStatus(e, ev.target.value)}
                          >
                            {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => remove(e)}
                            disabled={busyId === e._id}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0 disabled:opacity-50"
                            title="Delete enquiry"
                          >
                            <FiTrash2 size={14} />
                          </button>
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
              label="enquiries"
            />
          </>
        )}
      </div>

      <LeadDetailDrawer
        kind="enquiry"
        lead={enquiries.find((x) => x._id === openId) || null}
        statusOptions={STATUS_OPTIONS.filter((o) => o.value)}
        onClose={() => setOpenId(null)}
        onChange={(next) => setEnquiries((prev) => prev.map((x) => (x._id === next._id ? { ...x, ...next } : x)))}
      />
    </div>
  );
};

export default Enquiries;
