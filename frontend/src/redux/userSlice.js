import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  userData: null,
  /** Every guard waits on this so there is no redirect flash on boot. */
  authChecked: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
    },
    setAuthChecked: (state, action) => {
      state.authChecked = action.payload !== false;
    },
    clearUser: (state) => {
      state.userData = null;
    },
  },
});

export const { setUserData, setAuthChecked, clearUser } = userSlice.actions;
export default userSlice.reducer;

/** Roles an Admin can create/manage through Employee Management. */
export const EMPLOYEE_ROLES = ["telecaller", "sales"];
/** Every role that can sign into the admin console. */
export const STAFF_ROLES = ["admin", ...EMPLOYEE_ROLES];

export const isStaffRole = (role) => STAFF_ROLES.includes(role);

/** Mirrors the server's hasPermission middleware exactly. */
export const can = (user, key) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!EMPLOYEE_ROLES.includes(user.role)) return false;
  return Array.isArray(user.permissions) && user.permissions.includes(key);
};
