import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { FiSearch } from "react-icons/fi";
import { serverUrl } from "../App.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { EmptyState, Pagination, SectionLoader } from "../components/ui.jsx";
import useDebounced from "../hooks/useDebounced.js";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Name: A to Z" },
];

const Shop = () => {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const sort = params.get("sort") || "newest";
  const page = Number(params.get("page")) || 1;

  const [search, setSearch] = useState(params.get("q") || "");
  const debouncedSearch = useDebounced(search, 400);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 12 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(serverUrl + "/api/category/getall", { params: { activeOnly: "true" } })
      .then((res) => setCategories(res.data.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (debouncedSearch !== (params.get("q") || "")) {
      const next = new URLSearchParams(params);
      if (debouncedSearch) next.set("q", debouncedSearch);
      else next.delete("q");
      next.delete("page");
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios
      .get(serverUrl + "/api/product/getpublished", {
        params: { category: category || undefined, q: params.get("q") || undefined, sort, page, limit: 12 },
      })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.data.products || []);
        setPagination(res.data.pagination || { page: 1, pages: 1, total: 0, limit: 12 });
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort, page, params.get("q")]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <p className="eyebrow">Catalog</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Shop furniture</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            className="input pl-9"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input !w-auto"
          value={sort}
          onChange={(e) => setParam("sort", e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          type="button"
          onClick={() => setParam("category", "")}
          className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors ${
            !category ? "bg-brand-500 text-white border-brand-500" : "border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c._id}
            type="button"
            onClick={() => setParam("category", c._id)}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors ${
              category === c._id
                ? "bg-brand-500 text-white border-brand-500"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {loading ? (
        <SectionLoader rows={4} />
      ) : products.length ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
          <div className="mt-8">
            <Pagination
              page={pagination.page}
              pages={pagination.pages}
              total={pagination.total}
              limit={pagination.limit}
              onChange={(p) => setParam("page", String(p))}
              label="products"
            />
          </div>
        </>
      ) : (
        <EmptyState title="No products found" hint="Try a different search term or category." />
      )}
    </div>
  );
};

export default Shop;
