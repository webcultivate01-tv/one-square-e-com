import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FiArrowRight } from "react-icons/fi";
import { serverUrl } from "../App.jsx";
import CategoryShowcase from "../components/CategoryShowcase.jsx";
import FeaturedProducts from "../components/FeaturedProducts.jsx";
import HeroSlider from "../components/HeroSlider.jsx";
import ProductCard from "../components/ProductCard.jsx";
import StylingGuide from "../components/StylingGuide.jsx";
import { CTA_BACKGROUND_IMAGE } from "../utils/site.js";

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const prodRes = await axios.get(serverUrl + "/api/product/getpublished", { params: { limit: 100 } });
        if (cancelled) return;
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

  const newArrivals = products.filter((p) => p.isNewArrival).slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <HeroSlider />

      {/* Categories */}
      <CategoryShowcase />

      {/* Featured products */}
      <FeaturedProducts />

      {/* Styling guide */}
      <StylingGuide />

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

      {/* CTA */}
      <section
        className="relative bg-slate-900 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${CTA_BACKGROUND_IMAGE})` }}
      >
        <div className="absolute inset-0 bg-slate-900/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Discover Décor That Feels Like Home
          </h2>
          <p className="text-[14px] text-white/80 mt-2 max-w-lg mx-auto">
            From statement wall art to sculptural showpieces, explore pieces crafted to bring
            character and warmth to every corner of your space.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
            <Link to="/products" className="btn-brand inline-flex">
              Shop Now
              <FiArrowRight size={14} />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 border border-white/70 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-white hover:text-slate-900 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
