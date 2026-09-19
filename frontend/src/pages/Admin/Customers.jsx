import { useCallback, useEffect, useState } from "react";
import { FiRefreshCw, FiSearch, FiShoppingBag, FiUsers, FiX } from "react-icons/fi";
import axios from "axios";
import { serverUrl } from "../../App.jsx";
import useDebounced from "../../hooks/useDebounced.js";
import {
  Avatar,
  EmptyState,
  ErrorState,
  Pagination,
  SectionLoader,
  formatDate,
  formatMoney,
} from "../../components/ui.jsx";

const VIEWS = [
  { value: "customers", label: "Customers", hint: "Have placed an order" },
  { value: "inquiries", label: "Inquired only", hint: "Filled a form, not ordered yet" },
  { value: "all", label: "All contacts", hint: "Everyone, buyers first" },
];

const SORTS = [
  { value: "recent", label: "Most recent activity" },
  { value: "oldest", label: "Oldest first" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "top_spender", label: "Top spender" },
  { value: "most_orders", label: "Most orders" },
  { value: "last_order", label: "Latest order" },
];

const LIMIT = 15;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [counts, setCounts] = useState({ customers: 0, inquiries: 0, all: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [view, setView] = useState("customers");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 350);
  const [sort, setSort] = useState("recent");
  const [minSpent, setMinSpent] = useState("");
  const debouncedMin = useDebounced(minSpent, 350);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(serverUrl + "/api/admin/customers/directory", {
        params: {
          view,
          sort,
          search: debouncedSearch || undefined,
          minSpent: debouncedMin || undefined,
          page,
          limit: LIMIT,
        },
        withCredentials: true,
      });
      setCustomers(data.customers || []);
      setCounts(data.counts || { customers: 0, inquiries: 0, all: 0 });
      setPagination({ page: data.page, pages: data.pages, total: data.total });
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load customers.");
    } finally {
      setLoading(false);
    }
  }, [view, sort, debouncedSearch, debouncedMin, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [view, sort, debouncedSearch, debouncedMin]);

  const filtersActive = search || minSpent || sort !== "recent";
  const clearFilters = () => {
    setSearch("");
    setMinSpent("");
    setSort("recent");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Customer Management</h1>
          <p className="page-subtitle">
            {counts.customers} customer{counts.customers === 1 ? "" : "s"} · {counts.inquiries} inquired without
            ordering.
          </p>
        </div>
        <button type="button" onClick={load} className="btn-secondary" title="Refresh">
          <FiRefreshCw size={14} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.value}
            type="button"
            onClick={() => setView(v.value)}
            title={v.hint}
            className={`px-3.5 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
              view === v.value
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {v.label}
            <span className={`ml-2 text-[11px] tabular-nums ${view === v.value ? "text-slate-300" : "text-slate-400"}`}>
              {counts[v.value]}
            </span>
          </button>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            className="input pl-9"
            placeholder="Search name, phone, email, product..."
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
        <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          className="input !w-36"
          placeholder="Min spent"
          value={minSpent}
          onChange={(e) => setMinSpent(e.target.value)}
        />
        {filtersActive && (
          <button type="button" onClick={clearFilters} className="btn-secondary">
            Clear
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <SectionLoader rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={FiUsers}
            title={view === "customers" ? "No customers yet" : "No contacts found"}
            hint={
              view === "customers"
                ? "People appear here once an order is confirmed for them. Check “Inquired only” for people who haven't ordered."
                : "Try a different search or filter."
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className="th">Customer</th>
                    <th className="th">Contact</th>
                    <th className="th">Orders</th>
                    <th className="th">Total spent</th>
                    <th className="th">Inquiries</th>
                    <th className="th">Products</th>
                    <th className="th">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr
                      key={c._id}
                      className={`align-top transition-colors ${
                        c.hasOrdered ? "bg-emerald-50/50 hover:bg-emerald-50" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} size={34} />
                          <div className="min-w-0">
                            <p
                              className={`text-[13px] ${
                                c.hasOrdered ? "font-semibold text-emerald-800" : "font-medium text-slate-800"
                              }`}
                            >
                              {c.name}
                            </p>
                            {c.hasOrdered ? (
                              <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10.5px] font-medium">
                                <FiShoppingBag size={10} /> Ordered
                              </span>
                            ) : (
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10.5px] font-medium">
                                Inquired only
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="td">
                        <p className="text-[12.5px] text-slate-700">{c.phone || "—"}</p>
                        <p className="text-[12px] text-slate-500">{c.email || "—"}</p>
                      </td>
                      <td className="td text-[13px] tabular-nums">{c.totalOrders}</td>
                      <td className="td text-[13px] tabular-nums font-medium">
                        {c.hasOrdered ? formatMoney(c.totalSpent) : "—"}
                      </td>
                      <td className="td text-[12px] text-slate-600 whitespace-nowrap">
                        {c.productRequests} product form{c.productRequests === 1 ? "" : "s"}
                        <br />
                        {c.enquiries} contact message{c.enquiries === 1 ? "" : "s"}
                      </td>
                      <td className="td max-w-[200px]">
                        <p className="text-[12px] text-slate-600 line-clamp-2">{c.products.join(", ") || "—"}</p>
                      </td>
                      <td className="td text-[12.5px] text-slate-500 whitespace-nowrap">
                        {formatDate(c.lastActivityAt, true)}
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
              limit={LIMIT}
              onChange={setPage}
              label="contacts"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Customers;
