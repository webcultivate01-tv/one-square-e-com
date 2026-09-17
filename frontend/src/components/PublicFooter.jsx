import { Link } from "react-router-dom";
import { FiFacebook, FiInstagram, FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import {
  CONTACT_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
  LOGO_URL,
  SITE_TAGLINE,
} from "../utils/site.js";

const FOOTER_CATEGORIES = ["Sofas", "Recliners", "Chairs", "Living Room", "Bedroom", "Kids Furniture"];

const PublicFooter = () => (
  <footer className="bg-slate-900 text-slate-300">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
      <div>
        <img src={LOGO_URL} alt="One Square Associates" className="h-9 w-auto object-contain bg-white rounded p-1" />
        <p className="text-[13px] text-slate-400 mt-4 leading-relaxed max-w-xs">{SITE_TAGLINE}</p>
        <div className="flex items-center gap-3 mt-5">
          {[FiFacebook, FiInstagram].map((Icon, i) => (
            <span
              key={i}
              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Icon size={14} />
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-4">Shop by category</p>
        <ul className="space-y-2.5">
          {FOOTER_CATEGORIES.map((c) => (
            <li key={c}>
              <Link to="/shop" className="text-[13px] text-slate-400 hover:text-white transition-colors">
                {c}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-4">Company</p>
        <ul className="space-y-2.5">
          <li>
            <Link to="/about" className="text-[13px] text-slate-400 hover:text-white transition-colors">
              About Us
            </Link>
          </li>
          <li>
            <Link to="/shop" className="text-[13px] text-slate-400 hover:text-white transition-colors">
              Shop
            </Link>
          </li>
          <li>
            <Link to="/contact" className="text-[13px] text-slate-400 hover:text-white transition-colors">
              Contact
            </Link>
          </li>
        </ul>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-4">Get in touch</p>
        <ul className="space-y-3">
          <li className="flex items-start gap-2.5 text-[13px] text-slate-400">
            <FiMapPin size={15} className="mt-0.5 shrink-0" />
            {CONTACT_ADDRESS}
          </li>
          <li>
            <a
              href={`tel:${CONTACT_PHONE_TEL}`}
              className="flex items-center gap-2.5 text-[13px] text-slate-400 hover:text-white transition-colors"
            >
              <FiPhone size={15} className="shrink-0" />
              {CONTACT_PHONE_DISPLAY}
            </a>
          </li>
          <li>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex items-center gap-2.5 text-[13px] text-slate-400 hover:text-white transition-colors"
            >
              <FiMail size={15} className="shrink-0" />
              {CONTACT_EMAIL}
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div className="border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[12px] text-slate-500">
          © {new Date().getFullYear()} One Square Associates. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/admin/login" className="text-[11.5px] text-slate-600 hover:text-slate-400 transition-colors">
            Admin
          </Link>
          <Link to="/talecaller/login" className="text-[11.5px] text-slate-600 hover:text-slate-400 transition-colors">
            Telecaller
          </Link>
          <Link to="/sales/login" className="text-[11.5px] text-slate-600 hover:text-slate-400 transition-colors">
            Sales
          </Link>
        </div>
      </div>
    </div>
  </footer>
);

export default PublicFooter;
