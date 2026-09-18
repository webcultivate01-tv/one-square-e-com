import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import {
  FiHeart,
  FiMapPin,
  FiMenu,
  FiPhone,
  FiSearch,
  FiUser,
  FiX,
} from "react-icons/fi";
import { serverUrl } from "../App.jsx";
import {
  CONTACT_ADDRESS,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
  LOGO_URL,
  NAV_LINKS,
} from "../utils/site.js";
import { selectWishlistCount } from "../redux/wishlistSlice.js";

const IconBadge = ({ count }) =>
  count > 0 ? (
    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-500 text-white text-[9.5px] font-bold flex items-center justify-center leading-none">
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

const PublicNavbar = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();
  const wishlistCount = useSelector(selectWishlistCount);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(serverUrl + "/api/category/getall", { params: { activeOnly: "true" } })
      .then((res) => {
        if (!cancelled) setCategories(res.data.categories || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(search.trim() ? `/products?q=${encodeURIComponent(search.trim())}` : "/products");
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100">
      {/* Utility bar */}
      <div className="hidden md:block bg-slate-50 border-b border-slate-100">
        <div className="max-w-[84rem] mx-auto px-4 sm:px-6 h-9 flex items-center justify-between text-[12px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <FiMapPin size={12} />
            <span>{CONTACT_ADDRESS}</span>
          </div>
          <div className="flex items-center gap-5">
            <a href={`tel:${CONTACT_PHONE_TEL}`} className="flex items-center gap-1.5 hover:text-brand-500 transition-colors">
              <FiPhone size={12} />
              {CONTACT_PHONE_DISPLAY}
            </a>
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className="hover:text-brand-500 transition-colors">
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      {/* Main row */}
      <div className="max-w-[84rem] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <NavLink to="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <img
            src={LOGO_URL}
            alt="One Square Associates"
            className="h-10 w-auto object-contain scale-x-[1.08]"
          />
        </NavLink>

        <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-xl mx-auto">
          <div className="flex items-center w-full rounded-lg border border-slate-200 bg-slate-50 focus-within:border-brand-300 focus-within:bg-white transition-colors">
            <FiSearch size={15} className="ml-3 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for products"
              className="w-full bg-transparent px-2.5 py-2 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </form>

        <div className="hidden md:flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/favorites")}
            className="relative w-10 h-10 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-50 hover:text-brand-500 transition-colors"
            aria-label="Favorites"
          >
            <FiHeart size={19} />
            <IconBadge count={wishlistCount} />
          </button>
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="w-10 h-10 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-50 hover:text-brand-500 transition-colors"
            aria-label="Account"
          >
            <FiUser size={19} />
          </button>
          <NavLink to="/contact" className="btn-brand !px-4 !py-2 text-[12.5px] ml-2">
            Get a Quote
          </NavLink>
        </div>

        <button
          type="button"
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 ml-auto"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </div>

      {/* Décor category names row */}
      <div className="hidden md:block border-t border-slate-100 bg-slate-50/60">
        <nav className="max-w-[84rem] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-start gap-x-6 gap-y-1.5">
          {categories.map((c) => (
            <NavLink
              key={c._id}
              to={`/products?category=${c._id}`}
              className="text-[13.5px] font-medium text-slate-600 hover:text-brand-500 transition-colors whitespace-nowrap"
            >
              {c.name}
            </NavLink>
          ))}
        </nav>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-100 px-4 py-4 space-y-4 bg-white">
          <form onSubmit={submitSearch} className="flex items-center rounded-lg border border-slate-200 bg-slate-50">
            <FiSearch size={15} className="ml-3 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for products"
              className="w-full bg-transparent px-2.5 py-2 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </form>

          <div className="space-y-3">
            <NavLink
              to="/favorites"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between text-[14px] font-medium text-slate-700"
            >
              Favorites
              {wishlistCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </NavLink>
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                onClick={() => setOpen(false)}
                className="block text-[14px] font-medium text-slate-700"
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <a
            href={`tel:${CONTACT_PHONE_TEL}`}
            className="flex items-center gap-2 text-[13px] font-medium text-slate-600 pt-3 border-t border-slate-100"
          >
            <FiPhone size={14} />
            {CONTACT_PHONE_DISPLAY}
          </a>
          <NavLink to="/contact" className="btn-brand w-full justify-center" onClick={() => setOpen(false)}>
            Get a Quote
          </NavLink>
        </div>
      )}
    </header>
  );
};

export default PublicNavbar;
