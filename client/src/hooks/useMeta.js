import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  fetchStores,
  fetchStoreById,
  createStore,
  updateStore,
  deleteStore,
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
} from '../store/slices/metaSlice';

// 점포관리 메타 정보 관리 훅
export const useMeta = () => {
  const dispatch = useDispatch();
  const meta = useSelector(state => state.meta);

  const memoizedFetchStores = useCallback(() => {
    dispatch(fetchStores());
  }, [dispatch]);

  const memoizedFetchStoreById = useCallback((storeId) => {
    dispatch(fetchStoreById(storeId));
  }, [dispatch]);

  const memoizedCreateStore = useCallback((storeData) => {
    dispatch(createStore(storeData));
  }, [dispatch]);

  const memoizedUpdateStore = useCallback((storeId, storeData) => {
    dispatch(updateStore({ storeId, storeData }));
  }, [dispatch]);

  const memoizedDeleteStore = useCallback((storeId) => {
    dispatch(deleteStore(storeId));
  }, [dispatch]);

  return {
    // 상태
    ...meta,
    
    // 점포 관련 액션
    fetchStores: memoizedFetchStores,
    fetchStoreById: memoizedFetchStoreById,
    createStore: memoizedCreateStore,
    updateStore: memoizedUpdateStore,
    deleteStore: memoizedDeleteStore,
    setSelectedStoreId: (storeId) => dispatch(setSelectedStoreId(storeId)),
    
    // 사용자 관련 액션
    setUser: (user) => dispatch(setUser(user)),
    
    // 시스템 관련 액션
    setCurrentYear: (year) => dispatch(setCurrentYear(year)),
    setCurrentMonth: (month) => dispatch(setCurrentMonth(month)),
    setLastSync: (timestamp) => dispatch(setLastSync(timestamp)),
    
    // UI 관련 액션
    toggleSidebar: () => dispatch(toggleSidebar()),
    setTheme: (theme) => dispatch(setTheme(theme)),
    setLanguage: (language) => dispatch(setLanguage(language)),
    addNotification: (notification) => dispatch(addNotification(notification)),
    removeNotification: (notificationId) => dispatch(removeNotification(notificationId)),
    clearNotifications: () => dispatch(clearNotifications()),
    
    // 에러 관련 액션
    clearError: () => dispatch(clearError()),
    setError: (error) => dispatch(setError(error))
  };
};

// 점포관리에서 등록된 점포 선택 훅
export const useStoreSelection = () => {
  const dispatch = useDispatch();
  const { stores, selectedStoreId, currentStore, loading } = useSelector(state => state.meta);

  const memoizedFetchStores = useCallback(() => {
    dispatch(fetchStores());
  }, [dispatch]);

  return {
    stores,
    selectedStoreId,
    currentStore,
    loading: loading.stores,
    setSelectedStore: (storeId) => dispatch(setSelectedStoreId(storeId)),
    fetchStores: memoizedFetchStores
  };
};

// 사용자 메타 정보 훅
export const useUserMeta = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.meta);

  return {
    user,
    setUser: (user) => dispatch(setUser(user))
  };
};

// 시스템 메타 정보 훅
export const useSystemMeta = () => {
  const dispatch = useDispatch();
  const { system } = useSelector(state => state.meta);

  return {
    system,
    setCurrentYear: (year) => dispatch(setCurrentYear(year)),
    setCurrentMonth: (month) => dispatch(setCurrentMonth(month)),
    setLastSync: (timestamp) => dispatch(setLastSync(timestamp))
  };
};

// UI 메타 정보 훅
export const useUIMeta = () => {
  const dispatch = useDispatch();
  const { ui } = useSelector(state => state.meta);

  return {
    ui,
    toggleSidebar: () => dispatch(toggleSidebar()),
    setTheme: (theme) => dispatch(setTheme(theme)),
    setLanguage: (language) => dispatch(setLanguage(language)),
    addNotification: (notification) => dispatch(addNotification(notification)),
    removeNotification: (notificationId) => dispatch(removeNotification(notificationId)),
    clearNotifications: () => dispatch(clearNotifications())
  };
};

// 알림 관리 훅
export const useNotifications = () => {
  const dispatch = useDispatch();
  const { notifications } = useSelector(state => state.meta.ui);

  const addNotification = (message, type = 'info', duration = 5000) => {
    const id = Date.now().toString();
    const notification = {
      id,
      message,
      type,
      timestamp: new Date().toISOString()
    };
    
    dispatch(addNotification(notification));
    
    if (duration > 0) {
      setTimeout(() => {
        dispatch(removeNotification(id));
      }, duration);
    }
    
    return id;
  };

  return {
    notifications,
    addNotification,
    removeNotification: (id) => dispatch(removeNotification(id)),
    clearNotifications: () => dispatch(clearNotifications())
  };
}; 