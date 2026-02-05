import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import employeeService from '../../services/employeeService';

// Async thunks
export const getEmployeeDashboard = createAsyncThunk(
  'employee/getDashboard',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await employeeService.getDashboard(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '대시보드 조회에 실패했습니다');
    }
  }
);

export const getEmployeeStatistics = createAsyncThunk(
  'employee/getStatistics',
  async (params, { rejectWithValue }) => {
    try {
      const response = await employeeService.getStatistics(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '통계 조회에 실패했습니다');
    }
  }
);

export const updateEmployeeProfile = createAsyncThunk(
  'employee/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await employeeService.updateProfile(profileData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '프로필 업데이트에 실패했습니다');
    }
  }
);

export const getEmployeeSchedules = createAsyncThunk(
  'employee/getSchedules',
  async (params, { rejectWithValue }) => {
    try {
      const response = await employeeService.getSchedules(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '근무 일정 조회에 실패했습니다');
    }
  }
);

const initialState = {
  dashboard: null,
  statistics: null,
  schedules: [],
  loading: false,
  error: null,
  totalPages: 0,
  currentPage: 1,
  totalCount: 0,
};

const employeeSlice = createSlice({
  name: 'employee',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearDashboard: (state) => {
      state.dashboard = null;
    },
    clearStatistics: (state) => {
      state.statistics = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Dashboard
      .addCase(getEmployeeDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEmployeeDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload;
      })
      .addCase(getEmployeeDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Statistics
      .addCase(getEmployeeStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEmployeeStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = action.payload;
      })
      .addCase(getEmployeeStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Profile
      .addCase(updateEmployeeProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEmployeeProfile.fulfilled, (state, action) => {
        state.loading = false;
        // Update user in auth state as well
        // This will be handled by the auth slice
      })
      .addCase(updateEmployeeProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Schedules
      .addCase(getEmployeeSchedules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEmployeeSchedules.fulfilled, (state, action) => {
        state.loading = false;
        state.schedules = action.payload.schedules;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(getEmployeeSchedules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearDashboard, clearStatistics } = employeeSlice.actions;
export default employeeSlice.reducer; 