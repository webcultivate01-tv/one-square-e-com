import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { FiChevronRight, FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import { serverUrl } from "../App.jsx";
import {
  CONTACT_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
  LOGO_URL,
  SITE_TAGLINE,
  SOCIAL_LINKS,
} from "../utils/site.js";

const QUICK_LINKS = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/products" },
  { label: "About Us", to: "/about" },
  { label: "Contact Us", to: "/contact" },
];

const SOCIALS = [
  { Icon: FaFacebookF, href: SOCIAL_LINKS.facebook, label: "Facebook" },
  { Icon: FaInstagram, href: SOCIAL_LINKS.instagram, label: "Instagram" },
  { Icon: FaWhatsapp, href: SOCIAL_LINKS.whatsapp, label: "WhatsApp" },
];

const CONTACT_ITEMS = [
  { Icon: FiPhone, text: CONTACT_PHONE_DISPLAY, href: `tel:${CONTACT_PHONE_TEL}` },
  { Icon: FiMail, text: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
  { Icon: FiMapPin, text: CONTACT_ADDRESS, href: null },
];

const PublicFooter = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    axios
      .get(serverUrl + "/api/category/getall", { params: { activeOnly: "true" } })
      .then((res) => {
        const all = res.data?.categories || [];
        setCategories(all.filter((c) => !c.parentId));
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="relative bg-gradient-to-b from-white to-brand-50/50 text-slate-600 border-t border-brand-100">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-300 via-brand-500 to-brand-300" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
        <div>
          <Link to="/" className="inline-flex items-center">
            <img src={LOGO_URL} alt="One Square Associates" className="h-11 w-auto object-contain" />
          </Link>
          <p className="text-[13px] text-slate-500 mt-4 leading-relaxed max-w-xs">{SITE_TAGLINE}</p>
          <div className="flex items-center gap-3 mt-6">
            {SOCIALS.map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-9 h-9 rounded-full border border-brand-200 bg-white flex items-center justify-center text-brand-500 shadow-sm hover:bg-brand-500 hover:text-white hover:border-brand-500 hover:-translate-y-0.5 transition-all duration-200"
              >
                <Icon size={14} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-slate-900 uppercase tracking-wider mb-5">Shop by category</p>
          <ul className="space-y-3">
            {categories.map((c) => (
              <li key={c._id}>
                <Link
                  to={`/products?category=${c._id}`}
                  className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-brand-500 transition-colors"
                >
                  <FiChevronRight size={13} className="text-brand-400 shrink-0" />
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-slate-900 uppercase tracking-wider mb-5">Quick Links</p>
          <ul className="space-y-3">
            {QUICK_LINKS.map(({ label, to }) => (
              <li key={label}>
                <Link
                  to={to}
                  className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-brand-500 transition-colors"
                >
                  <FiChevronRight size={13} className="text-brand-400 shrink-0" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-slate-900 uppercase tracking-wider mb-5">Get in touch</p>
          <ul className="space-y-4">
            {CONTACT_ITEMS.map(({ Icon, text, href }) => {
              const content = (
                <>
                  <span className="w-8 h-8 rounded-full bg-white border border-brand-100 flex items-center justify-center text-brand-500 shrink-0 shadow-sm">
                    <Icon size={13} />
                  </span>
                  <span className="text-[13px] text-slate-500 leading-snug pt-1">{text}</span>
                </>
              );
              return (
                <li key={text}>
                  {href ? (
                    <a href={href} className="flex items-start gap-3 hover:text-brand-500 transition-colors group">
                      {content}
                    </a>
                  ) : (
                    <div className="flex items-start gap-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex justify-center">
          <p className="text-[12px] text-slate-400 text-center">
            © {new Date().getFullYear()} One Square Associates. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
