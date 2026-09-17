import { useState } from "react";
import { NavLink } from "react-router-dom";
import { FiMenu, FiPhone, FiX } from "react-icons/fi";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, LOGO_URL, NAV_LINKS } from "../utils/site.js";

const linkClass = ({ isActive }) =>
  `text-[13.5px] font-medium transition-colors ${
    isActive ? "text-brand-500" : "text-slate-600 hover:text-brand-500"
  }`;

const PublicNavbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <NavLink to="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <img src={LOGO_URL} alt="One Square Associates" className="h-9 w-auto object-contain" />
        </NavLink>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === "/"} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a
            href={`tel:${CONTACT_PHONE_TEL}`}
            className="flex items-center gap-2 text-[13px] font-medium text-slate-600 hover:text-brand-500 transition-colors"
          >
            <FiPhone size={14} />
            {CONTACT_PHONE_DISPLAY}
          </a>
          <NavLink to="/contact" className="btn-brand !px-4 !py-2 text-[12.5px]">
            Get a Quote
          </NavLink>
        </div>

        <button
          type="button"
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-100 px-4 py-4 space-y-3 bg-white">
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
          <a
            href={`tel:${CONTACT_PHONE_TEL}`}
            className="flex items-center gap-2 text-[13px] font-medium text-slate-600 pt-2 border-t border-slate-100"
          >
            <FiPhone size={14} />
            {CONTACT_PHONE_DISPLAY}
          </a>
        </div>
      )}
    </header>
  );
};

export default PublicNavbar;
