import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice.js";
import customerReducer from "./customerSlice.js";

const store = configureStore({
  reducer: {
    user: userReducer,
    customers: customerReducer,
  },
  middleware: (getDefault) => getDefault({ serializableCheck: false }),
});

export default store;
