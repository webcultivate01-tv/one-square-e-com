import { Link } from "react-router-dom";
import { formatMoney } from "./ui.jsx";

const BADGE = {
  isBestseller: ["Bestseller", "bg-amber-500"],
  isNewArrival: ["New", "bg-emerald-500"],
  isFeatured: ["Featured", "bg-brand-500"],
};

const ProductCard = ({ product }) => {
  const image = product.images?.[0] || "";
  const hasDiscount = product.discountPrice > 0 && product.discountPrice < product.price;
  const badgeKey = ["isBestseller", "isNewArrival", "isFeatured"].find((k) => product[k]);
  const badge = badgeKey ? BADGE[badgeKey] : null;

  return (
    <Link
      to={`/product/${product.slug || product._id}`}
      className="group block rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all overflow-hidden bg-white"
    >
      <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
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
      </div>

      <div className="p-4">
        {product.category?.name && (
          <p className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wide">
            {product.category.name}
          </p>
        )}
        <h3 className="text-[14px] font-semibold text-slate-900 mt-1 line-clamp-1">{product.name}</h3>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-[15px] font-bold text-brand-600">
            {formatMoney(hasDiscount ? product.discountPrice : product.price, product.currency)}
          </span>
          {hasDiscount && (
            <span className="text-[12.5px] text-slate-400 line-through">
              {formatMoney(product.price, product.currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
