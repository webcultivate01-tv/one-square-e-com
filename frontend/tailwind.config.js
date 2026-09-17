/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Storefront identity — warm retail orange.
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
        // Admin console ground.
        console: {
          bg: "#F7F8FA",
        },
        // Packaging-industry chart palette (kraft, corrugated, logistics signage).
        kraft: "#A0764B",
        cardboard: "#C6884B",
        industrial: "#2563EB",
        ocean: "#0891B2",
        forest: "#0F766E",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      keyframes: {
        fadeSlideDown: {
          "0%": { opacity: "0", transform: "translateY(-6px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        fadeSlideDown: "fadeSlideDown 0.15s ease-out",
        fadeIn: "fadeIn 0.15s ease-out",
        slideInRight: "slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
