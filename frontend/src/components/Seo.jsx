import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { SITE_NAME } from "../utils/site.js";

/** Per-page <title> + description via react-helmet; the deepest mounted <Seo> wins. */
const Seo = ({ title, description, noindex }) => (
  <Helmet>
    <title>{title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Home Décor & Furniture Online`}</title>
    {description && <meta name="description" content={description} />}
    {description && <meta property="og:description" content={description} />}
    <meta property="og:title" content={title || SITE_NAME} />
    <meta property="og:site_name" content={SITE_NAME} />
    {noindex && <meta name="robots" content="noindex, nofollow" />}
  </Helmet>
);

const STORE = {
  "/": { title: "", description: "Shop premium wall art, clocks, showpieces and furniture. Thoughtfully crafted décor for modern interiors." },
  "/products": { title: "Shop All Products", description: "Browse our full collection of home décor and furniture. Filter by category and find pieces that fit your space." },
  "/favorites": { title: "My Wishlist", description: "Your saved favourite products." },
  "/about": { title: "About Us", description: `Learn about ${SITE_NAME} and our craft.` },
  "/contact": { title: "Contact Us", description: `Get in touch with ${SITE_NAME} for orders, enquiries and support.` },
};

const PORTALS = [
  ["/admin", "Admin"],
  ["/talecaller", "Telecaller"],
  ["/sales", "Sales"],
];

const PAGES = {
  "": "Dashboard",
  login: "Login",
  "change-password": "Change Password",
  "no-access": "No Access",
  products: "Products",
  categories: "Categories",
  orders: "Orders",
  enquiries: "Enquiries",
  employees: "Employees",
  customers: "Customers",
  payments: "Payments",
  export: "Data Export",
  profile: "My Profile",
  "confirm-order": "Confirm Order",
};

/** Fallback title for every route, mounted once in App. Pages needing data (product, category) render their own <Seo>. */
export const RouteSeo = () => {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, "") || "/";
  const portal = PORTALS.find(([base]) => path === base || path.startsWith(`${base}/`));

  if (portal) {
    const [base, label] = portal;
    const parts = path.slice(base.length).split("/").filter(Boolean);
    let page = PAGES[parts[0] ?? ""] ?? "Dashboard";
    if (parts[0] === "orders" && parts[2] === "confirm") page = "Confirm Order";
    else if (parts[0] === "orders" && parts[1]) page = "Order Details";
    return <Seo title={`${page} - ${label} Panel`} noindex />;
  }

  if (path.startsWith("/product/")) return null;
  const meta = STORE[path];
  return meta ? <Seo {...meta} /> : <Seo title="Page Not Found" noindex />;
};

export default Seo;
