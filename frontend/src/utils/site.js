/**
 * Storefront brand config in one place. Replace the placeholder contact
 * details with the real ones before going live — nothing else references
 * these except Navbar/Footer/Contact/About.
 *
 * NOTE: this reads VITE_SERVER_URL directly (not App.jsx's `serverUrl`) —
 * App.jsx imports the storefront pages that import this file, so importing
 * `serverUrl` back from App.jsx would be a circular import evaluated at
 * module-load time and throw a TDZ ReferenceError.
 */
const backendUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

export const SITE_NAME = "One Square Associates";
export const SITE_TAGLINE = "Furniture, crafted to fit your space.";
export const LOGO_URL = `${backendUrl}/uploads/one-square-logo.jpeg`;

export const CONTACT_PHONE_DISPLAY = "+91 90000 00000";
export const CONTACT_PHONE_TEL = "+919000000000";
export const CONTACT_WHATSAPP = "919000000000";
export const CONTACT_EMAIL = "hello@onesquareassociates.com";
export const CONTACT_ADDRESS = "One Square Associates, Pune, Maharashtra, India";

export const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];
