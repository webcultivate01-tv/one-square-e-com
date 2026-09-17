import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { serverUrl } from "../api/client.js";

/** Pre-bound instance for the whole customer module. */
const customerApi = axios.create({
  baseURL: `${serverUrl}/api/admin/customers`,
  withCredentials: true,
  timeout: 30000,
});

const reject = (error, rejectWithValue) =>
  rejectWithValue(error?.response?.data?.message || error.message || "Request failed.");

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

/* ------------------------------------------------------------------ thunks */

export const fetchCustomers = createAsyncThunk(
  "customers/fetchList",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { list } = getState().customers;
      const params = { page: list.page, limit: list.limit, sort: list.sort };
      for (const [key, value] of Object.entries(list.filters)) {
        if (value === "" || value === "all" || value === false) continue;
        params[key] = value;
      }
      const { data } = await customerApi.get("/", { params });
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const fetchCustomerDashboard = createAsyncThunk(
  "customers/fetchDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.get("/analytics/summary");
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const fetchCustomerDetail = createAsyncThunk(
  "customers/fetchDetail",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.get(`/${id}`);
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const fetchCustomerOrders = createAsyncThunk(
  "customers/fetchOrders",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.get(`/${id}/orders`, { params: { limit: 20 } });
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const fetchCustomerActivity = createAsyncThunk(
  "customers/fetchActivity",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.get(`/${id}/activity`, { params: { limit: 100 } });
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const updateCustomerStatus = createAsyncThunk(
  "customers/updateStatus",
  async ({ id, status, reason }, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.patch(`/${id}/status`, { status, reason });
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const verifyCustomer = createAsyncThunk(
  "customers/verify",
  async ({ id, verified }, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.patch(`/${id}/verify`, { verified });
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const updateCustomerTags = createAsyncThunk(
  "customers/updateTags",
  async ({ id, tags }, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.put(`/${id}/tags`, { tags });
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const addCustomerNote = createAsyncThunk(
  "customers/addNote",
  async ({ id, body }, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.post(`/${id}/notes`, { body });
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const deleteCustomerNote = createAsyncThunk(
  "customers/deleteNote",
  async ({ id, noteId }, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.delete(`/${id}/notes/${noteId}`);
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const forceLogoutCustomer = createAsyncThunk(
  "customers/forceLogout",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.post(`/${id}/force-logout`);
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const resetCustomerPassword = createAsyncThunk(
  "customers/resetPassword",
  async ({ id, password }, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.post(`/${id}/reset-password`, { password });
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const emailCustomer = createAsyncThunk(
  "customers/email",
  async ({ id, subject, body }, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.post(`/${id}/email`, { subject, body });
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const softDeleteCustomer = createAsyncThunk(
  "customers/softDelete",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.delete(`/${id}`);
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const restoreCustomer = createAsyncThunk(
  "customers/restore",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.post(`/${id}/restore`);
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const bulkCustomerAction = createAsyncThunk(
  "customers/bulkAction",
  async ({ customerIds, action, reason }, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.post("/bulk-action", { customerIds, action, reason });
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

export const bulkEmailCustomers = createAsyncThunk(
  "customers/bulkEmail",
  async ({ customerIds, subject, body }, { rejectWithValue }) => {
    try {
      const { data } = await customerApi.post("/bulk-email", { customerIds, subject, body });
      return data;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }
);

/* ------------------------------------------------------------------- slice */

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
    loading: false,
    error: null,
  },
  detail: {
    customer: null,
    analytics: null,
    recentOrders: [],
    orders: [],
    activity: [],
    loading: false,
    working: false,
    error: null,
  },
  dashboard: { summary: null, signupTrend: null, topSpenders: [], loading: false },
};

const customerSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {
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
    closeDetail: (state) => {
      state.detail = { ...initialState.detail };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.list.loading = true;
        state.list.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.list.loading = false;
        state.list.items = action.payload.customers || [];
        state.list.total = action.payload.total || 0;
        state.list.totalPages = action.payload.totalPages || 1;
        state.list.tagSuggestions = action.payload.tagSuggestions || [];
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.list.loading = false;
        state.list.error = action.payload;
      })

      .addCase(fetchCustomerDashboard.pending, (state) => {
        state.dashboard.loading = true;
      })
      .addCase(fetchCustomerDashboard.fulfilled, (state, action) => {
        state.dashboard.loading = false;
        state.dashboard.summary = action.payload.summary;
        state.dashboard.signupTrend = action.payload.signupTrend;
        state.dashboard.topSpenders = action.payload.topSpenders || [];
      })
      .addCase(fetchCustomerDashboard.rejected, (state) => {
        state.dashboard.loading = false;
      })

      .addCase(fetchCustomerDetail.pending, (state) => {
        state.detail.loading = true;
        state.detail.error = null;
      })
      .addCase(fetchCustomerDetail.fulfilled, (state, action) => {
        state.detail.loading = false;
        state.detail.customer = action.payload.customer;
        state.detail.analytics = action.payload.analytics;
        state.detail.recentOrders = action.payload.recentOrders || [];
      })
      .addCase(fetchCustomerDetail.rejected, (state, action) => {
        state.detail.loading = false;
        state.detail.error = action.payload;
      })

      .addCase(fetchCustomerOrders.fulfilled, (state, action) => {
        state.detail.orders = action.payload.orders || [];
      })
      .addCase(fetchCustomerActivity.fulfilled, (state, action) => {
        state.detail.activity = action.payload.activity || [];
      });

    // Every mutation that returns a customer refreshes the open drawer.
    for (const thunk of [
      updateCustomerStatus,
      verifyCustomer,
      updateCustomerTags,
      addCustomerNote,
      deleteCustomerNote,
    ]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.detail.working = true;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.detail.working = false;
          if (action.payload?.customer) state.detail.customer = action.payload.customer;
        })
        .addCase(thunk.rejected, (state) => {
          state.detail.working = false;
        });
    }

    for (const thunk of [
      forceLogoutCustomer,
      resetCustomerPassword,
      emailCustomer,
      softDeleteCustomer,
      restoreCustomer,
    ]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.detail.working = true;
        })
        .addCase(thunk.fulfilled, (state) => {
          state.detail.working = false;
        })
        .addCase(thunk.rejected, (state) => {
          state.detail.working = false;
        });
    }
  },
});

export const {
  setPage,
  setSort,
  setFilter,
  resetFilters,
  toggleSelected,
  selectAllOnPage,
  clearSelection,
  closeDetail,
} = customerSlice.actions;

export default customerSlice.reducer;
