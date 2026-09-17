import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiEdit2,
  FiFilter,
  FiPlus,
  FiRefreshCw,
  FiRotateCcw,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { BsBoxSeam } from "react-icons/bs";
import axios from "axios";
import { serverUrl } from "../../App.jsx";
import useDebounced from "../../hooks/useDebounced.js";
import {
  ConfirmModal,
  EmptyState,
  ErrorState,
  Modal,
  Pagination,
  SectionLoader,
  Spinner,
  StatusBadge,
  Toggle,
  formatMoney,
} from "../../components/ui.jsx";

const SORT_OPTIONS = [
  ["newest", "Newest first"],
  ["oldest", "Oldest first"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
  ["name_asc", "Name A–Z"],
  ["stock_asc", "Stock: low to high"],
  ["stock_desc", "Stock: high to low"],
];

const STATUS_OPTIONS = [
  ["all", "All statuses"],
  ["active", "Active"],
  ["draft", "Draft"],
  ["out_of_stock", "Out of stock"],
  ["archived", "Archived"],
];

const VISIBILITY_OPTIONS = [
  ["all", "Any visibility"],
  ["featured", "Featured"],
  ["bestseller", "Bestseller"],
  ["trending", "Trending"],
  ["newArrival", "New arrival"],
];

const STOCK_OPTIONS = [
  ["all", "Any stock level"],
  ["in", "In stock"],
  ["low", "Low stock"],
  ["out", "Out of stock"],
];

const TABS = [
  ["basic", "Basic"],
  ["pricing", "Pricing"],
  ["inventory", "Inventory"],
  ["media", "Shipping & Media"],
  ["variants", "Variants"],
  ["seo", "SEO"],
];

const BULK_ACTIONS = [
  ["activate", "Publish & activate"],
  ["deactivate", "Unpublish (draft)"],
  ["archive", "Archive"],
  ["feature", "Mark featured"],
  ["unfeature", "Remove featured"],
  ["updatePrice", "Set price"],
  ["updateStock", "Set stock"],
  ["assignCategory", "Move to category"],
  ["delete", "Move to trash"],
  ["restore", "Restore from trash"],
];

const emptyForm = {
  name: "",
  description: "",
  richDescription: "",
  sku: "",
  brand: "",
  category: "",
  subcategory: "",
  tags: "",
  status: "draft",
  isPublished: false,
  isFeatured: false,
  isBestseller: false,
  isTrending: false,
  isNewArrival: false,
  price: "",
  discountPrice: "",
  costPrice: "",
  tax: "",
  currency: "USD",
  stock: "0",
  lowStockThreshold: "10",
  minOrderQuantity: "1",
  maxOrderQuantity: "9999",
  weight: "",
  length: "",
  width: "",
  height: "",
  shippingCost: "",
  deliveryEstimate: "",
  metaTitle: "",
  metaDescription: "",
  seoKeywords: "",
};

/** Which tab a given field lives on — used to jump to the first error. */
const FIELD_TAB = {
  name: "basic",
  category: "basic",
  price: "pricing",
  discountPrice: "pricing",
  minOrderQuantity: "inventory",
  maxOrderQuantity: "inventory",
  variants: "variants",
};

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 400);
  const [filters, setFilters] = useState({
    category: "all",
    status: "all",
    visibility: "all",
    stock: searchParams.get("stock") || "all",
    includeDeleted: false,
  });
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState("basic");
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [optionTypes, setOptionTypes] = useState([]);
  const [optionValues, setOptionValues] = useState({});
  const [variants, setVariants] = useState([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fileInputRef = useRef(null);

  /* --------------------------------------------------------------- loading */

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await axios.get(serverUrl + "/api/category/getall", {
        withCredentials: true,
      });
      setCategories(data.categories || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load categories.");
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await axios.get(serverUrl + "/api/product/stats", {
        withCredentials: true,
      });
      setStats(data.stats);
    } catch {
      /* the stat strip is optional */
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, sort };
      if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
      for (const [key, value] of Object.entries(filters)) {
        if (value === "all" || value === false || value === "") continue;
        params[key] = value;
      }
      const { data } = await axios.get(serverUrl + "/api/product/getall", {
        params,
        withCredentials: true,
      });
      setRows(data.products || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load products.");
    } finally {
      setLoading(false);
    }
  }, [page, sort, debouncedSearch, filters]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts();
    loadStats();
  }, [loadProducts, loadStats]);

  // Any search or filter change resets to page 1.
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [debouncedSearch, filters, sort]);

  // Keep the deep-linked ?stock= filter in the URL.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (filters.stock !== "all") next.set("stock", filters.stock);
    else next.delete("stock");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.stock]);

  /* ------------------------------------------------------------ selection */

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r._id));

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) rows.forEach((r) => next.delete(r._id));
      else rows.forEach((r) => next.add(r._id));
      return next;
    });
  };

  const runBulk = async () => {
    setBulkBusy(true);
    try {
      const { data } = await axios.post(
        serverUrl + "/api/product/bulk",
        { ids: [...selected], action: bulkAction, value: bulkValue },
        { withCredentials: true }
      );
      toast.success(data.message);
      setSelected(new Set());
      setBulkAction("");
      setBulkValue("");
      setBulkConfirm(false);
      loadProducts();
      loadStats();
    } catch (err) {
      toast.error(err.response?.data?.message || "The bulk action failed.");
    } finally {
      setBulkBusy(false);
    }
  };

  /* ---------------------------------------------------------------- modal */

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, category: categories[0]?._id || "" });
    setFormErrors({});
    setExistingImages([]);
    setNewFiles([]);
    setOptionTypes([]);
    setOptionValues({});
    setVariants([]);
    setTab("basic");
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name || "",
      description: product.description || "",
      richDescription: product.richDescription || "",
      sku: product.sku || "",
      brand: product.brand || "",
      category: product.category?._id || product.category || "",
      subcategory: product.subcategory || "",
      tags: (product.tags || []).join(", "),
      status: product.status || "draft",
      isPublished: Boolean(product.isPublished),
      isFeatured: Boolean(product.isFeatured),
      isBestseller: Boolean(product.isBestseller),
      isTrending: Boolean(product.isTrending),
      isNewArrival: Boolean(product.isNewArrival),
      price: String(product.price ?? ""),
      discountPrice: String(product.discountPrice || ""),
      costPrice: String(product.costPrice || ""),
      tax: String(product.tax || ""),
      currency: product.currency || "USD",
      stock: String(product.stock ?? 0),
      lowStockThreshold: String(product.lowStockThreshold ?? 10),
      minOrderQuantity: String(product.minOrderQuantity ?? 1),
      maxOrderQuantity: String(product.maxOrderQuantity ?? 9999),
      weight: String(product.weight || ""),
      length: String(product.dimensions?.length || ""),
      width: String(product.dimensions?.width || ""),
      height: String(product.dimensions?.height || ""),
      shippingCost: String(product.shippingCost || ""),
      deliveryEstimate: product.deliveryEstimate || "",
      metaTitle: product.metaTitle || "",
      metaDescription: product.metaDescription || "",
      seoKeywords: (product.seoKeywords || []).join(", "),
    });
    setFormErrors({});
    setExistingImages(product.images || []);
    setNewFiles([]);

    const loaded = product.variants || [];
    setVariants(loaded);
    const types = [...new Set(loaded.flatMap((v) => Object.keys(v.options || {})))];
    setOptionTypes(types);
    setOptionValues(
      Object.fromEntries(
        types.map((t) => [t, [...new Set(loaded.map((v) => v.options?.[t]).filter(Boolean))]])
      )
    );

    setTab("basic");
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

  /** Client validation mirrors the server rules exactly. */
  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Product name is required.";
    if (!form.category) errors.category = "Choose a category.";

    const price = Number(form.price);
    if (form.price === "" || Number.isNaN(price) || price < 0) {
      errors.price = "Enter a price of zero or more.";
    }
    const discount = Number(form.discountPrice || 0);
    if (discount > 0 && discount > price) {
      errors.discountPrice = "The discount price cannot exceed the price.";
    }

    const min = Number(form.minOrderQuantity || 1);
    const max = Number(form.maxOrderQuantity || 9999);
    if (min < 1) errors.minOrderQuantity = "Minimum order quantity must be at least 1.";
    if (max < min) errors.maxOrderQuantity = "Maximum must be greater than or equal to the minimum.";

    const skus = variants.map((v) => String(v.sku || "").trim().toLowerCase());
    if (variants.length) {
      if (skus.some((s) => !s)) errors.variants = "Every variant needs a SKU.";
      else if (new Set(skus).size !== skus.length) errors.variants = "Variant SKUs must be unique.";
    }

    setFormErrors(errors);
    const firstKey = Object.keys(errors)[0];
    if (firstKey) {
      setTab(FIELD_TAB[firstKey] || "basic");
      toast.error(errors[firstKey]);
      return false;
    }
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    const fd = new FormData();

    const scalars = {
      name: form.name.trim(),
      description: form.description,
      richDescription: form.richDescription,
      sku: form.sku.trim(),
      brand: form.brand.trim(),
      category: form.category,
      subcategory: form.subcategory,
      status: form.status,
      isPublished: form.isPublished,
      isFeatured: form.isFeatured,
      isBestseller: form.isBestseller,
      isTrending: form.isTrending,
      isNewArrival: form.isNewArrival,
      price: form.price || 0,
      discountPrice: form.discountPrice || 0,
      costPrice: form.costPrice || 0,
      tax: form.tax || 0,
      currency: form.currency,
      stock: form.stock || 0,
      lowStockThreshold: form.lowStockThreshold || 10,
      minOrderQuantity: form.minOrderQuantity || 1,
      maxOrderQuantity: form.maxOrderQuantity || 9999,
      weight: form.weight || 0,
      shippingCost: form.shippingCost || 0,
      deliveryEstimate: form.deliveryEstimate,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
    };
    for (const [key, value] of Object.entries(scalars)) fd.append(key, String(value));

    // Nested structures travel as JSON strings through multipart.
    fd.append("tags", JSON.stringify(form.tags.split(",").map((t) => t.trim()).filter(Boolean)));
    fd.append(
      "seoKeywords",
      JSON.stringify(form.seoKeywords.split(",").map((t) => t.trim()).filter(Boolean))
    );
    fd.append(
      "dimensions",
      JSON.stringify({
        length: Number(form.length || 0),
        width: Number(form.width || 0),
        height: Number(form.height || 0),
      })
    );
    fd.append("variants", JSON.stringify(variants));
    fd.append("imageUrls", JSON.stringify(existingImages));
    for (const file of newFiles) fd.append("images", file);

    try {
      if (editing) {
        const { data } = await axios.put(serverUrl + `/api/product/update/${editing._id}`, fd, {
          withCredentials: true,
        });
        toast.success(data.message || "Product updated.");
      } else {
        const { data } = await axios.post(serverUrl + "/api/product/create", fd, {
          withCredentials: true,
        });
        toast.success(data.message || "Product created.");
      }
      setModalOpen(false);
      loadProducts();
      loadStats();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save the product.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const { data } = await axios.delete(serverUrl + `/api/product/delete/${deleteTarget._id}`, {
        withCredentials: true,
      });
      toast.success(data.message);
      setDeleteTarget(null);
      loadProducts();
      loadStats();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete the product.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const restore = async (product) => {
    try {
      const { data } = await axios.post(
        serverUrl + `/api/product/restore/${product._id}`,
        {},
        { withCredentials: true }
      );
      toast.success(data.message);
      loadProducts();
      loadStats();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not restore the product.");
    }
  };

  /* ------------------------------------------------------- variant helpers */

  const addOptionType = () => {
    const name = window.prompt("Option name (for example: Colour, Size)");
    const clean = String(name || "").trim();
    if (!clean) return;
    if (optionTypes.includes(clean)) {
      toast.error(`"${clean}" is already an option.`);
      return;
    }
    setOptionTypes((t) => [...t, clean]);
    setOptionValues((v) => ({ ...v, [clean]: [] }));
  };

  const removeOptionType = (type) => {
    setOptionTypes((t) => t.filter((x) => x !== type));
    setOptionValues((v) => {
      const next = { ...v };
      delete next[type];
      return next;
    });
  };

  const setValuesFor = (type, raw) => {
    setOptionValues((v) => ({
      ...v,
      [type]: raw.split(",").map((s) => s.trim()).filter(Boolean),
    }));
  };

  /** Cartesian product of every option type — existing rows are preserved. */
  const generateVariants = () => {
    const usable = optionTypes.filter((t) => (optionValues[t] || []).length > 0);
    if (!usable.length) {
      toast.error("Add at least one option value first.");
      return;
    }

    const combos = usable.reduce(
      (acc, type) => acc.flatMap((row) => optionValues[type].map((v) => ({ ...row, [type]: v }))),
      [{}]
    );

    const sameOptions = (a, b) => {
      const ka = Object.keys(a);
      const kb = Object.keys(b);
      return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
    };

    const base = String(form.sku || form.name || "SKU").trim().toUpperCase().replace(/\s+/g, "-");

    const next = combos.map((options) => {
      const existing = variants.find((v) => sameOptions(v.options || {}, options));
      if (existing) return { ...existing, options };
      return {
        sku: `${base}-${Object.values(options).join("-").toLowerCase()}`,
        options,
        price: Number(form.price || 0),
        discountPrice: 0,
        stock: 0,
        images: [],
        isAvailable: true,
      };
    });

    setVariants(next);
    setFormErrors((e) => {
      const copy = { ...e };
      delete copy.variants;
      return copy;
    });
    toast.success(`${next.length} variant(s) generated.`);
  };

  const updateVariant = (index, key, value) => {
    setVariants((list) => list.map((v, i) => (i === index ? { ...v, [key]: value } : v)));
  };

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(([, v]) => v !== "all" && v !== false && v !== "").length +
      (search.trim() ? 1 : 0),
    [filters, search]
  );

  const resetFilters = () => {
    setFilters({
      category: "all",
      status: "all",
      visibility: "all",
      stock: "all",
      includeDeleted: false,
    });
    setSearch("");
    setSort("newest");
  };

  /* --------------------------------------------------------------- render */

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">
            {pagination.total} product{pagination.total === 1 ? "" : "s"} in the catalog.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={loadProducts} className="btn-secondary" title="Refresh">
            <FiRefreshCw size={14} />
          </button>
          <button type="button" onClick={openCreate} className="btn-primary">
            <FiPlus size={15} />
            New Product
          </button>
        </div>
      </div>

      {/* Stat strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            ["Total", stats.total, "text-slate-900"],
            ["Active", stats.active, "text-emerald-600"],
            ["Drafts", stats.drafts, "text-slate-500"],
            ["Out of stock", stats.outOfStock, "text-amber-600"],
            ["Low stock", stats.lowStock, "text-red-600"],
            ["In trash", stats.deleted, "text-slate-400"],
          ].map(([label, value, tone]) => (
            <div key={label} className="card p-3.5">
              <p className="text-[11px] text-slate-500 truncate">{label}</p>
              <p className={`text-lg font-semibold tabular-nums mt-0.5 ${tone}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              className="input pl-9"
              placeholder="Search name, SKU, brand or tag..."
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

          <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {[
              ["status", "Status", STATUS_OPTIONS],
              ["visibility", "Visibility", VISIBILITY_OPTIONS],
              ["stock", "Stock", STOCK_OPTIONS],
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

            <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between gap-4 flex-wrap pt-1">
              <label className="flex items-center gap-2 text-[13px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                  checked={filters.includeDeleted}
                  onChange={(e) => setFilters((f) => ({ ...f, includeDeleted: e.target.checked }))}
                />
                Include products in the trash
              </label>
              <button type="button" onClick={resetFilters} className="btn-secondary">
                Reset filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="card p-3.5 border-indigo-200 bg-indigo-50/40 flex items-center gap-3 flex-wrap sticky top-0 z-10">
          <span className="text-[13px] font-medium text-indigo-900">
            {selected.size} selected
          </span>
          <select
            className="input w-auto"
            value={bulkAction}
            onChange={(e) => {
              setBulkAction(e.target.value);
              setBulkValue("");
            }}
          >
            <option value="">Choose an action...</option>
            {BULK_ACTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {bulkAction === "updatePrice" && (
            <input
              type="number"
              min="0"
              step="0.01"
              className="input w-32"
              placeholder="Price"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
            />
          )}
          {bulkAction === "updateStock" && (
            <input
              type="number"
              min="0"
              className="input w-32"
              placeholder="Stock"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
            />
          )}
          {bulkAction === "assignCategory" && (
            <select
              className="input w-auto"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
            >
              <option value="">Choose a category...</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="btn-primary !py-2"
            disabled={!bulkAction}
            onClick={() => setBulkConfirm(true)}
          >
            Apply
          </button>
          <button type="button" className="btn-secondary" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <SectionLoader rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={loadProducts} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={BsBoxSeam}
            title="No products match these filters"
            hint="Try clearing the search or filters, or create your first product."
            action={
              <button type="button" onClick={openCreate} className="btn-primary">
                <FiPlus size={15} />
                New Product
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className="th w-10">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                        checked={allOnPageSelected}
                        onChange={toggleAllOnPage}
                        aria-label="Select all on this page"
                      />
                    </th>
                    <th className="th">Product</th>
                    <th className="th">Category</th>
                    <th className="th text-right">Price</th>
                    <th className="th text-right">Stock</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((p) => (
                    <tr
                      key={p._id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        p.isDeleted ? "opacity-60" : ""
                      }`}
                    >
                      <td className="td">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                          checked={selected.has(p._id)}
                          onChange={() => toggleRow(p._id)}
                          aria-label={`Select ${p.name}`}
                        />
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          {p.images?.[0] ? (
                            <img
                              src={p.images[0]}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-300 flex items-center justify-center shrink-0">
                              <BsBoxSeam size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-slate-900 truncate max-w-[280px]">
                              {p.name}
                              {p.isDeleted && (
                                <span className="ml-2 text-[10px] text-slate-400">(trashed)</span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono truncate">
                              {p.sku || "no SKU"}
                              {p.variants?.length > 0 && ` · ${p.variants.length} variants`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="td text-slate-500">{p.category?.name || "—"}</td>
                      <td className="td text-right tabular-nums">
                        {p.discountPrice > 0 ? (
                          <span>
                            <span className="text-slate-400 line-through text-[11px] mr-1.5">
                              {formatMoney(p.price, p.currency)}
                            </span>
                            <span className="font-medium text-slate-900">
                              {formatMoney(p.discountPrice, p.currency)}
                            </span>
                          </span>
                        ) : (
                          <span className="font-medium text-slate-900">
                            {formatMoney(p.price, p.currency)}
                          </span>
                        )}
                      </td>
                      <td className="td text-right tabular-nums">
                        <span
                          className={
                            p.isOutOfStock
                              ? "text-red-600 font-medium"
                              : p.isLowStock
                                ? "text-amber-600 font-medium"
                                : "text-slate-700"
                          }
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="td">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"
                            title="Edit"
                          >
                            <FiEdit2 size={14} />
                          </button>
                          {p.isDeleted ? (
                            <button
                              type="button"
                              onClick={() => restore(p)}
                              className="w-8 h-8 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-colors"
                              title="Restore"
                            >
                              <FiRotateCcw size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(p)}
                              className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                              title="Move to trash"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          )}
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
              label="products"
            />
          </>
        )}
      </div>

      {/* Create / edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? "Edit product" : "New product"}
        subtitle={editing ? editing.name : "Fill in the tabs below, then save."}
        size="xl"
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
            <button type="submit" form="product-form" className="btn-primary" disabled={saving}>
              {saving && <Spinner size={14} />}
              {editing ? "Save changes" : "Create product"}
            </button>
          </>
        }
      >
        <form id="product-form" onSubmit={submit} noValidate>
          {/* Tabs */}
          <div className="flex gap-1 px-5 pt-4 border-b border-slate-100 overflow-x-auto scrollbar-slim">
            {TABS.map(([key, label]) => {
              const hasError = Object.keys(formErrors).some((f) => FIELD_TAB[f] === key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`px-3.5 py-2 text-[13px] font-medium rounded-t-lg whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    tab === key
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {label}
                  {hasError && <span className="ml-1.5 text-red-500">•</span>}
                </button>
              );
            })}
          </div>

          <div className="p-5 space-y-4">
            {/* BASIC */}
            {tab === "basic" && (
              <>
                <div>
                  <label className="label">Product name *</label>
                  <input
                    className={`input ${formErrors.name ? "input-error" : ""}`}
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Single Wall Carton 12x9x6"
                  />
                  {formErrors.name && (
                    <p className="text-[11px] text-red-600 mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="label">Short description</label>
                  <textarea
                    className="input min-h-[80px] resize-y"
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder="A one-paragraph summary shown on the catalog card."
                  />
                </div>

                <div>
                  <label className="label">Full description</label>
                  <textarea
                    className="input min-h-[110px] resize-y"
                    value={form.richDescription}
                    onChange={(e) => setField("richDescription", e.target.value)}
                    placeholder="Specifications, materials, certifications..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">SKU</label>
                    <input
                      className="input font-mono"
                      value={form.sku}
                      onChange={(e) => setField("sku", e.target.value)}
                      placeholder="SW-12096"
                    />
                  </div>
                  <div>
                    <label className="label">Brand</label>
                    <input
                      className="input"
                      value={form.brand}
                      onChange={(e) => setField("brand", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Category *</label>
                    <select
                      className={`input ${formErrors.category ? "input-error" : ""}`}
                      value={form.category}
                      onChange={(e) => setField("category", e.target.value)}
                    >
                      <option value="">Choose a category...</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.category && (
                      <p className="text-[11px] text-red-600 mt-1">{formErrors.category}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Subcategory</label>
                    <input
                      className="input"
                      value={form.subcategory}
                      onChange={(e) => setField("subcategory", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Tags (comma separated)</label>
                  <input
                    className="input"
                    value={form.tags}
                    onChange={(e) => setField("tags", e.target.value)}
                    placeholder="carton, corrugated, single wall"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="label">Status</label>
                    <select
                      className="input"
                      value={form.status}
                      onChange={(e) => setField("status", e.target.value)}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="out_of_stock">Out of stock</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <Toggle
                        checked={form.isPublished}
                        onChange={(v) => setField("isPublished", v)}
                        label="Published"
                      />
                      <span className="text-[13px] text-slate-700">
                        Visible in the storefront catalog
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-1">
                  <p className="label">Visibility flags</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      ["isFeatured", "Featured"],
                      ["isBestseller", "Bestseller"],
                      ["isTrending", "Trending"],
                      ["isNewArrival", "New arrival"],
                    ].map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-[13px] text-slate-600 cursor-pointer border border-slate-200 rounded-lg px-3 py-2 hover:border-slate-300 transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                          checked={form[key]}
                          onChange={(e) => setField(key, e.target.checked)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* PRICING */}
            {tab === "pricing" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Price *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={`input ${formErrors.price ? "input-error" : ""}`}
                    value={form.price}
                    onChange={(e) => setField("price", e.target.value)}
                  />
                  {formErrors.price && (
                    <p className="text-[11px] text-red-600 mt-1">{formErrors.price}</p>
                  )}
                </div>
                <div>
                  <label className="label">Discount price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={`input ${formErrors.discountPrice ? "input-error" : ""}`}
                    value={form.discountPrice}
                    onChange={(e) => setField("discountPrice", e.target.value)}
                  />
                  {formErrors.discountPrice ? (
                    <p className="text-[11px] text-red-600 mt-1">{formErrors.discountPrice}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Leave at 0 to sell at the full price.
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">Cost price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input"
                    value={form.costPrice}
                    onChange={(e) => setField("costPrice", e.target.value)}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Internal only — never shown to customers.</p>
                </div>
                <div>
                  <label className="label">Tax (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input"
                    value={form.tax}
                    onChange={(e) => setField("tax", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select
                    className="input"
                    value={form.currency}
                    onChange={(e) => setField("currency", e.target.value)}
                  >
                    {["USD", "EUR", "GBP", "INR", "AUD", "CAD"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* INVENTORY */}
            {tab === "inventory" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Stock on hand</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={form.stock}
                    onChange={(e) => setField("stock", e.target.value)}
                  />
                  {variants.length > 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      This product uses variants — per-variant stock takes over.
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">Low stock threshold</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={form.lowStockThreshold}
                    onChange={(e) => setField("lowStockThreshold", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Minimum order quantity</label>
                  <input
                    type="number"
                    min="1"
                    className={`input ${formErrors.minOrderQuantity ? "input-error" : ""}`}
                    value={form.minOrderQuantity}
                    onChange={(e) => setField("minOrderQuantity", e.target.value)}
                  />
                  {formErrors.minOrderQuantity && (
                    <p className="text-[11px] text-red-600 mt-1">{formErrors.minOrderQuantity}</p>
                  )}
                </div>
                <div>
                  <label className="label">Maximum order quantity</label>
                  <input
                    type="number"
                    min="1"
                    className={`input ${formErrors.maxOrderQuantity ? "input-error" : ""}`}
                    value={form.maxOrderQuantity}
                    onChange={(e) => setField("maxOrderQuantity", e.target.value)}
                  />
                  {formErrors.maxOrderQuantity && (
                    <p className="text-[11px] text-red-600 mt-1">{formErrors.maxOrderQuantity}</p>
                  )}
                </div>
              </div>
            )}

            {/* SHIPPING & MEDIA */}
            {tab === "media" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Weight (kg)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input"
                      value={form.weight}
                      onChange={(e) => setField("weight", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Shipping cost</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input"
                      value={form.shippingCost}
                      onChange={(e) => setField("shippingCost", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Dimensions (cm)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ["length", "Length"],
                      ["width", "Width"],
                      ["height", "Height"],
                    ].map(([key, label]) => (
                      <input
                        key={key}
                        type="number"
                        min="0"
                        step="0.1"
                        className="input"
                        placeholder={label}
                        value={form[key]}
                        onChange={(e) => setField(key, e.target.value)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Delivery estimate</label>
                  <input
                    className="input"
                    value={form.deliveryEstimate}
                    onChange={(e) => setField("deliveryEstimate", e.target.value)}
                    placeholder="2–4 business days"
                  />
                </div>

                <div className="pt-2">
                  <label className="label">Images</label>
                  <div className="flex flex-wrap gap-3">
                    {existingImages.map((url, i) => (
                      <div key={url} className="relative group">
                        <img
                          src={url}
                          alt=""
                          className="w-20 h-20 rounded-lg object-cover border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => setExistingImages((list) => list.filter((_, x) => x !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove image"
                        >
                          <FiX size={11} />
                        </button>
                      </div>
                    ))}

                    {newFiles.map((file, i) => (
                      <div key={`${file.name}-${i}`} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt=""
                          className="w-20 h-20 rounded-lg object-cover border border-indigo-200"
                        />
                        <button
                          type="button"
                          onClick={() => setNewFiles((list) => list.filter((_, x) => x !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove image"
                        >
                          <FiX size={11} />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 flex items-center justify-center transition-colors"
                      aria-label="Add images"
                    >
                      <FiPlus size={18} />
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const picked = [...e.target.files];
                      const room = 10 - existingImages.length - newFiles.length;
                      if (picked.length > room) {
                        toast.error(`You can attach at most 10 images (${room} slot(s) left).`);
                      }
                      setNewFiles((list) => [...list, ...picked.slice(0, Math.max(room, 0))]);
                      e.target.value = "";
                    }}
                  />
                  <p className="text-[11px] text-slate-400 mt-2">
                    Up to 10 images, 8MB each. The first image is used as the thumbnail.
                  </p>
                </div>
              </>
            )}

            {/* VARIANTS */}
            {tab === "variants" && (
              <>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[13px] font-medium text-slate-900">Option types</p>
                    <p className="text-[12px] text-slate-500">
                      Add option types, list their values, then generate every combination.
                    </p>
                  </div>
                  <button type="button" onClick={addOptionType} className="btn-secondary">
                    <FiPlus size={14} />
                    Add option
                  </button>
                </div>

                {optionTypes.length === 0 ? (
                  <p className="text-[13px] text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-lg">
                    No options yet. This product will be sold as a single item.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {optionTypes.map((type) => (
                      <div key={type} className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="label">{type} values (comma separated)</label>
                          <input
                            className="input"
                            value={(optionValues[type] || []).join(", ")}
                            onChange={(e) => setValuesFor(type, e.target.value)}
                            placeholder="Kraft, White, Black"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOptionType(type)}
                          className="w-10 h-[42px] rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0"
                          aria-label={`Remove ${type}`}
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    ))}

                    <button type="button" onClick={generateVariants} className="btn-secondary">
                      <FiRefreshCw size={14} />
                      Generate variants
                    </button>
                  </div>
                )}

                {formErrors.variants && (
                  <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <FiAlertTriangle size={14} />
                    {formErrors.variants}
                  </div>
                )}

                {variants.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50/60">
                        <tr>
                          <th className="th">Variant</th>
                          <th className="th">SKU</th>
                          <th className="th text-right">Price</th>
                          <th className="th text-right">Stock</th>
                          <th className="th text-center">Available</th>
                          <th className="th w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {variants.map((v, i) => (
                          <tr key={`${v.sku}-${i}`}>
                            <td className="td text-slate-600 whitespace-nowrap">
                              {Object.values(v.options || {}).join(" / ") || "—"}
                            </td>
                            <td className="td">
                              <input
                                className="input !py-1.5 !text-[12px] font-mono min-w-[140px]"
                                value={v.sku}
                                onChange={(e) => updateVariant(i, "sku", e.target.value)}
                              />
                            </td>
                            <td className="td">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="input !py-1.5 !text-[12px] w-24 text-right"
                                value={v.price}
                                onChange={(e) => updateVariant(i, "price", Number(e.target.value))}
                              />
                            </td>
                            <td className="td">
                              <input
                                type="number"
                                min="0"
                                className="input !py-1.5 !text-[12px] w-20 text-right"
                                value={v.stock}
                                onChange={(e) => updateVariant(i, "stock", Number(e.target.value))}
                              />
                            </td>
                            <td className="td text-center">
                              <Toggle
                                checked={v.isAvailable !== false}
                                onChange={(val) => updateVariant(i, "isAvailable", val)}
                                label="Available"
                              />
                            </td>
                            <td className="td">
                              <button
                                type="button"
                                onClick={() => setVariants((l) => l.filter((_, x) => x !== i))}
                                className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                                aria-label="Remove variant"
                              >
                                <FiX size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* SEO */}
            {tab === "seo" && (
              <>
                <div>
                  <label className="label">Meta title</label>
                  <input
                    className="input"
                    value={form.metaTitle}
                    onChange={(e) => setField("metaTitle", e.target.value)}
                    maxLength={70}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {form.metaTitle.length}/70 characters
                  </p>
                </div>
                <div>
                  <label className="label">Meta description</label>
                  <textarea
                    className="input min-h-[90px] resize-y"
                    value={form.metaDescription}
                    onChange={(e) => setField("metaDescription", e.target.value)}
                    maxLength={170}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {form.metaDescription.length}/170 characters
                  </p>
                </div>
                <div>
                  <label className="label">SEO keywords (comma separated)</label>
                  <input
                    className="input"
                    value={form.seoKeywords}
                    onChange={(e) => setField("seoKeywords", e.target.value)}
                    placeholder="shipping boxes, corrugated cartons, bulk packaging"
                  />
                </div>
              </>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        busy={deleteBusy}
        title="Move product to trash"
        confirmLabel="Move to trash"
        message={`"${deleteTarget?.name}" will be unpublished and hidden from the catalog. You can restore it later from the trash filter.`}
      />

      <ConfirmModal
        open={bulkConfirm}
        onClose={() => setBulkConfirm(false)}
        onConfirm={runBulk}
        busy={bulkBusy}
        tone={bulkAction === "delete" ? "danger" : "warning"}
        title="Apply bulk action"
        confirmLabel="Apply"
        message={`"${
          BULK_ACTIONS.find(([v]) => v === bulkAction)?.[1] || bulkAction
        }" will be applied to ${selected.size} product(s). This cannot be undone in one click.`}
      />
    </div>
  );
};

export default Products;
