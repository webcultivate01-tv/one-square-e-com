import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "osa_wishlist";

const loadInitialItems = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const initialState = {
  items: loadInitialItems(),
};

/** Normalises a product (from the API or FEATURED_PRODUCTS mock data) into a wishlist entry. */
const toEntry = (product) => ({
  productId: product._id || product.slug || product.name,
  name: product.name,
  slug: product.slug || "",
  image: product.images?.[0] || product.image || "",
  price: product.price,
  discountPrice: product.discountPrice || 0,
  currency: product.currency || "INR",
  category: product.category?.name || product.category || "",
});

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    addToWishlist: (state, action) => {
      const entry = toEntry(action.payload);
      if (!state.items.some((i) => i.productId === entry.productId)) state.items.push(entry);
    },
    removeFromWishlist: (state, action) => {
      state.items = state.items.filter((i) => i.productId !== action.payload);
    },
    toggleWishlist: (state, action) => {
      const entry = toEntry(action.payload);
      const exists = state.items.some((i) => i.productId === entry.productId);
      state.items = exists
        ? state.items.filter((i) => i.productId !== entry.productId)
        : [...state.items, entry];
    },
    clearWishlist: (state) => {
      state.items = [];
    },
  },
});

export const { addToWishlist, removeFromWishlist, toggleWishlist, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;

export const selectWishlistItems = (state) => state.wishlist.items;
export const selectWishlistCount = (state) => state.wishlist.items.length;
export const selectIsWishlisted = (productId) => (state) =>
  state.wishlist.items.some((i) => i.productId === productId);
