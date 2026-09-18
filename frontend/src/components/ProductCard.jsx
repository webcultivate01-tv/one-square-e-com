import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { FiHeart, FiZap } from "react-icons/fi";
import { formatMoney } from "./ui.jsx";
import EnquiryModal from "./EnquiryModal.jsx";
import { selectIsWishlisted, toggleWishlist } from "../redux/wishlistSlice.js";

const BADGE = {
  isBestseller: ["Bestseller", "bg-amber-500"],
  isNewArrival: ["New", "bg-emerald-500"],
  isFeatured: ["Featured", "bg-brand-500"],
};

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const productId = product._id || product.slug;
  const wishlisted = useSelector(selectIsWishlisted(productId));
  const [buyOpen, setBuyOpen] = useState(false);

  const image = product.images?.[0] || "";
  const hasDiscount = product.discountPrice > 0 && product.discountPrice < product.price;
  const badgeKey = ["isBestseller", "isNewArrival", "isFeatured"].find((k) => product[k]);
  const badge = badgeKey ? BADGE[badgeKey] : null;

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
    <div className="group relative rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all overflow-hidden bg-white">
      <Link to={`/product/${product.slug || product._id}`} className="block">
        <div className="relative aspect-[3/2] bg-slate-50 overflow-hidden">
          {image && (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
          {badge && (
            <span
              className={`absolute top-3 left-3 text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md ${badge[1]}`}
            >
              {badge[0]}
            </span>
          )}
          {product.isOutOfStock && (
            <span className="absolute inset-0 bg-white/70 flex items-center justify-center text-[12px] font-semibold text-slate-600">
              Out of stock
            </span>
          )}

          <button
            type="button"
            onClick={handleWishlist}
            aria-label={wishlisted ? "Remove from favorites" : "Add to favorites"}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-slate-500 hover:text-rose-500 transition-colors"
          >
            <FiHeart size={14} className={wishlisted ? "fill-rose-500 text-rose-500" : ""} />
          </button>
        </div>

        <div className="p-3.5">
          {product.category?.name && (
            <p className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wide">
              {product.category.name}
            </p>
          )}
          <h3 className="text-[14px] font-semibold text-slate-900 mt-1 line-clamp-1">{product.name}</h3>

          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[15px] font-bold text-brand-600">
              {formatMoney(hasDiscount ? product.discountPrice : product.price, product.currency)}
            </span>
            {hasDiscount && (
              <span className="text-[12.5px] text-slate-400 line-through">
                {formatMoney(product.price, product.currency)}
              </span>
            )}
          </div>

          {!product.isOutOfStock && (
            <button
              type="button"
              onClick={handleBuy}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-500 text-white text-[12px] font-semibold py-2 shadow-sm shadow-brand-500/30 hover:bg-brand-600 transition-colors"
            >
              <FiZap size={13} />
              Buy
            </button>
          )}
        </div>
      </Link>

      <EnquiryModal open={buyOpen} onClose={() => setBuyOpen(false)} productId={product._id} productName={product.name} />
    </div>
  );
};

export default ProductCard;
