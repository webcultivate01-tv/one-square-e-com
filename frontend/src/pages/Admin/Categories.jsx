import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  FiChevronDown,
  FiChevronRight,
  FiEdit2,
  FiFolder,
  FiFolderPlus,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTag,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import axios from "axios";
import { serverUrl } from "../../App.jsx";
import useDebounced from "../../hooks/useDebounced.js";
import {
  ConfirmModal,
  EmptyState,
  ErrorState,
  Modal,
  SectionLoader,
  Spinner,
  Toggle,
} from "../../components/ui.jsx";

const emptyForm = {
  name: "",
  parentId: "",
  isActive: true,
};

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [collapsed, setCollapsed] = useState(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [existingImage, setExistingImage] = useState("");
  const [newFile, setNewFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [forceDelete, setForceDelete] = useState(null); // { target, message }

  /* --------------------------------------------------------------- loading */

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(serverUrl + "/api/category/getall", {
        withCredentials: true,
      });
      setCategories(data.categories || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  /* ------------------------------------------------------------------ tree */

  const topLevel = useMemo(
    () => categories.filter((c) => !c.parentId).sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );

  const childrenOf = useMemo(() => {
    const map = new Map();
    for (const c of categories) {
      if (!c.parentId) continue;
      const list = map.get(String(c.parentId)) || [];
      list.push(c);
      map.set(String(c.parentId), list);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [categories]);

  const matchesSearch = useCallback(
    (c) => !debouncedSearch.trim() || c.name.toLowerCase().includes(debouncedSearch.trim().toLowerCase()),
    [debouncedSearch]
  );

  /** Rows shown = top-level category, then its children, filtered by search
   * (a parent stays visible if it or any of its children match). */
  const rows = useMemo(() => {
    const out = [];
    for (const parent of topLevel) {
      const kids = childrenOf.get(String(parent.id)) || [];
      const parentMatches = matchesSearch(parent);
      const matchingKids = kids.filter(matchesSearch);
      if (!parentMatches && matchingKids.length === 0) continue;

      out.push({ ...parent, depth: 0, hasChildren: kids.length > 0 });
      if (!collapsed.has(parent.id)) {
        const list = debouncedSearch.trim() ? matchingKids : kids;
        for (const kid of list) out.push({ ...kid, depth: 1, hasChildren: false });
      }
    }
    return out;
  }, [topLevel, childrenOf, collapsed, matchesSearch, debouncedSearch]);

  const toggleCollapsed = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ---------------------------------------------------------------- modal */

  const openCreate = (parentId = "") => {
    setEditing(null);
    setForm({ ...emptyForm, parentId });
    setFormErrors({});
    setExistingImage("");
    setNewFile(null);
    setModalOpen(true);
  };

  const openEdit = (category) => {
    setEditing(category);
    setForm({
      name: category.name || "",
      parentId: category.parentId || "",
      isActive: category.isActive !== false,
    });
    setFormErrors({});
    setExistingImage(category.image || "");
    setNewFile(null);
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

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Category name is required.";
    if (!newFile && !existingImage) errors.image = "Category image is required.";
    setFormErrors(errors);
    if (errors.name || errors.image) toast.error(errors.name || errors.image);
    return Object.keys(errors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    const fd = new FormData();
    fd.append("name", form.name.trim());
    fd.append("parentId", form.parentId || "");
    fd.append("isActive", String(form.isActive));
    if (newFile) fd.append("image", newFile);
    else fd.append("imageUrl", existingImage);

    try {
      if (editing) {
        const { data } = await axios.put(serverUrl + `/api/category/update/${editing._id}`, fd, {
          withCredentials: true,
        });
        toast.success(data.message || "Category updated.");
      } else {
        const { data } = await axios.post(serverUrl + "/api/category/create", fd, {
          withCredentials: true,
        });
        toast.success(data.message || "Category created.");
      }
      setModalOpen(false);
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save the category.");
    } finally {
      setSaving(false);
    }
  };

  const quickToggleActive = async (category) => {
    try {
      const fd = new FormData();
      fd.append("isActive", String(!category.isActive));
      const { data } = await axios.put(serverUrl + `/api/category/update/${category._id}`, fd, {
        withCredentials: true,
      });
      toast.success(data.message || "Category updated.");
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update the category.");
    }
  };

  /* -------------------------------------------------------------- deletes */

  const runDelete = async (target, { force = false } = {}) => {
    setDeleteBusy(true);
    try {
      const { data } = await axios.delete(serverUrl + `/api/category/delete/${target._id}`, {
        params: force ? { force: true } : undefined,
        withCredentials: true,
      });
      toast.success(data.message || "Category deleted.");
      setDeleteTarget(null);
      setForceDelete(null);
      loadCategories();
    } catch (err) {
      if (err?.response?.status === 409) {
        setDeleteTarget(null);
        setForceDelete({ target, message: err.response?.data?.message || "Something went wrong." });
      } else {
        toast.error(err.response?.data?.message || "Could not delete the category.");
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  /* --------------------------------------------------------------- render */

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">
            {topLevel.length} categor{topLevel.length === 1 ? "y" : "ies"} · {categories.length - topLevel.length}{" "}
            subcategor{categories.length - topLevel.length === 1 ? "y" : "ies"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={loadCategories} className="btn-secondary" title="Refresh">
            <FiRefreshCw size={14} />
          </button>
          <button type="button" onClick={() => openCreate()} className="btn-primary">
            <FiPlus size={15} />
            New Category
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            className="input pl-9"
            placeholder="Search categories..."
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
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <SectionLoader rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={loadCategories} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FiTag}
            title="No categories yet"
            hint="Create your first top-level category, then add subcategories under it."
            action={
              <button type="button" onClick={() => openCreate()} className="btn-primary">
                <FiPlus size={15} />
                New Category
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/60">
                <tr>
                  <th className="th">Name</th>
                  <th className="th text-right">Products</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="td">
                      <div className="flex items-center gap-2.5" style={{ paddingLeft: c.depth * 28 }}>
                        {c.hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleCollapsed(c.id)}
                            className="w-5 h-5 rounded text-slate-400 hover:text-slate-700 flex items-center justify-center shrink-0"
                            aria-label={collapsed.has(c.id) ? "Expand" : "Collapse"}
                          >
                            {collapsed.has(c.id) ? <FiChevronRight size={14} /> : <FiChevronDown size={14} />}
                          </button>
                        ) : (
                          <span className="w-5 shrink-0" />
                        )}

                        {c.image ? (
                          <img
                            src={c.image}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-8 h-8 rounded-lg object-cover bg-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-300 flex items-center justify-center shrink-0">
                            <FiFolder size={14} />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-slate-900 truncate max-w-[320px]">
                            {c.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="td text-right tabular-nums text-slate-600">{c.productCount}</td>
                    <td className="td">
                      <Toggle checked={c.isActive} onChange={() => quickToggleActive(c)} label="Active" />
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        {c.depth === 0 && (
                          <button
                            type="button"
                            onClick={() => openCreate(c.id)}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"
                            title="Add subcategory"
                          >
                            <FiFolderPlus size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
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
        title={editing ? "Edit category" : form.parentId ? "New subcategory" : "New category"}
        subtitle={editing ? editing.name : "Fill in the details, then save."}
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" form="category-form" className="btn-primary" disabled={saving}>
              {saving && <Spinner size={14} />}
              {editing ? "Save changes" : "Create"}
            </button>
          </>
        }
      >
        <form id="category-form" onSubmit={submit} noValidate className="p-5 space-y-4">
          <div>
            <label className="label">Category name *</label>
            <input
              className={`input ${formErrors.name ? "input-error" : ""}`}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Corrugated Boxes"
            />
            {formErrors.name && <p className="text-[11px] text-red-600 mt-1">{formErrors.name}</p>}
          </div>

          <div>
            <label className="label">Parent category</label>
            <select
              className="input"
              value={form.parentId}
              onChange={(e) => setField("parentId", e.target.value)}
            >
              <option value="">None — this is a top-level category</option>
              {topLevel
                .filter((c) => c.id !== editing?._id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Choose a parent to make this a subcategory. Subcategories can't have their own subcategories.
            </p>
          </div>

          <div>
            <label className="label">
              Image <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              {(newFile ? URL.createObjectURL(newFile) : existingImage) ? (
                <img
                  src={newFile ? URL.createObjectURL(newFile) : existingImage}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 text-slate-300 flex items-center justify-center">
                  <FiFolder size={20} />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  className="input !py-1.5 !text-[12px]"
                  onChange={(e) => {
                    setNewFile(e.target.files?.[0] || null);
                    setFormErrors((err) => {
                      if (!err.image) return err;
                      const next = { ...err };
                      delete next.image;
                      return next;
                    });
                  }}
                />
                {(existingImage || newFile) && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewFile(null);
                      setExistingImage("");
                    }}
                    className="text-[11px] text-red-600 hover:underline"
                  >
                    Remove image
                  </button>
                )}
                {formErrors.image && <p className="text-[11px] text-red-600">{formErrors.image}</p>}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <Toggle checked={form.isActive} onChange={(v) => setField("isActive", v)} label="Active" />
            <span className="text-[13px] text-slate-700">Visible in the storefront</span>
          </label>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => runDelete(deleteTarget)}
        busy={deleteBusy}
        title="Delete category"
        confirmLabel="Delete"
        message={`"${deleteTarget?.name}" will be permanently deleted.`}
      />

      <ConfirmModal
        open={Boolean(forceDelete)}
        onClose={() => setForceDelete(null)}
        onConfirm={() => runDelete(forceDelete.target, { force: true })}
        busy={deleteBusy}
        title="Confirm delete"
        confirmLabel="Delete anyway"
        message={forceDelete?.message}
      />
    </div>
  );
};

export default Categories;
