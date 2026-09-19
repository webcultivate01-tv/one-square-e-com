import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { serverUrl } from "../App.jsx";
import Reveal from "./Reveal.jsx";

const CategoryShowcase = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(serverUrl + "/api/category/getall", { params: { activeOnly: "true" } })
      .then((res) => {
        if (!cancelled) setCategories(res.data.categories || []);
      })
      .catch(() => {
        // Storefront degrades gracefully — the section just hides itself.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!categories.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <Reveal>
        <p className="eyebrow">Our categories</p>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Browse by category</h2>
        <p className="text-[13.5px] text-slate-500 mt-1.5">Lots of new products and product collections.</p>
      </Reveal>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-10 sm:gap-x-6 mt-10">
        {categories.map((c, i) => (
          <Reveal key={c._id} delay={Math.min(i, 5) * 0.06}>
            <Link to={`/products?category=${c._id}`} className="group flex flex-col items-center">
              <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-44 lg:h-44 rounded-full overflow-hidden ring-1 ring-slate-100 shadow-sm bg-slate-50">
                {c.image && (
                  <img
                    src={c.image}
                    alt={c.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.08] transition-transform duration-500 ease-out"
                  />
                )}
              </div>
              <p className="mt-3 text-[13px] sm:text-[13.5px] font-semibold text-slate-800 text-center group-hover:text-brand-500 transition-colors">
                {c.name}
              </p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default CategoryShowcase;
