import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { FiCheck, FiChevronRight, FiHeart, FiTruck, FiZap } from "react-icons/fi";
import { serverUrl } from "../App.jsx";
import { EmptyState, formatMoney, SectionLoader } from "../components/ui.jsx";
import EnquiryModal from "../components/EnquiryModal.jsx";
import { selectIsWishlisted, toggleWishlist } from "../redux/wishlistSlice.js";

const ProductDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const wishlisted = useSelector(selectIsWishlisted(product?._id));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setActiveImage(0);
    axios
      .get(serverUrl + `/api/product/${id}`)
      .then((res) => {
        if (!cancelled) setProduct(res.data.product);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <SectionLoader rows={6} />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <EmptyState title="Product not found" hint="This item may have been removed or is no longer available." />
        <div className="text-center mt-4">
          <Link to="/products" className="btn-brand-outline inline-flex">
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  const hasDiscount = product.discountPrice > 0 && product.discountPrice < product.price;
  const images = product.images?.length ? product.images : [""];

  const handleWishlist = () => {
    dispatch(toggleWishlist(product));
    toast.success(wishlisted ? `Removed "${product.name}" from favorites` : `Added "${product.name}" to favorites`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-1.5 text-[12.5px] text-slate-400 mb-6">
        <Link to="/products" className="hover:text-slate-600">Shop</Link>
        <FiChevronRight size={12} />
        {product.category?.name && (
          <>
            <Link to={`/products?category=${product.category._id}`} className="hover:text-slate-600">
              {product.category.name}
            </Link>
            <FiChevronRight size={12} />
          </>
        )}
        <span className="text-slate-600">{product.name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        <div>
          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
            {images[activeImage] && (
              <img src={images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-3 mt-3">
              {images.map((img, i) => (
                <button
                  key={img + i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    activeImage === i ? "border-brand-500" : "border-transparent"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.category?.name && (
            <p className="text-[11px] font-semibold text-brand-500 uppercase tracking-wide">
              {product.category.name}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1.5">{product.name}</h1>

          <div className="flex items-center gap-3 mt-4">
            <span className="text-2xl font-bold text-brand-600">
              {formatMoney(hasDiscount ? product.discountPrice : product.price, product.currency)}
            </span>
            {hasDiscount && (
              <span className="text-[16px] text-slate-400 line-through">
                {formatMoney(product.price, product.currency)}
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-[13.5px] text-slate-600 mt-5 leading-relaxed">{product.description}</p>
          )}

          <ul className="mt-5 space-y-2">
            <li className="flex items-center gap-2 text-[13px] text-slate-600">
              <FiCheck className="text-emerald-500 shrink-0" size={15} />
              {product.isOutOfStock ? "Currently out of stock" : "In stock, ready to build for you"}
            </li>
            {product.deliveryEstimate && (
              <li className="flex items-center gap-2 text-[13px] text-slate-600">
                <FiTruck className="text-brand-500 shrink-0" size={15} />
                Estimated delivery: {product.deliveryEstimate}
              </li>
            )}
            {product.brand && (
              <li className="flex items-center gap-2 text-[13px] text-slate-600">
                <FiCheck className="text-emerald-500 shrink-0" size={15} />
                Brand: {product.brand}
              </li>
            )}
          </ul>

          {Boolean(product.tags?.length) && (
            <div className="flex flex-wrap gap-2 mt-5">
              {product.tags.map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[11.5px] font-medium">
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 mt-8">
            {!product.isOutOfStock && (
              <button type="button" onClick={() => setEnquiryOpen(true)} className="btn-brand !px-6">
                <FiZap size={15} />
                Buy Now
              </button>
            )}
            <button
              type="button"
              onClick={handleWishlist}
              className={`inline-flex items-center gap-1.5 rounded-full border text-[13px] font-semibold px-5 py-2.5 transition-colors ${
                wishlisted
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : "border-slate-200 text-slate-700 hover:border-rose-300 hover:text-rose-600"
              }`}
            >
              <FiHeart size={15} className={wishlisted ? "fill-rose-500" : ""} />
              {wishlisted ? "In Favorites" : "Add to Favorites"}
            </button>
          </div>
        </div>
      </div>

      <EnquiryModal
        open={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        productId={product._id}
        productName={product.name}
      />
    </div>
  );
};

export default ProductDetail;
