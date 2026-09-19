/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Storefront identity — One Square Associates blue (#264796).
        brand: {
          50: "#eef2fb",
          100: "#dbe4f6",
          200: "#b0c1e8",
          300: "#849ed9",
          400: "#4d70bf",
          500: "#264796",
          600: "#1f3b7d",
          700: "#182f64",
          800: "#13254f",
          900: "#0e1c3d",
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
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
      animation: {
        fadeSlideDown: "fadeSlideDown 0.15s ease-out",
        fadeIn: "fadeIn 0.15s ease-out",
        slideInRight: "slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        popIn: "popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
