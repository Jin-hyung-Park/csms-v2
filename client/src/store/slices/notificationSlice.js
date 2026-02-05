import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import notificationService from '../../services/notificationService';

// Async thunks
export const getNotifications = createAsyncThunk(
  'notification/getAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await notificationService.getNotifications(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '알림 조회에 실패했습니다');
    }
  }
);

export const getUnreadCount = createAsyncThunk(
  'notification/getUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.getUnreadCount();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '미읽 알림 수 조회에 실패했습니다');
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notification/markAsRead',
  async (id, { rejectWithValue }) => {
    try {
      const response = await notificationService.markAsRead(id);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '알림 읽음 처리에 실패했습니다');
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notification/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.markAllAsRead();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '모든 알림 읽음 처리에 실패했습니다');
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notification/delete',
  async (id, { rejectWithValue }) => {
    try {
      await notificationService.deleteNotification(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '알림 삭제에 실패했습니다');
    }
  }
);

export const deleteReadNotifications = createAsyncThunk(
  'notification/deleteRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.deleteReadNotifications();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '읽은 알림 삭제에 실패했습니다');
    }
  }
);

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  totalPages: 0,
  currentPage: 1,
  totalCount: 0,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
    },
    updateNotification: (state, action) => {
      const index = state.notifications.findIndex(n => n._id === action.payload._id);
      if (index !== -1) {
        const wasRead = state.notifications[index].isRead;
        const isNowRead = action.payload.isRead;
        
        state.notifications[index] = action.payload;
        
        if (!wasRead && isNowRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        } else if (wasRead && !isNowRead) {
          state.unreadCount += 1;
        }
      }
    },
    removeNotification: (state, action) => {
      const notification = state.notifications.find(n => n._id === action.payload);
      if (notification && !notification.isRead) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
      state.notifications = state.notifications.filter(n => n._id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Notifications
      .addCase(getNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(getNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Unread Count
      .addCase(getUnreadCount.pending, (state) => {
        state.error = null;
      })
      .addCase(getUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.count;
      })
      .addCase(getUnreadCount.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Mark As Read
      .addCase(markAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.notifications.findIndex(n => n._id === action.payload._id);
        if (index !== -1) {
          const wasRead = state.notifications[index].isRead;
          state.notifications[index] = action.payload;
          
          if (!wasRead && action.payload.isRead) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Mark All As Read
      .addCase(markAllAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.loading = false;
        state.notifications = state.notifications.map(n => ({ ...n, isRead: true }));
        state.unreadCount = 0;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete Notification
      .addCase(deleteNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.loading = false;
        const notification = state.notifications.find(n => n._id === action.payload);
        if (notification && !notification.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications = state.notifications.filter(n => n._id !== action.payload);
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete Read Notifications
      .addCase(deleteReadNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteReadNotifications.fulfilled, (state) => {
        state.loading = false;
        state.notifications = state.notifications.filter(n => !n.isRead);
      })
      .addCase(deleteReadNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, addNotification, updateNotification, removeNotification } = notificationSlice.actions;
export default notificationSlice.reducer; 