import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  FiEdit2,
  FiFilter,
  FiKey,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrash2,
  FiX,
  FiZap,
} from "react-icons/fi";
import axios from "axios";
import { serverUrl } from "../../App.jsx";
import useDebounced from "../../hooks/useDebounced.js";
import {
  Avatar,
  ConfirmModal,
  EmptyState,
  ErrorState,
  Modal,
  RoleBadge,
  SectionLoader,
  Spinner,
  Toggle,
  formatDate,
  relativeTime,
} from "../../components/ui.jsx";
import PasswordField, {
  RulesChecklist,
  generatePassword,
  isStrongPassword,
} from "../../components/PasswordField.jsx";

const ROLE_OPTIONS = [
  ["telecaller", "Telecaller"],
  ["sales", "Sales"],
];

const ROLE_FILTER_OPTIONS = [["all", "All roles"], ...ROLE_OPTIONS];

const STATUS_OPTIONS = [
  ["all", "All statuses"],
  ["active", "Active"],
  ["inactive", "Inactive"],
];

/** Sensible starting point for each role — the admin can still adjust every box. */
const DEFAULT_PERMISSIONS = {
  telecaller: ["customers", "orders"],
  sales: ["products", "orders"],
};

const PERMISSION_LABEL = {
  products: "Products",
  categories: "Categories",
  orders: "Orders",
  payments: "Payments",
  customers: "Customers",
  reports: "Reports",
};

const GENDER_OPTIONS = [
  ["", "Prefer not to say"],
  ["male", "Male"],
  ["female", "Female"],
  ["other", "Other"],
];

const emptyAddress = { street: "", city: "", state: "", zip: "", country: "" };

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "telecaller",
  gender: "",
  address: emptyAddress,
  permissions: DEFAULT_PERMISSIONS.telecaller,
  mustChangePassword: true,
};

const Employees = () => {
  const [rows, setRows] = useState([]);
  const [permissionKeys, setPermissionKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 400);
  const [filters, setFilters] = useState({ role: "all", status: "all" });
  const [showFilters, setShowFilters] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [statusTarget, setStatusTarget] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  /* --------------------------------------------------------------- loading */

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (filters.role !== "all") params.role = filters.role;
      if (filters.status !== "all") params.status = filters.status;

      const { data } = await axios.get(serverUrl + "/api/admin/employees", {
        params,
        withCredentials: true,
      });
      setRows(data.employees || []);
      setPermissionKeys(data.permissionKeys || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load employees.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      telecallers: rows.filter((r) => r.role === "telecaller").length,
      sales: rows.filter((r) => r.role === "sales").length,
      active: rows.filter((r) => r.isActive).length,
    }),
    [rows]
  );

  const activeFilterCount =
    Object.values(filters).filter((v) => v !== "all").length + (search.trim() ? 1 : 0);

  const resetFilters = () => {
    setFilters({ role: "all", status: "all" });
    setSearch("");
  };

  /* ---------------------------------------------------------------- modal */

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (employee) => {
    setEditing(employee);
    setForm({
      name: employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      password: "",
      role: employee.role,
      gender: employee.gender || "",
      address: { ...emptyAddress, ...(employee.address || {}) },
      permissions: employee.permissions || [],
      mustChangePassword: false,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFormErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const setAddressField = (key, value) => {
    setForm((f) => ({ ...f, address: { ...f.address, [key]: value } }));
  };

  const selectRole = (role) => {
    setForm((f) => ({
      ...f,
      role,
      // Only auto-suggest permissions while creating — never clobber a saved employee's setup.
      permissions: editing ? f.permissions : DEFAULT_PERMISSIONS[role] || [],
    }));
  };

  const togglePermission = (key) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Name is required.";
    if (!form.email.trim()) errors.email = "Email is required.";
    if (!editing && !isStrongPassword(form.password)) {
      errors.password = "Password does not meet the requirements below.";
    }
    setFormErrors(errors);
    const firstKey = Object.keys(errors)[0];
    if (firstKey) {
      toast.error(errors[firstKey]);
      return false;
    }
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      if (editing) {
        const { data } = await axios.put(
          serverUrl + `/api/admin/employees/${editing._id}`,
          {
            name: form.name.trim(),
            phone: form.phone.trim(),
            role: form.role,
            gender: form.gender,
            address: form.address,
            permissions: form.permissions,
          },
          { withCredentials: true }
        );
        toast.success(data.message || "Employee updated.");
      } else {
        const { data } = await axios.post(
          serverUrl + "/api/admin/employees",
          {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            password: form.password,
            role: form.role,
            gender: form.gender,
            address: form.address,
            permissions: form.permissions,
            mustChangePassword: form.mustChangePassword,
          },
          { withCredentials: true }
        );
        toast.success(data.message || "Employee created.");
      }
      setModalOpen(false);
      loadEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save this employee.");
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------------------------------------------- actions */

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    setStatusBusy(true);
    try {
      const nextActive = !statusTarget.isActive;
      const { data } = await axios.patch(
        serverUrl + `/api/admin/employees/${statusTarget._id}/status`,
        { isActive: nextActive },
        { withCredentials: true }
      );
      toast.success(data.message);
      setStatusTarget(null);
      loadEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not change this employee's status.");
    } finally {
      setStatusBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const { data } = await axios.delete(serverUrl + `/api/admin/employees/${deleteTarget._id}`, {
        withCredentials: true,
      });
      toast.success(data.message);
      setDeleteTarget(null);
      loadEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete this employee.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const openReset = (employee) => {
    setResetTarget(employee);
    setResetPassword(generatePassword());
  };

  const confirmReset = async () => {
    if (!resetTarget) return;
    if (!isStrongPassword(resetPassword)) {
      toast.error("That password does not meet the requirements below.");
      return;
    }
    setResetBusy(true);
    try {
      const { data } = await axios.post(
        serverUrl + `/api/admin/employees/${resetTarget._id}/reset-password`,
        { password: resetPassword, mustChangePassword: true },
        { withCredentials: true }
      );
      toast.success(data.message);
      setResetTarget(null);
      setResetPassword("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not reset this password.");
    } finally {
      setResetBusy(false);
    }
  };

  /* --------------------------------------------------------------- render */

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Employee Management</h1>
          <p className="page-subtitle">
            {stats.total} employee{stats.total === 1 ? "" : "s"} — Telecallers and Sales staff.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={loadEmployees} className="btn-secondary" title="Refresh">
            <FiRefreshCw size={14} />
          </button>
          <button type="button" onClick={openCreate} className="btn-primary">
            <FiPlus size={15} />
            New Employee
          </button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ["Total", stats.total, "text-slate-900"],
          ["Telecallers", stats.telecallers, "text-purple-600"],
          ["Sales", stats.sales, "text-emerald-600"],
          ["Active", stats.active, "text-indigo-600"],
        ].map(([label, value, tone]) => (
          <div key={label} className="card p-3.5">
            <p className="text-[11px] text-slate-500 truncate">{label}</p>
            <p className={`text-lg font-semibold tabular-nums mt-0.5 ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              className="input pl-9"
              placeholder="Search name, email or phone..."
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

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`btn-secondary ${showFilters ? "border-indigo-300 text-indigo-700" : ""}`}
          >
            <FiFilter size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ["role", "Role", ROLE_FILTER_OPTIONS],
              ["status", "Status", STATUS_OPTIONS],
            ].map(([key, label, options]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <select
                  className="input"
                  value={filters[key]}
                  onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                >
                  {options.map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="sm:col-span-2 flex items-center justify-end pt-1">
              <button type="button" onClick={resetFilters} className="btn-secondary">
                Reset filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <SectionLoader rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={loadEmployees} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FiShield}
            title="No employees match these filters"
            hint="Try clearing the search or filters, or add your first Telecaller or Sales teammate."
            action={
              <button type="button" onClick={openCreate} className="btn-primary">
                <FiPlus size={15} />
                New Employee
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/60">
                <tr>
                  <th className="th">Employee</th>
                  <th className="th">Role</th>
                  <th className="th">Permissions</th>
                  <th className="th">Status</th>
                  <th className="th">Last login</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.name} src={emp.avatar} size={36} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-slate-900 truncate max-w-[220px]">
                            {emp.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                            {emp.email}
                            {emp.phone && ` · ${emp.phone}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="td">
                      <RoleBadge role={emp.role} />
                    </td>
                    <td className="td">
                      {emp.permissions?.length ? (
                        <span className="text-[12px] text-slate-500">
                          {emp.permissions.map((p) => PERMISSION_LABEL[p] || p).join(", ")}
                        </span>
                      ) : (
                        <span className="text-[12px] text-slate-300">None</span>
                      )}
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2" title={emp.isActive ? "Deactivate" : "Activate"}>
                        <Toggle checked={emp.isActive} onChange={() => setStatusTarget(emp)} label="Active" />
                        <span className={`text-[12px] ${emp.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                          {emp.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="td text-slate-500 text-[12px]" title={formatDate(emp.lastLogin, true)}>
                      {relativeTime(emp.lastLogin)}
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(emp)}
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openReset(emp)}
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-colors"
                          title="Reset password"
                        >
                          <FiKey size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(emp)}
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                          title="Delete"
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
        )}
      </div>

      {/* Create / edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? "Edit employee" : "New employee"}
        subtitle={editing ? editing.name : "Add a Telecaller or Sales teammate."}
        size="md"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="employee-form" className="btn-primary" disabled={saving}>
              {saving && <Spinner size={14} />}
              {editing ? "Save changes" : "Create employee"}
            </button>
          </>
        }
      >
        <form id="employee-form" onSubmit={submit} noValidate className="p-5 space-y-4">
          <div>
            <label className="label">Full name *</label>
            <input
              className={`input ${formErrors.name ? "input-error" : ""}`}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Priya Nair"
            />
            {formErrors.name && <p className="text-[11px] text-red-600 mt-1">{formErrors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                className={`input ${formErrors.email ? "input-error" : ""}`}
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="employee@goboxly.com"
                disabled={Boolean(editing)}
              />
              {formErrors.email && <p className="text-[11px] text-red-600 mt-1">{formErrors.email}</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </div>
          </div>

          <div>
            <p className="label">Role *</p>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectRole(value)}
                  className={`px-3 py-2 rounded-lg border text-[13px] font-medium transition-colors ${
                    form.role === value
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Gender</label>
            <select
              className="input"
              value={form.gender}
              onChange={(e) => setField("gender", e.target.value)}
            >
              {GENDER_OPTIONS.map(([value, label]) => (
                <option key={value || "none"} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="label">Address</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="input sm:col-span-2"
                placeholder="Street"
                value={form.address.street}
                onChange={(e) => setAddressField("street", e.target.value)}
              />
              <input
                className="input"
                placeholder="City"
                value={form.address.city}
                onChange={(e) => setAddressField("city", e.target.value)}
              />
              <input
                className="input"
                placeholder="State"
                value={form.address.state}
                onChange={(e) => setAddressField("state", e.target.value)}
              />
              <input
                className="input"
                placeholder="ZIP / Postal code"
                value={form.address.zip}
                onChange={(e) => setAddressField("zip", e.target.value)}
              />
              <input
                className="input"
                placeholder="Country"
                value={form.address.country}
                onChange={(e) => setAddressField("country", e.target.value)}
              />
            </div>
          </div>

          {!editing && (
            <div>
              <div className="flex items-center justify-between">
                <label className="label">Temporary password *</label>
                <button
                  type="button"
                  onClick={() => setField("password", generatePassword())}
                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <FiZap size={12} />
                  Generate
                </button>
              </div>
              <PasswordField
                value={form.password}
                onChange={(v) => setField("password", v)}
                error={formErrors.password}
                placeholder="Enter a temporary password"
              />
              <RulesChecklist value={form.password} />
              {formErrors.password && (
                <p className="text-[11px] text-red-600 mt-1">{formErrors.password}</p>
              )}

              <label className="flex items-center gap-2.5 cursor-pointer mt-3">
                <Toggle
                  checked={form.mustChangePassword}
                  onChange={(v) => setField("mustChangePassword", v)}
                  label="Require password change on first sign-in"
                />
                <span className="text-[13px] text-slate-700">
                  Require a password change on first sign-in
                </span>
              </label>
            </div>
          )}

          <div className="pt-1">
            <p className="label">Permissions</p>
            <p className="text-[11px] text-slate-400 mb-2">
              What this employee can access beyond their role's defaults.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {permissionKeys.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-[13px] text-slate-600 cursor-pointer border border-slate-200 rounded-lg px-3 py-2 hover:border-slate-300 transition-colors"
                >
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                    checked={form.permissions.includes(key)}
                    onChange={() => togglePermission(key)}
                  />
                  {PERMISSION_LABEL[key] || key}
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Reset password modal */}
      <Modal
        open={Boolean(resetTarget)}
        onClose={() => !resetBusy && setResetTarget(null)}
        title="Reset password"
        subtitle={resetTarget?.name}
        size="sm"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setResetTarget(null)} disabled={resetBusy}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={confirmReset} disabled={resetBusy}>
              {resetBusy && <Spinner size={14} />}
              Reset password
            </button>
          </>
        }
      >
        <div className="p-5 space-y-3">
          <p className="text-[13px] text-slate-600">
            This signs {resetTarget?.name} out everywhere and requires them to sign in again with
            the new password.
          </p>
          <div className="flex items-center justify-between">
            <label className="label">New password</label>
            <button
              type="button"
              onClick={() => setResetPassword(generatePassword())}
              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <FiZap size={12} />
              Generate
            </button>
          </div>
          <PasswordField value={resetPassword} onChange={setResetPassword} />
          <RulesChecklist value={resetPassword} />
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={confirmStatusChange}
        busy={statusBusy}
        tone={statusTarget?.isActive ? "danger" : "info"}
        title={statusTarget?.isActive ? "Deactivate employee" : "Activate employee"}
        confirmLabel={statusTarget?.isActive ? "Deactivate" : "Activate"}
        message={
          statusTarget?.isActive
            ? `"${statusTarget?.name}" will be signed out everywhere and unable to sign back in until reactivated.`
            : `"${statusTarget?.name}" will be able to sign in again.`
        }
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        busy={deleteBusy}
        title="Delete employee"
        confirmLabel="Delete"
        message={`"${deleteTarget?.name}" will be permanently removed. This cannot be undone.`}
      />
    </div>
  );
};

export default Employees;
