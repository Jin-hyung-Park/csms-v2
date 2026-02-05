import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ownerService from '../../services/ownerService';

// Async thunks
export const getOwnerDashboard = createAsyncThunk(
  'owner/getDashboard',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await ownerService.getDashboard(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '대시보드 조회에 실패했습니다');
    }
  }
);

export const getEmployees = createAsyncThunk(
  'owner/getEmployees',
  async (params, { rejectWithValue }) => {
    try {
      const response = await ownerService.getEmployees(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '근로자 목록 조회에 실패했습니다');
    }
  }
);

export const getEmployeeDetails = createAsyncThunk(
  'owner/getEmployeeDetails',
  async (id, { rejectWithValue }) => {
    try {
      const response = await ownerService.getEmployeeDetails(id);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '근로자 상세 정보 조회에 실패했습니다');
    }
  }
);

export const updateEmployee = createAsyncThunk(
  'owner/updateEmployee',
  async ({ id, employeeData }, { rejectWithValue }) => {
    try {
      const response = await ownerService.updateEmployee(id, employeeData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '근로자 정보 수정에 실패했습니다');
    }
  }
);

export const getEmployeeStatistics = createAsyncThunk(
  'owner/getEmployeeStatistics',
  async ({ id, params }, { rejectWithValue }) => {
    try {
      const response = await ownerService.getEmployeeStatistics(id, params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '근로자 통계 조회에 실패했습니다');
    }
  }
);

export const getOwnerSchedules = createAsyncThunk(
  'owner/getSchedules',
  async (params, { rejectWithValue }) => {
    try {
      const response = await ownerService.getSchedules(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '근무 일정 조회에 실패했습니다');
    }
  }
);

export const getOwnerStatistics = createAsyncThunk(
  'owner/getStatistics',
  async (params, { rejectWithValue }) => {
    try {
      const response = await ownerService.getStatistics(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '전체 통계 조회에 실패했습니다');
    }
  }
);

const initialState = {
  dashboardData: null,
  employees: [],
  currentEmployee: null,
  schedules: [],
  statistics: null,
  loading: false,
  error: null,
  totalPages: 0,
  currentPage: 1,
  totalCount: 0,
};

const ownerSlice = createSlice({
  name: 'owner',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearDashboard: (state) => {
      state.dashboardData = null;
    },
    clearCurrentEmployee: (state) => {
      state.currentEmployee = null;
    },
    clearStatistics: (state) => {
      state.statistics = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Dashboard
      .addCase(getOwnerDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getOwnerDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardData = action.payload;
      })
      .addCase(getOwnerDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Employees
      .addCase(getEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload.employees;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(getEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Employee Details
      .addCase(getEmployeeDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEmployeeDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEmployee = action.payload;
      })
      .addCase(getEmployeeDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Employee
      .addCase(updateEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.employees.findIndex(e => e._id === action.payload._id);
        if (index !== -1) {
          state.employees[index] = action.payload;
        }
        if (state.currentEmployee?._id === action.payload._id) {
          state.currentEmployee.employee = action.payload;
        }
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Employee Statistics
      .addCase(getEmployeeStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEmployeeStatistics.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentEmployee) {
          state.currentEmployee.statistics = action.payload;
        }
      })
      .addCase(getEmployeeStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Schedules
      .addCase(getOwnerSchedules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getOwnerSchedules.fulfilled, (state, action) => {
        state.loading = false;
        state.schedules = action.payload.schedules;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(getOwnerSchedules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Statistics
      .addCase(getOwnerStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getOwnerStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = action.payload;
      })
      .addCase(getOwnerStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearDashboard, clearCurrentEmployee, clearStatistics } = ownerSlice.actions;
export default ownerSlice.reducer; 