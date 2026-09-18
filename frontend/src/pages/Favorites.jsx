import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiHeart, FiTrash2, FiZap } from "react-icons/fi";
import { EmptyState, formatMoney } from "../components/ui.jsx";
import EnquiryModal from "../components/EnquiryModal.jsx";
import { removeFromWishlist, selectWishlistItems } from "../redux/wishlistSlice.js";

const Favorites = () => {
  const dispatch = useDispatch();
  const items = useSelector(selectWishlistItems);
  const [buyItem, setBuyItem] = useState(null);

  const handleRemove = (item) => {
    dispatch(removeFromWishlist(item.productId));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <p className="eyebrow">Your picks</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Favorites</h1>
        <p className="text-[13.5px] text-slate-500 mt-1.5">
          {items.length ? `${items.length} item${items.length > 1 ? "s" : ""} saved for later.` : ""}
        </p>
      </div>

      {items.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const hasDiscount = item.discountPrice > 0 && item.discountPrice < item.price;
            return (
              <div
                key={item.productId}
                className="group relative rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all overflow-hidden bg-white"
              >
                <Link to={`/product/${item.slug || item.productId}`} className="block">
                  <div className="relative aspect-[3/2] bg-slate-50 overflow-hidden">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                  </div>
                  <div className="p-3.5 pb-0">
                    {item.category && (
                      <p className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wide">
                        {item.category}
                      </p>
                    )}
                    <h3 className="text-[14px] font-semibold text-slate-900 mt-1 line-clamp-1">{item.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[15px] font-bold text-brand-600">
                        {formatMoney(hasDiscount ? item.discountPrice : item.price, item.currency)}
                      </span>
                      {hasDiscount && (
                        <span className="text-[12.5px] text-slate-400 line-through">
                          {formatMoney(item.price, item.currency)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-2 p-3.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setBuyItem(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-500 text-white text-[12px] font-semibold py-2 shadow-sm shadow-brand-500/30 hover:bg-brand-600 transition-colors"
                  >
                    <FiZap size={13} />
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    aria-label="Remove from favorites"
                    className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={FiHeart}
          title="No favorites yet"
          hint="Tap the heart icon on any product to save it here."
          action={
            <Link to="/products" className="btn-brand-outline inline-flex">
              Browse products
            </Link>
          }
        />
      )}

      <EnquiryModal open={Boolean(buyItem)} onClose={() => setBuyItem(null)} productName={buyItem?.name} />
    </div>
  );
};

export default Favorites;
