import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { FiZap, FiHeart } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { FEATURED_PRODUCTS } from "../utils/site.js";
import { formatMoney } from "./ui.jsx";
import EnquiryModal from "./EnquiryModal.jsx";
import { selectIsWishlisted, toggleWishlist } from "../redux/wishlistSlice.js";

const MOBILE_VISIBLE = 4;

const BADGE_CLASS = {
  Bestseller: "bg-amber-500",
  New: "bg-emerald-500",
};

const FeaturedProductCard = ({ product, hiddenOnMobile }) => {
  const dispatch = useDispatch();
  const productId = product._id || product.slug || product.name;
  const wishlisted = useSelector(selectIsWishlisted(productId));
  const [buyOpen, setBuyOpen] = useState(false);
  const hasDiscount = product.discountPrice > 0 && product.discountPrice < product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;
  const shopLink = `/products?q=${encodeURIComponent(product.category)}`;

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(toggleWishlist(product));
    toast.success(wishlisted ? `Removed "${product.name}" from favorites` : `Added "${product.name}" to favorites`);
  };

  const handleBuy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBuyOpen(true);
  };

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-xl hover:-translate-y-1 hover:border-slate-200 transition-all duration-300 ${
        hiddenOnMobile ? "hidden sm:flex" : ""
      }`}
    >
      <Link to={shopLink} className="relative block aspect-[3/2] sm:aspect-[6/5] bg-slate-50 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-[1.08] transition-transform duration-500 ease-out"
        />

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          {product.badge && (
            <span
              className={`text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md shadow-sm ${
                BADGE_CLASS[product.badge] || "bg-brand-500"
              }`}
            >
              {product.badge}
            </span>
          )}
          {hasDiscount && (
            <span className="text-white text-[10px] font-semibold px-2 py-1 rounded-md bg-rose-500 shadow-sm">
              -{discountPct}%
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-slate-500 hover:text-rose-500 transition-colors"
        >
          <FiHeart size={14} className={wishlisted ? "fill-rose-500 text-rose-500" : ""} />
        </button>
      </Link>

      <div className="flex flex-col flex-1 p-2.5 sm:p-3.5">
        <Link to={shopLink} className="min-w-0">
          <p className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wide truncate">
            {product.category}
          </p>
          <h3 className="text-[13px] sm:text-[14px] font-semibold text-slate-900 mt-1 line-clamp-1 group-hover:text-brand-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1 mt-1.5">
          <FaStar className="text-amber-400" size={11} />
          <span className="text-[12px] font-medium text-slate-700">{product.rating}</span>
          <span className="text-[11.5px] text-slate-400">({product.reviews})</span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-[14px] sm:text-[15.5px] font-bold text-brand-600">
            {formatMoney(hasDiscount ? product.discountPrice : product.price)}
          </span>
          {hasDiscount && (
            <span className="text-[12.5px] text-slate-400 line-through">
              {formatMoney(product.price)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
          <button
            type="button"
            onClick={handleBuy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-500 text-white text-[11px] sm:text-[12px] font-semibold py-2 sm:py-2.5 shadow-sm shadow-brand-500/30 hover:bg-brand-600 transition-colors"
          >
            <FiZap size={13} />
            Buy Now
          </button>
        </div>
      </div>

      <EnquiryModal open={buyOpen} onClose={() => setBuyOpen(false)} productName={product.name} />
    </div>
  );
};

const FeaturedProducts = () => (
  <section className="bg-white py-16 sm:py-20">
    <div className="max-w-7xl mx-auto px-3 sm:px-6">
      <div className="flex items-end justify-between mb-8 sm:mb-10">
        <div>
          <p className="eyebrow">Handpicked for you</p>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Featured Products</h2>
          <p className="text-[13.5px] text-slate-500 mt-1.5">
            Premium décor pieces our customers love the most.
          </p>
        </div>
        <Link
          to="/products"
          className="hidden sm:flex items-center gap-1.5 text-[13px] font-medium text-brand-500 hover:text-brand-600 shrink-0"
        >
          View all
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-5">
        {FEATURED_PRODUCTS.map((p, i) => (
          <FeaturedProductCard key={p.name} product={p} hiddenOnMobile={i >= MOBILE_VISIBLE} />
        ))}
      </div>

      <div className="mt-9 flex justify-center sm:hidden">
        <Link to="/products" className="btn-brand-outline">
          See All Products
        </Link>
      </div>

      <div className="mt-10 hidden sm:flex justify-center">
        <Link to="/products" className="btn-brand !px-8">
          View More Products
        </Link>
      </div>
    </div>
  </section>
);

export default FeaturedProducts;
