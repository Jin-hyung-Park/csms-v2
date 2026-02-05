import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import workScheduleService from '../../services/workScheduleService';

// Async thunks
export const createWorkSchedule = createAsyncThunk(
  'workSchedule/create',
  async (scheduleData, { rejectWithValue }) => {
    try {
      const response = await workScheduleService.createWorkSchedule(scheduleData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '근무 일정 생성에 실패했습니다');
    }
  }
);

export const getWorkSchedules = createAsyncThunk(
  'workSchedule/getAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await workScheduleService.getWorkSchedules(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '근무 일정 조회에 실패했습니다');
    }
  }
);

export const getWorkSchedule = createAsyncThunk(
  'workSchedule/getOne',
  async (id, { rejectWithValue }) => {
    try {
      const response = await workScheduleService.getWorkSchedule(id);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '근무 일정 조회에 실패했습니다');
    }
  }
);

export const updateWorkSchedule = createAsyncThunk(
  'workSchedule/update',
  async ({ id, scheduleData }, { rejectWithValue }) => {
    try {
      const response = await workScheduleService.updateWorkSchedule(id, scheduleData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '근무 일정 수정에 실패했습니다');
    }
  }
);

export const deleteWorkSchedule = createAsyncThunk(
  'workSchedule/delete',
  async (id, { rejectWithValue }) => {
    try {
      await workScheduleService.deleteWorkSchedule(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '근무 일정 삭제에 실패했습니다');
    }
  }
);

export const getPendingSchedules = createAsyncThunk(
  'workSchedule/getPending',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await workScheduleService.getPendingSchedules(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '승인 대기 일정 조회에 실패했습니다');
    }
  }
);

export const getOwnerSchedules = createAsyncThunk(
  'workSchedule/getOwnerSchedules',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await workScheduleService.getAllSchedules(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '점주용 근무 일정 조회에 실패했습니다');
    }
  }
);

export const approveWorkSchedule = createAsyncThunk(
  'workSchedule/approve',
  async ({ id, action, data }, { rejectWithValue }) => {
    try {
      const response = await workScheduleService.approveWorkSchedule(id, action, data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '근무 일정 승인에 실패했습니다');
    }
  }
);

export const requestApproval = createAsyncThunk(
  'workSchedule/requestApproval',
  async (id, { rejectWithValue }) => {
    try {
      const response = await workScheduleService.requestApproval(id);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '승인 요청에 실패했습니다');
    }
  }
);

export const bulkApproveSchedules = createAsyncThunk(
  'workSchedule/bulkApprove',
  async (data, { rejectWithValue }) => {
    try {
      const response = await workScheduleService.bulkApproveSchedules(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '일괄 승인에 실패했습니다');
    }
  }
);

export const getUnifiedWeeklyStats = createAsyncThunk(
  'workSchedule/getUnifiedWeeklyStats',
  async (params, { rejectWithValue }) => {
    try {
      const response = await workScheduleService.getUnifiedWeeklyStats(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '통합 주차별 통계 조회에 실패했습니다');
    }
  }
);

const initialState = {
  schedules: [],
  currentSchedule: null,
  pendingSchedules: [],
  loading: false,
  error: null,
  totalPages: 0,
  currentPage: 1,
  totalCount: 0,
  unifiedWeeklyStats: null,
};

const workScheduleSlice = createSlice({
  name: 'workSchedule',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentSchedule: (state) => {
      state.currentSchedule = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Work Schedule
      .addCase(createWorkSchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createWorkSchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.schedules.unshift(action.payload);
      })
      .addCase(createWorkSchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Work Schedules
      .addCase(getWorkSchedules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getWorkSchedules.fulfilled, (state, action) => {
        state.loading = false;
        state.schedules = action.payload.schedules;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(getWorkSchedules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Work Schedule
      .addCase(getWorkSchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getWorkSchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSchedule = action.payload;
      })
      .addCase(getWorkSchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Work Schedule
      .addCase(updateWorkSchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateWorkSchedule.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.schedules.findIndex(s => s._id === action.payload._id);
        if (index !== -1) {
          state.schedules[index] = action.payload;
        }
        if (state.currentSchedule?._id === action.payload._id) {
          state.currentSchedule = action.payload;
        }
      })
      .addCase(updateWorkSchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete Work Schedule
      .addCase(deleteWorkSchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteWorkSchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.schedules = state.schedules.filter(s => s._id !== action.payload);
        if (state.currentSchedule?._id === action.payload) {
          state.currentSchedule = null;
        }
      })
      .addCase(deleteWorkSchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Pending Schedules
      .addCase(getPendingSchedules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPendingSchedules.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingSchedules = action.payload.schedules;
      })
      .addCase(getPendingSchedules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Owner Schedules
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
      // Approve Work Schedule
      .addCase(approveWorkSchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(approveWorkSchedule.fulfilled, (state, action) => {
        state.loading = false;
        // Update in schedules array
        const index = state.schedules.findIndex(s => s._id === action.payload._id);
        if (index !== -1) {
          state.schedules[index] = action.payload;
        }
        // Remove from pending schedules
        state.pendingSchedules = state.pendingSchedules.filter(s => s._id !== action.payload._id);
      })
      .addCase(approveWorkSchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Request Approval
      .addCase(requestApproval.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestApproval.fulfilled, (state, action) => {
        state.loading = false;
        // Update in schedules array
        const index = state.schedules.findIndex(s => s._id === action.payload._id);
        if (index !== -1) {
          state.schedules[index] = action.payload;
        }
      })
      .addCase(requestApproval.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Bulk Approve Schedules
      .addCase(bulkApproveSchedules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkApproveSchedules.fulfilled, (state, action) => {
        state.loading = false;
        // Update approved schedules in the array
        action.payload.schedules.forEach(approvedSchedule => {
          const index = state.schedules.findIndex(s => s._id === approvedSchedule._id);
          if (index !== -1) {
            state.schedules[index] = approvedSchedule;
          }
        });
      })
      .addCase(bulkApproveSchedules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Unified Weekly Stats
      .addCase(getUnifiedWeeklyStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUnifiedWeeklyStats.fulfilled, (state, action) => {
        state.loading = false;
        state.unifiedWeeklyStats = action.payload;
      })
      .addCase(getUnifiedWeeklyStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentSchedule } = workScheduleSlice.actions;
export default workScheduleSlice.reducer; 