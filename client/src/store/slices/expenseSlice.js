import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as expenseService from '../../services/expenseService';

// Async thunks
export const fetchExpenses = createAsyncThunk(
  'expense/fetchExpenses',
  async ({ year, month }, { rejectWithValue }) => {
    try {
      return await expenseService.getExpenses(year, month);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchExpenseByMonth = createAsyncThunk(
  'expense/fetchExpenseByMonth',
  async ({ year, month, storeId }, { rejectWithValue }) => {
    try {
      return await expenseService.getExpenseByMonth(year, month, storeId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const saveExpenseData = createAsyncThunk(
  'expense/saveExpenseData',
  async ({ year, month, data, storeId }, { rejectWithValue }) => {
    try {
      return await expenseService.saveExpense(year, month, data, storeId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addExpenseItem = createAsyncThunk(
  'expense/addExpenseItem',
  async ({ year, month, expenseItem, storeId }, { rejectWithValue }) => {
    try {
      return await expenseService.addExpenseItem(year, month, expenseItem, storeId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateExpenseItem = createAsyncThunk(
  'expense/updateExpenseItem',
  async ({ year, month, expenseId, updateData, storeId }, { rejectWithValue }) => {
    try {
      return await expenseService.updateExpenseItem(year, month, expenseId, updateData, storeId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteExpenseItem = createAsyncThunk(
  'expense/deleteExpenseItem',
  async ({ year, month, expenseId, storeId }, { rejectWithValue }) => {
    try {
      return await expenseService.deleteExpenseItem(year, month, expenseId, storeId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAnnualStats = createAsyncThunk(
  'expense/fetchAnnualStats',
  async ({ year, storeId }, { rejectWithValue }) => {
    try {
      return await expenseService.getAnnualStats(year, storeId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchLaborCost = createAsyncThunk(
  'expense/fetchLaborCost',
  async ({ year, month, storeId }, { rejectWithValue }) => {
    try {
      return await expenseService.getLaborCost(year, month, storeId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addIncomeItem = createAsyncThunk(
  'expense/addIncomeItem',
  async ({ year, month, incomeItem, storeId }, { rejectWithValue }) => {
    try {
      return await expenseService.addIncomeItem(year, month, incomeItem, storeId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateIncomeItem = createAsyncThunk(
  'expense/updateIncomeItem',
  async ({ year, month, incomeId, incomeItem, storeId }, { rejectWithValue }) => {
    try {
      return await expenseService.updateIncomeItem(year, month, incomeId, incomeItem, storeId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteIncomeItem = createAsyncThunk(
  'expense/deleteIncomeItem',
  async ({ year, month, incomeId, storeId }, { rejectWithValue }) => {
    try {
      return await expenseService.deleteIncomeItem(year, month, incomeId, storeId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  expenses: [],
  currentExpense: null,
  annualStats: null,
  laborCost: null,
  loading: false,
  error: null,
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().getMonth() + 1
};

const expenseSlice = createSlice({
  name: 'expense',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedYear: (state, action) => {
      state.selectedYear = action.payload;
    },
    setSelectedMonth: (state, action) => {
      state.selectedMonth = action.payload;
    },
    clearCurrentExpense: (state) => {
      state.currentExpense = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchExpenses
      .addCase(fetchExpenses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.expenses = action.payload;
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // fetchExpenseByMonth
      .addCase(fetchExpenseByMonth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpenseByMonth.fulfilled, (state, action) => {
        state.loading = false;
        state.currentExpense = action.payload;
      })
      .addCase(fetchExpenseByMonth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // saveExpenseData
      .addCase(saveExpenseData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveExpenseData.fulfilled, (state, action) => {
        state.loading = false;
        state.currentExpense = action.payload;
        // expenses 배열에서 해당 월 데이터 업데이트
        const index = state.expenses.findIndex(
          exp => exp.year === action.payload.year && exp.month === action.payload.month
        );
        if (index !== -1) {
          state.expenses[index] = action.payload;
        } else {
          state.expenses.unshift(action.payload);
        }
      })
      .addCase(saveExpenseData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // addExpenseItem
      .addCase(addExpenseItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addExpenseItem.fulfilled, (state, action) => {
        state.loading = false;
        state.currentExpense = action.payload;
      })
      .addCase(addExpenseItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // updateExpenseItem
      .addCase(updateExpenseItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateExpenseItem.fulfilled, (state, action) => {
        state.loading = false;
        state.currentExpense = action.payload;
      })
      .addCase(updateExpenseItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // deleteExpenseItem
      .addCase(deleteExpenseItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteExpenseItem.fulfilled, (state, action) => {
        state.loading = false;
        state.currentExpense = action.payload;
      })
      .addCase(deleteExpenseItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // fetchAnnualStats
      .addCase(fetchAnnualStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnnualStats.fulfilled, (state, action) => {
        state.loading = false;
        state.annualStats = action.payload;
      })
      .addCase(fetchAnnualStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // fetchLaborCost
      .addCase(fetchLaborCost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLaborCost.fulfilled, (state, action) => {
        state.loading = false;
        state.laborCost = action.payload;
      })
      .addCase(fetchLaborCost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // addIncomeItem
      .addCase(addIncomeItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addIncomeItem.fulfilled, (state, action) => {
        state.loading = false;
        state.currentExpense = action.payload;
      })
      .addCase(addIncomeItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // updateIncomeItem
      .addCase(updateIncomeItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateIncomeItem.fulfilled, (state, action) => {
        state.loading = false;
        state.currentExpense = action.payload;
      })
      .addCase(updateIncomeItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // deleteIncomeItem
      .addCase(deleteIncomeItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteIncomeItem.fulfilled, (state, action) => {
        state.loading = false;
        state.currentExpense = action.payload;
      })
      .addCase(deleteIncomeItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, setSelectedYear, setSelectedMonth, clearCurrentExpense } = expenseSlice.actions;

export default expenseSlice.reducer; 