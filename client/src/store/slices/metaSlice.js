import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as storeService from '../../services/storeService';

// 점포관리에서 등록된 점포 목록 조회
export const fetchStores = createAsyncThunk(
  'meta/fetchStores',
  async (_, { rejectWithValue }) => {
    try {
      return await storeService.getStores();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 회원가입용 공개 점포 목록 조회 (점포관리에서 등록된 모든 활성화된 점포)
export const fetchPublicStores = createAsyncThunk(
  'meta/fetchPublicStores',
  async (_, { rejectWithValue }) => {
    try {
      return await storeService.getPublicStores();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchOwnerStores = createAsyncThunk(
  'meta/fetchOwnerStores',
  async (ownerId, { rejectWithValue }) => {
    try {
      return await storeService.getOwnerStores(ownerId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchStoreById = createAsyncThunk(
  'meta/fetchStoreById',
  async (storeId, { rejectWithValue }) => {
    try {
      return await storeService.getStoreById(storeId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createStore = createAsyncThunk(
  'meta/createStore',
  async (storeData, { rejectWithValue }) => {
    try {
      return await storeService.createStore(storeData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateStore = createAsyncThunk(
  'meta/updateStore',
  async ({ storeId, storeData }, { rejectWithValue }) => {
    try {
      return await storeService.updateStore(storeId, storeData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteStore = createAsyncThunk(
  'meta/deleteStore',
  async (storeId, { rejectWithValue }) => {
    try {
      return await storeService.deleteStore(storeId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  // 점포 관련 메타 정보
  stores: [],
  currentStore: null,
  selectedStoreId: null,
  
  // 사용자 메타 정보
  user: null,
  
  // 시스템 메타 정보
  system: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    appVersion: '1.0.0',
    lastSync: null
  },
  
  // UI 메타 정보
  ui: {
    sidebarCollapsed: false,
    theme: 'light',
    language: 'ko',
    notifications: []
  },
  
  // 로딩 상태
  loading: {
    stores: false,
    user: false,
    system: false
  },
  
  // 에러 상태
  error: null
};

const metaSlice = createSlice({
  name: 'meta',
  initialState,
  reducers: {
    // 점포 관련 액션
    setSelectedStoreId: (state, action) => {
      state.selectedStoreId = action.payload;
      // 선택된 점포 정보 업데이트
      if (action.payload) {
        state.currentStore = state.stores.find(store => store._id === action.payload) || null;
      } else {
        state.currentStore = null;
      }
    },
    
    // 사용자 메타 정보 액션
    setUser: (state, action) => {
      state.user = action.payload;
    },
    
    // 시스템 메타 정보 액션
    setCurrentYear: (state, action) => {
      state.system.currentYear = action.payload;
    },
    
    setCurrentMonth: (state, action) => {
      state.system.currentMonth = action.payload;
    },
    
    setLastSync: (state, action) => {
      state.system.lastSync = action.payload;
    },
    
    // UI 메타 정보 액션
    toggleSidebar: (state) => {
      state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
    },
    
    setTheme: (state, action) => {
      state.ui.theme = action.payload;
    },
    
    setLanguage: (state, action) => {
      state.ui.language = action.payload;
    },
    
    addNotification: (state, action) => {
      state.ui.notifications.push(action.payload);
    },
    
    removeNotification: (state, action) => {
      state.ui.notifications = state.ui.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    
    clearNotifications: (state) => {
      state.ui.notifications = [];
    },
    
    // 에러 처리
    clearError: (state) => {
      state.error = null;
    },
    
    setError: (state, action) => {
      state.error = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchStores
      .addCase(fetchStores.pending, (state) => {
        state.loading.stores = true;
        state.error = null;
      })
      .addCase(fetchStores.fulfilled, (state, action) => {
        state.loading.stores = false;
        // 점포 이름을 오름차순으로 정렬
        const sortedStores = action.payload.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        state.stores = sortedStores;
        // 첫 번째 점포를 기본 선택
        if (sortedStores.length > 0 && !state.selectedStoreId) {
          state.selectedStoreId = sortedStores[0]._id;
          state.currentStore = sortedStores[0];
        }
      })
      .addCase(fetchStores.rejected, (state, action) => {
        state.loading.stores = false;
        state.error = action.payload;
      })
      
      // fetchPublicStores
      .addCase(fetchPublicStores.pending, (state) => {
        state.loading.stores = true;
        state.error = null;
      })
      .addCase(fetchPublicStores.fulfilled, (state, action) => {
        state.loading.stores = false;
        // 점포 이름을 오름차순으로 정렬
        const sortedStores = action.payload.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        state.stores = sortedStores;
      })
      .addCase(fetchPublicStores.rejected, (state, action) => {
        state.loading.stores = false;
        state.error = action.payload;
      })
      
      // fetchOwnerStores
      .addCase(fetchOwnerStores.pending, (state) => {
        state.loading.stores = true;
        state.error = null;
      })
      .addCase(fetchOwnerStores.fulfilled, (state, action) => {
        state.loading.stores = false;
        // 점포 이름을 오름차순으로 정렬
        const sortedStores = action.payload.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        state.stores = sortedStores;
      })
      .addCase(fetchOwnerStores.rejected, (state, action) => {
        state.loading.stores = false;
        state.error = action.payload;
      })
      
      // fetchStoreById
      .addCase(fetchStoreById.pending, (state) => {
        state.loading.stores = true;
        state.error = null;
      })
      .addCase(fetchStoreById.fulfilled, (state, action) => {
        state.loading.stores = false;
        state.currentStore = action.payload;
      })
      .addCase(fetchStoreById.rejected, (state, action) => {
        state.loading.stores = false;
        state.error = action.payload;
      })
      
      // createStore
      .addCase(createStore.pending, (state) => {
        state.loading.stores = true;
        state.error = null;
      })
      .addCase(createStore.fulfilled, (state, action) => {
        state.loading.stores = false;
        state.stores.push(action.payload);
        // 새로 생성된 점포를 선택
        state.selectedStoreId = action.payload._id;
        state.currentStore = action.payload;
      })
      .addCase(createStore.rejected, (state, action) => {
        state.loading.stores = false;
        state.error = action.payload;
      })
      
      // updateStore
      .addCase(updateStore.pending, (state) => {
        state.loading.stores = true;
        state.error = null;
      })
      .addCase(updateStore.fulfilled, (state, action) => {
        state.loading.stores = false;
        const index = state.stores.findIndex(store => store._id === action.payload._id);
        if (index !== -1) {
          state.stores[index] = action.payload;
        }
        if (state.currentStore && state.currentStore._id === action.payload._id) {
          state.currentStore = action.payload;
        }
      })
      .addCase(updateStore.rejected, (state, action) => {
        state.loading.stores = false;
        state.error = action.payload;
      })
      
      // deleteStore
      .addCase(deleteStore.pending, (state) => {
        state.loading.stores = true;
        state.error = null;
      })
      .addCase(deleteStore.fulfilled, (state, action) => {
        state.loading.stores = false;
        state.stores = state.stores.filter(store => store._id !== action.payload.storeId);
        // 삭제된 점포가 현재 선택된 점포였다면 첫 번째 점포로 변경
        if (state.selectedStoreId === action.payload.storeId) {
          state.selectedStoreId = state.stores.length > 0 ? state.stores[0]._id : null;
          state.currentStore = state.stores.length > 0 ? state.stores[0] : null;
        }
        if (state.currentStore && state.currentStore._id === action.payload.storeId) {
          state.currentStore = null;
        }
      })
      .addCase(deleteStore.rejected, (state, action) => {
        state.loading.stores = false;
        state.error = action.payload;
      });
  }
});

export const { 
  setSelectedStoreId,
  setUser,
  setCurrentYear,
  setCurrentMonth,
  setLastSync,
  toggleSidebar,
  setTheme,
  setLanguage,
  addNotification,
  removeNotification,
  clearNotifications,
  clearError,
  setError
} = metaSlice.actions;

export default metaSlice.reducer; 