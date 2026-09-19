import { useCallback, useEffect, useMemo, useState } from "react";
import { FiDownload, FiFileText, FiPlay, FiRefreshCw, FiRotateCcw } from "react-icons/fi";
import axios from "axios";
import { toast } from "react-toastify";
import { serverUrl } from "../../App.jsx";
import { EmptyState, ErrorState, Spinner } from "../../components/ui.jsx";

const opts = (...pairs) => pairs.map(([value, label]) => ({ value, label }));

const ORDER_STATUSES = opts(
  ["pending", "Pending"],
  ["contacted", "Contacted"],
  ["converted", "Confirmed"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["spam", "Spam"],
  ["not_interested", "Not interested"]
);

/** Filter fields per report. `date` filters (from / to) are shared and always shown. */
const FILTERS = {
  orders: [
    { key: "status", label: "Status", type: "select", options: ORDER_STATUSES },
    { key: "product", label: "Product name", type: "text" },
    { key: "search", label: "Customer / phone / email", type: "text" },
  ],
  sales: [
    { key: "paymentStatus", label: "Payment", type: "select", options: opts(["paid", "Paid in full"], ["advance_paid", "Advance paid"]) },
    {
      key: "paymentMethod",
      label: "Method",
      type: "select",
      options: opts(["cash", "Cash"], ["upi", "UPI"], ["card", "Card"], ["bank_transfer", "Bank transfer"], ["cheque", "Cheque"]),
    },
    { key: "minAmount", label: "Min total (₹)", type: "number" },
    { key: "maxAmount", label: "Max total (₹)", type: "number" },
    { key: "search", label: "Customer / invoice", type: "text" },
  ],
  products: [
    { key: "category", label: "Category", type: "select", options: "categories" },
    { key: "status", label: "Status", type: "select", options: opts(["active", "Active"], ["draft", "Draft"], ["out_of_stock", "Out of stock"], ["archived", "Archived"]) },
    { key: "stock", label: "Stock level", type: "select", options: opts(["in", "In stock"], ["low", "Low stock"], ["out", "Out of stock"]) },
    { key: "published", label: "Published", type: "select", options: opts(["yes", "Published"], ["no", "Unpublished"]) },
    { key: "minPrice", label: "Min price (₹)", type: "number" },
    { key: "maxPrice", label: "Max price (₹)", type: "number" },
    { key: "search", label: "Name / SKU / brand", type: "text" },
  ],
  customers: [
    { key: "type", label: "Type", type: "select", options: opts(["customers", "Buyers (ordered)"], ["inquiries", "Inquiry only"]) },
    { key: "minSpent", label: "Min spent (₹)", type: "number" },
    { key: "minOrders", label: "Min orders", type: "number" },
    { key: "search", label: "Name / phone / email", type: "text" },
  ],
  enquiries: [
    { key: "status", label: "Status", type: "select", options: opts(["new", "New"], ["in_progress", "In progress"], ["resolved", "Resolved"], ["spam", "Spam"]) },
    { key: "search", label: "Name / subject / message", type: "text" },
  ],
};

const DATE_LABEL = {
  customers: "Last active",
  products: "Created",
};

const FORMATS = [
  { value: "xlsx", label: "Excel" },
  { value: "csv", label: "CSV" },
  { value: "pdf", label: "PDF" },
];

const toParams = (filters) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v != null));

const isoDay = (d) => d.toISOString().slice(0, 10);
const PRESETS = [
  { label: "Today", range: () => [isoDay(new Date()), isoDay(new Date())] },
  { label: "Last 7 days", range: () => [isoDay(new Date(Date.now() - 6 * 864e5)), isoDay(new Date())] },
  { label: "Last 30 days", range: () => [isoDay(new Date(Date.now() - 29 * 864e5)), isoDay(new Date())] },
  {
    label: "This month",
    range: () => {
      const n = new Date();
      return [isoDay(new Date(n.getFullYear(), n.getMonth(), 1)), isoDay(n)];
    },
  },
];

const Reports = () => {
  const [available, setAvailable] = useState(null);
  const [type, setType] = useState("");
  const [filters, setFilters] = useState({});
  const [categories, setCategories] = useState([]);

  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  const loadAvailable = useCallback(async () => {
    try {
      const { data } = await axios.get(serverUrl + "/api/admin/reports", { withCredentials: true });
      setAvailable(data.reports || []);
      setType((t) => t || data.reports?.[0]?.key || "");
      setLoadError("");
    } catch (err) {
      setLoadError(err.response?.data?.message || "Could not load reports.");
    }
  }, []);

  useEffect(() => {
    loadAvailable();
    axios
      .get(serverUrl + "/api/category/getall", { withCredentials: true })
      .then(({ data }) => setCategories(data.categories || []))
      .catch(() => {});
  }, [loadAvailable]);

  // A different report has different filters — start clean.
  useEffect(() => {
    setFilters({});
    setResult(null);
    setError("");
  }, [type]);

  const fields = FILTERS[type] || [];
  const set = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const activeCount = useMemo(() => Object.values(filters).filter((v) => v !== "" && v != null).length, [filters]);

  const run = async () => {
    setRunning(true);
    setError("");
    try {
      const { data } = await axios.get(serverUrl + `/api/admin/reports/${type}`, {
        params: { ...toParams(filters), format: "json" },
        withCredentials: true,
      });
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err.response?.data?.message || "Could not generate the report.");
    } finally {
      setRunning(false);
    }
  };

  const download = async (format) => {
    setDownloading(format);
    try {
      const res = await axios.get(serverUrl + `/api/admin/reports/${type}`, {
        params: { ...toParams(filters), format },
        withCredentials: true,
        responseType: "blob",
      });
      const name = /filename="([^"]+)"/.exec(res.headers["content-disposition"] || "")?.[1] || `report.${format}`;
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Errors arrive as a Blob because of responseType.
      let message = "Download failed.";
      try {
        message = JSON.parse(await err.response.data.text()).message || message;
      } catch {
        /* keep default */
      }
      toast.error(message);
    } finally {
      setDownloading("");
    }
  };

  if (loadError) return <ErrorState message={loadError} onRetry={loadAvailable} />;
  if (!available) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={24} />
      </div>
    );
  }
  if (!available.length) {
    return <EmptyState icon={FiFileText} title="No reports available" hint="Your account has no modules that can be reported on." />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Pick a report, narrow it with filters, preview it, then download.</p>
      </div>

      {/* Report picker */}
      <div className="flex flex-wrap gap-2">
        {available.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setType(r.key)}
            className={`px-3.5 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
              type === r.key
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {r.title}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold text-slate-800">
            Filters{activeCount > 0 && <span className="ml-2 text-blue-600 font-medium">{activeCount} active</span>}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="text-[12px] px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
                onClick={() => {
                  const [from, to] = p.range();
                  setFilters((f) => ({ ...f, from, to }));
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="label">{DATE_LABEL[type] || "Date"} from</label>
            <input type="date" className="input" value={filters.from || ""} max={filters.to || undefined} onChange={(e) => set("from", e.target.value)} />
          </div>
          <div>
            <label className="label">{DATE_LABEL[type] || "Date"} to</label>
            <input type="date" className="input" value={filters.to || ""} min={filters.from || undefined} onChange={(e) => set("to", e.target.value)} />
          </div>

          {fields.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              {f.type === "select" ? (
                <select className="input" value={filters[f.key] || ""} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">All</option>
                  {(f.options === "categories"
                    ? categories.map((c) => ({ value: c._id, label: c.name }))
                    : f.options
                  ).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === "number" ? "number" : "text"}
                  min={f.type === "number" ? 0 : undefined}
                  className="input"
                  value={filters[f.key] || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          <button type="button" className="btn-primary" onClick={run} disabled={running}>
            {running ? <Spinner size={14} /> : <FiPlay size={14} />} Generate report
          </button>
          <button type="button" className="btn-secondary" onClick={() => setFilters({})} disabled={!activeCount}>
            <FiRotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={run} />}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {result.summary.map((s) => (
              <div key={s.label} className="card p-4">
                <p className="text-[12px] text-slate-500">{s.label}</p>
                <p className="text-[17px] font-semibold text-slate-900 mt-1 break-words">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100">
              <div>
                <p className="text-[14px] font-semibold text-slate-900">
                  {result.title} · {result.total} record{result.total === 1 ? "" : "s"}
                </p>
                <p className="text-[12px] text-slate-500 mt-0.5">{result.filters || "No filters applied"}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="btn-secondary" onClick={run} disabled={running} title="Refresh">
                  <FiRefreshCw size={14} />
                </button>
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    className="btn-secondary"
                    disabled={!result.total || Boolean(downloading)}
                    onClick={() => download(f.value)}
                  >
                    {downloading === f.value ? <Spinner size={14} /> : <FiDownload size={14} />} {f.label}
                  </button>
                ))}
              </div>
            </div>

            {result.total === 0 ? (
              <EmptyState icon={FiFileText} title="No records match these filters" hint="Widen the date range or clear a filter." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-slate-50 text-left text-slate-500">
                        {result.columns.map((c) => (
                          <th key={c.key} className="px-4 py-2.5 font-medium whitespace-nowrap">
                            {c.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((r, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          {result.columns.map((c) => (
                            <td key={c.key} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                              {String(r[c.key] ?? "") || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {result.truncated && (
                  <p className="px-4 py-3 text-[12px] text-slate-500 border-t border-slate-100">
                    Showing the first {result.rows.length} of {result.total} records. Downloads include all {result.total}.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {!result && !error && !running && (
        <div className="card">
          <EmptyState icon={FiFileText} title="Nothing generated yet" hint="Choose your filters and press Generate report." />
        </div>
      )}
    </div>
  );
};

export default Reports;
