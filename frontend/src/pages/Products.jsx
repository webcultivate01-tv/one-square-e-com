import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { FiSearch } from "react-icons/fi";
import { serverUrl } from "../App.jsx";
import ProductCard from "../components/ProductCard.jsx";
import Reveal from "../components/Reveal.jsx";
import { EmptyState, Pagination, SectionLoader } from "../components/ui.jsx";
import useDebounced from "../hooks/useDebounced.js";
import Seo from "../components/Seo.jsx";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Name: A to Z" },
];

const Products = () => {
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
  const [translated, setTranslated] = useState([]);

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
        setTranslated(res.data.searchTranslated || []);
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

  const activeCategory = categories.find((c) => c._id === category);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <Seo
        title={activeCategory ? `Buy ${activeCategory.name} Online` : "Shop All Products"}
        description={activeCategory ? `Shop ${activeCategory.name} - premium home décor and furniture from One Square Associates.` : undefined}
      />
      <div className="mb-8">
        <p className="eyebrow">Catalog</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Shop furniture</h1>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4 mb-8 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="input !bg-white !rounded-xl pl-10 w-full"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 sm:shrink-0">
            <span className="text-[12px] font-medium text-slate-500 whitespace-nowrap">Sort by</span>
            <select
              className="input !bg-white !rounded-xl flex-1 sm:!w-auto"
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
        </div>

        <div className="-mx-3 sm:mx-0 px-3 sm:px-0 flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-1 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ _id: "", name: "All" }, ...categories].map((c) => {
            const active = category === c._id;
            return (
              <button
                key={c._id || "all"}
                type="button"
                onClick={() => setParam("category", c._id)}
                className={`shrink-0 px-4 py-2 rounded-full text-[12.5px] font-medium border transition-colors ${
                  active
                    ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {params.get("q") && translated.length > 0 && (
        <p className="text-[12.5px] text-slate-500 mb-4">
          Showing results for <span className="font-medium text-slate-700">{translated.join(", ")}</span>
        </p>
      )}

      {loading ? (
        <SectionLoader rows={4} />
      ) : products.length ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p, i) => (
              <Reveal key={p._id} delay={Math.min(i, 7) * 0.05} amount={0.05}>
                <ProductCard product={p} />
              </Reveal>
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

export default Products;
