import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import PublicNavbar from "./PublicNavbar.jsx";
import PublicFooter from "./PublicFooter.jsx";
import { CONTACT_WHATSAPP } from "../utils/site.js";

const PublicLayout = () => {
  const { pathname } = useLocation();

  // Start every page at the top; only pathname changes, so filter/query updates keep scroll position.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
  <div className="min-h-screen flex flex-col bg-white">
    <PublicNavbar />
    <div className="flex-1">
      <Outlet />
    </div>
    <PublicFooter />

    <a
      href={`https://wa.me/${CONTACT_WHATSAPP}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-40 w-[52px] h-[52px] rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
    >
      <FaWhatsapp size={26} />
    </a>
  </div>
  );
};

export default PublicLayout;
