import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice.js";
import customerReducer from "./customerSlice.js";
import wishlistReducer from "./wishlistSlice.js";

const store = configureStore({
  reducer: {
    user: userReducer,
    customers: customerReducer,
    wishlist: wishlistReducer,
  },
  middleware: (getDefault) => getDefault({ serializableCheck: false }),
});

/** Storefront wishlist persists to localStorage so it survives a page refresh. */
store.subscribe(() => {
  const state = store.getState();
  try {
    localStorage.setItem("osa_wishlist", JSON.stringify(state.wishlist.items));
  } catch {
    // storage unavailable (private browsing, quota) — wishlist just won't persist
  }
});

export default store;
