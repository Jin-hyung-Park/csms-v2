import { api } from '../utils/api';

// 점포관리에서 등록된 점포 목록 조회 (인증된 사용자용)
export const getStores = async () => {
  try {
    const response = await api.get('/store');
    return response;
  } catch (error) {
    throw error.response?.data || { message: '점포 목록 조회 중 오류가 발생했습니다.' };
  }
};

// 점포관리에서 등록된 공개 점포 목록 조회 (회원가입용)
export const getPublicStores = async () => {
  try {
    const response = await api.get('/store/public');
    return response;
  } catch (error) {
    throw error.response?.data || { message: '점포 목록 조회 중 오류가 발생했습니다.' };
  }
};

// 점주별 점포 목록 조회 (회원가입용)
export const getOwnerStores = async (ownerId) => {
  try {
    const response = await api.get(`/store/public/owner/${ownerId}`);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '점포 목록 조회 중 오류가 발생했습니다.' };
  }
};

// 특정 점포 조회
export const getStoreById = async (storeId) => {
  try {
    const response = await api.get(`/store/${storeId}`);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '점포 조회 중 오류가 발생했습니다.' };
  }
};

// 점포 생성
export const createStore = async (storeData) => {
  try {
    const response = await api.post('/store', storeData);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '점포 생성 중 오류가 발생했습니다.' };
  }
};

// 점포 수정
export const updateStore = async (storeId, storeData) => {
  try {
    const response = await api.post(`/store/${storeId}`, storeData);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '점포 수정 중 오류가 발생했습니다.' };
  }
};

// 점포 삭제
export const deleteStore = async (storeId) => {
  try {
    const response = await api.delete(`/store/${storeId}`);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '점포 삭제 중 오류가 발생했습니다.' };
  }
}; 