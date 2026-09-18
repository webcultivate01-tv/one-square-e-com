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
export const SITE_TAGLINE = "Your destination for home décor & furniture products.";
export const LOGO_URL = `${backendUrl}/uploads/one-square-logo.png`;

// Home hero slider — add more entries here as new banners are uploaded to uploads/Home/.
export const HERO_SLIDES = [
  {
    image: `${backendUrl}/uploads/Home/Hero1.png`,
    eyebrow: "Crafted to fit your space",
    title: "Elevate Your Space",
    subtitle: "Thoughtfully crafted décor for modern interiors.",
    bullets: [
      "Statement Wall Art",
      "Elegant Clocks & Showpieces",
      "Designed to Make an Impression",
    ],
    buttonText: "Shop Now",
    buttonLink: "/products",
  },
  {
    image: `${backendUrl}/uploads/Home/Hero2.png`,
    eyebrow: "Curated Décor",
    title: "Character & Elegance for Modern Interiors",
    subtitle: "Thoughtfully curated décor pieces designed to bring warmth and personality to every space.",
    bullets: ["Statement Wall Décor", "Sculptural Showpieces", "Clocks & Accent Pieces"],
    buttonText: "Explore Collection",
    buttonLink: "/products",
    textAlign: "left",
  },
  {
    image: `${backendUrl}/uploads/Home/Hero3.png`,
    title: "Elevate Your Everyday Space",
    subtitle:
      "Discover thoughtfully designed décor pieces that bring character, elegance, and personality to modern interiors.",
    bullets: ["Statement Wall Décor", "Sculptural Showpieces", "Clocks & Accent Pieces"],
    buttonText: "Explore Collection",
    buttonLink: "/products",
    textAlign: "left",
  },
];

// Home page "Styling guide" section — sculpture + lifestyle imagery from uploads/Home/.
export const STYLING_GUIDE = {
  sculptureImage: `${backendUrl}/uploads/Home/hps1.png`,
  lifestyleImage: `${backendUrl}/uploads/Home/hps2.png`,
};

// Home page "CTA" section — fixed background banner from uploads/Home/.
export const CTA_BACKGROUND_IMAGE = `${backendUrl}/uploads/Home/CTA.png`;

export const CONTACT_PHONE_DISPLAY = "+91 90000 00000";
export const CONTACT_PHONE_TEL = "+919000000000";
export const CONTACT_WHATSAPP = "919000000000";
export const CONTACT_EMAIL = "hello@onesquareassociates.com";
export const CONTACT_ADDRESS = "One Square Associates, Pune, Maharashtra, India";

// Footer social links — replace with the real profile URLs before going live.
export const SOCIAL_LINKS = {
  facebook: "https://facebook.com/onesquareassociates",
  instagram: "https://instagram.com/onesquareassociates",
  whatsapp: `https://wa.me/${CONTACT_WHATSAPP}`,
};

export const NAV_LINKS = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

// Placeholder Unsplash imagery — swap for real product photography once available.
const UNSPLASH = (id) => `https://images.unsplash.com/${id}?w=400&q=80&auto=format&fit=crop`;

// Home page "Featured Products" strip — placeholder catalogue + stock imagery
// until real product photography is uploaded through the admin panel.
export const FEATURED_PRODUCTS = [
  {
    name: "Velvet Tufted Accent Chair",
    category: "Home Décor",
    price: 18999,
    discountPrice: 14999,
    rating: 4.8,
    reviews: 132,
    badge: "Bestseller",
    image: UNSPLASH("photo-1567538096630-e0c55bd6374c"),
  },
  {
    name: "Marigold Lounge Chair",
    category: "Home Décor",
    price: 21499,
    rating: 4.6,
    reviews: 88,
    badge: "New",
    image: UNSPLASH("photo-1586023492125-27b2c045efd7"),
  },
  {
    name: "Boucle Two-Seater Sofa",
    category: "Home Décor",
    price: 42999,
    discountPrice: 36999,
    rating: 4.9,
    reviews: 211,
    badge: "Bestseller",
    image: UNSPLASH("photo-1493663284031-b7e3aefcae8e"),
  },
  {
    name: "Reclaimed Wood Side Table",
    category: "Table Décor",
    price: 8499,
    rating: 4.5,
    reviews: 64,
    image: UNSPLASH("photo-1519710164239-da123dc03ef4"),
  },
  {
    name: "Round Rattan Wall Mirror Duo",
    category: "Decorative Mirrors",
    price: 6999,
    discountPrice: 5499,
    rating: 4.7,
    reviews: 96,
    badge: "New",
    image: UNSPLASH("photo-1631679706909-1844bbd07221"),
  },
  {
    name: "Wooden Wall Clock",
    category: "Clocks",
    price: 3499,
    rating: 4.4,
    reviews: 57,
    image: UNSPLASH("photo-1533090161767-e6ffed986c88"),
  },
  {
    name: "Line-Art Print Set of 2",
    category: "Wall Décor",
    price: 2999,
    discountPrice: 2299,
    rating: 4.6,
    reviews: 74,
    image: UNSPLASH("photo-1586105251261-72a756497a11"),
  },
  {
    name: "Matte Arc Floor Lamp",
    category: "Table Lamps & Lighting",
    price: 11999,
    rating: 4.8,
    reviews: 103,
    badge: "Bestseller",
    image: UNSPLASH("photo-1507473885765-e6ed057f782c"),
  },
  {
    name: "Ceramic Planter Pot",
    category: "Decorative Accessories",
    price: 1499,
    discountPrice: 1199,
    rating: 4.5,
    reviews: 48,
    image: UNSPLASH("photo-1485955900006-10f4d324d411"),
  },
  {
    name: "Scented Glass Jar Candle",
    category: "Showpieces",
    price: 1299,
    rating: 4.7,
    reviews: 81,
    badge: "New",
    image: UNSPLASH("photo-1602874801007-bd458bb1b8b6"),
  },
];
