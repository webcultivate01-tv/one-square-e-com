import { createSlice } from "@reduxjs/toolkit";

export const DEFAULT_FILTERS = {
  search: "",
  status: "all",
  verified: "all",
  hasOrders: "all",
  tag: "all",
  country: "",
  minSpent: "",
  fromDate: "",
  toDate: "",
  includeDeleted: false,
};

const initialState = {
  list: {
    items: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    sort: "newest",
    filters: { ...DEFAULT_FILTERS },
    selected: [],
    tagSuggestions: [],
  },
  detail: {
    customer: null,
    analytics: null,
    recentOrders: [],
    orders: [],
    activity: [],
  },
  dashboard: { summary: null, signupTrend: null, topSpenders: [] },
};

const customerSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {
    setCustomerList: (state, action) => {
      state.list.items = action.payload.customers || [];
      state.list.total = action.payload.total || 0;
      state.list.totalPages = action.payload.totalPages || 1;
      state.list.tagSuggestions = action.payload.tagSuggestions || [];
    },
    setPage: (state, action) => {
      state.list.page = Math.max(1, action.payload);
    },
    setSort: (state, action) => {
      state.list.sort = action.payload;
      state.list.page = 1;
    },
    setFilter: (state, action) => {
      const { key, value } = action.payload;
      state.list.filters[key] = value;
      state.list.page = 1;
    },
    resetFilters: (state) => {
      state.list.filters = { ...DEFAULT_FILTERS };
      state.list.page = 1;
    },
    toggleSelected: (state, action) => {
      const id = action.payload;
      state.list.selected = state.list.selected.includes(id)
        ? state.list.selected.filter((x) => x !== id)
        : [...state.list.selected, id];
    },
    selectAllOnPage: (state) => {
      const ids = state.list.items.map((c) => c._id);
      const allSelected = ids.every((id) => state.list.selected.includes(id));
      state.list.selected = allSelected
        ? state.list.selected.filter((id) => !ids.includes(id))
        : [...new Set([...state.list.selected, ...ids])];
    },
    clearSelection: (state) => {
      state.list.selected = [];
    },
    setCustomerDetail: (state, action) => {
      state.detail.customer = action.payload.customer || null;
      state.detail.analytics = action.payload.analytics || null;
      state.detail.recentOrders = action.payload.recentOrders || [];
    },
    setCustomerOrders: (state, action) => {
      state.detail.orders = action.payload;
    },
    setCustomerActivity: (state, action) => {
      state.detail.activity = action.payload;
    },
    closeDetail: (state) => {
      state.detail = { ...initialState.detail };
    },
    setCustomerDashboard: (state, action) => {
      state.dashboard.summary = action.payload.summary || null;
      state.dashboard.signupTrend = action.payload.signupTrend || null;
      state.dashboard.topSpenders = action.payload.topSpenders || [];
    },
  },
});

export const {
  setCustomerList,
  setPage,
  setSort,
  setFilter,
  resetFilters,
  toggleSelected,
  selectAllOnPage,
  clearSelection,
  setCustomerDetail,
  setCustomerOrders,
  setCustomerActivity,
  closeDetail,
  setCustomerDashboard,
} = customerSlice.actions;

export default customerSlice.reducer;
