import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FiArrowRight,
  FiShield,
  FiTool,
  FiTruck,
} from "react-icons/fi";
import { serverUrl } from "../App.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { SectionLoader } from "../components/ui.jsx";

const WHY_CHOOSE_US = [
  { icon: FiTool, title: "Built to order", body: "Every piece is crafted and finished to the specifications your space needs." },
  { icon: FiShield, title: "Warranty backed", body: "Frames, foam and fittings are covered so your furniture lasts for years." },
  { icon: FiTruck, title: "Doorstep delivery", body: "Careful packing and white-glove delivery, tracked from factory to your door." },
];

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [catRes, prodRes] = await Promise.all([
          axios.get(serverUrl + "/api/category/getall", { params: { activeOnly: "true" } }),
          axios.get(serverUrl + "/api/product/getpublished", { params: { limit: 100 } }),
        ]);
        if (cancelled) return;
        setCategories(catRes.data.categories || []);
        setProducts(prodRes.data.products || []);
      } catch {
        // Storefront degrades gracefully — sections below handle empty data.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const bestsellers = products.filter((p) => p.isBestseller).slice(0, 8);
  const newArrivals = products.filter((p) => p.isNewArrival).slice(0, 4);
  const featuredSection = bestsellers.length ? bestsellers : products.slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 grid lg:grid-cols-2 gap-10 items-center">
          <div className="text-white">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-brand-100">
              One Square Associates
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mt-4 leading-[1.1]">
              Furniture that fits
              <br />
              your life.
            </h1>
            <p className="text-[15px] text-brand-100 mt-5 max-w-md leading-relaxed">
              Sofas, recliners, chairs and complete room solutions — designed, built and
              delivered with a craftsmanship-first approach.
            </p>
            <div className="flex items-center gap-3 mt-8">
              <Link to="/shop" className="bg-white text-brand-600 hover:bg-brand-50 text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors inline-flex items-center gap-2">
                Shop Now
                <FiArrowRight size={15} />
              </Link>
              <Link to="/contact" className="border border-white/40 text-white hover:bg-white/10 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
                Get a Quote
              </Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://picsum.photos/seed/one-square-hero/1000/750"
                alt="Furniture showcase"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="eyebrow">Shop by category</p>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Browse the collection</h2>
          </div>
          <Link to="/shop" className="hidden sm:flex items-center gap-1.5 text-[13px] font-medium text-brand-500 hover:text-brand-600">
            View all <FiArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <SectionLoader rows={2} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((c) => (
              <Link
                key={c._id}
                to={`/shop?category=${c._id}`}
                className="group rounded-xl overflow-hidden border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all"
              >
                <div className="aspect-square bg-slate-50 overflow-hidden">
                  {c.image && (
                    <img
                      src={c.image}
                      alt={c.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <p className="text-[12.5px] font-medium text-slate-800 text-center py-2.5">{c.name}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Bestsellers */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="eyebrow">Weekly bestsellers</p>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Customer favourites</h2>
            </div>
            <Link to="/shop" className="hidden sm:flex items-center gap-1.5 text-[13px] font-medium text-brand-500 hover:text-brand-600">
              View all <FiArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <SectionLoader rows={3} />
          ) : featuredSection.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {featuredSection.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-slate-500">Products will appear here once the catalog is published.</p>
          )}
        </div>
      </section>

      {/* New arrivals */}
      {Boolean(newArrivals.length) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="mb-8">
            <p className="eyebrow">Just landed</p>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">New arrivals</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {newArrivals.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Why choose us */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="eyebrow text-slate-500">Why One Square</p>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-1">Craftsmanship you can trust</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {WHY_CHOOSE_US.map(({ icon: Icon, title, body }) => (
              <div key={title} className="text-center px-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 text-brand-300 flex items-center justify-center mx-auto">
                  <Icon size={20} />
                </div>
                <h3 className="text-white font-semibold mt-4">{title}</h3>
                <p className="text-[13px] text-slate-400 mt-1.5 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Have a project in mind?
        </h2>
        <p className="text-[14px] text-slate-500 mt-2 max-w-lg mx-auto">
          Tell us what you're looking for and our team will help you find the right fit.
        </p>
        <Link to="/contact" className="btn-brand mt-6 inline-flex">
          Talk to us
          <FiArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
};

export default Home;
