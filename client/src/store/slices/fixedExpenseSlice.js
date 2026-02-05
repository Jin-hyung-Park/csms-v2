import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as fixedExpenseService from '../../services/fixedExpenseService';

// Async thunks
export const fetchFixedExpenses = createAsyncThunk(
  'fixedExpense/fetchFixedExpenses',
  async (_, { rejectWithValue }) => {
    try {
      return await fixedExpenseService.getFixedExpenses();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchApplicableFixedExpenses = createAsyncThunk(
  'fixedExpense/fetchApplicableFixedExpenses',
  async ({ year, month }, { rejectWithValue }) => {
    try {
      return await fixedExpenseService.getApplicableFixedExpenses(year, month);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createFixedExpense = createAsyncThunk(
  'fixedExpense/createFixedExpense',
  async (data, { rejectWithValue }) => {
    try {
      return await fixedExpenseService.createFixedExpense(data);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateFixedExpense = createAsyncThunk(
  'fixedExpense/updateFixedExpense',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await fixedExpenseService.updateFixedExpense(id, data);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteFixedExpense = createAsyncThunk(
  'fixedExpense/deleteFixedExpense',
  async (id, { rejectWithValue }) => {
    try {
      await fixedExpenseService.deleteFixedExpense(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const toggleFixedExpense = createAsyncThunk(
  'fixedExpense/toggleFixedExpense',
  async (id, { rejectWithValue }) => {
    try {
      return await fixedExpenseService.toggleFixedExpense(id);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  fixedExpenses: [],
  applicableFixedExpenses: [],
  loading: false,
  error: null
};

const fixedExpenseSlice = createSlice({
  name: 'fixedExpense',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchFixedExpenses
      .addCase(fetchFixedExpenses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFixedExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.fixedExpenses = action.payload;
      })
      .addCase(fetchFixedExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // fetchApplicableFixedExpenses
      .addCase(fetchApplicableFixedExpenses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApplicableFixedExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.applicableFixedExpenses = action.payload;
      })
      .addCase(fetchApplicableFixedExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // createFixedExpense
      .addCase(createFixedExpense.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFixedExpense.fulfilled, (state, action) => {
        state.loading = false;
        state.fixedExpenses.unshift(action.payload);
      })
      .addCase(createFixedExpense.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // updateFixedExpense
      .addCase(updateFixedExpense.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFixedExpense.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.fixedExpenses.findIndex(exp => exp._id === action.payload._id);
        if (index !== -1) {
          state.fixedExpenses[index] = action.payload;
        }
      })
      .addCase(updateFixedExpense.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // deleteFixedExpense
      .addCase(deleteFixedExpense.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteFixedExpense.fulfilled, (state, action) => {
        state.loading = false;
        state.fixedExpenses = state.fixedExpenses.filter(exp => exp._id !== action.payload);
      })
      .addCase(deleteFixedExpense.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // toggleFixedExpense
      .addCase(toggleFixedExpense.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleFixedExpense.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.fixedExpenses.findIndex(exp => exp._id === action.payload._id);
        if (index !== -1) {
          state.fixedExpenses[index] = action.payload;
        }
      })
      .addCase(toggleFixedExpense.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError } = fixedExpenseSlice.actions;

export default fixedExpenseSlice.reducer; 