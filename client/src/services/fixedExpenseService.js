import { api } from '../utils/api';

// 고정 지출 항목 목록 조회
export const getFixedExpenses = async () => {
  try {
    const response = await api.get('/fixed-expense');
    return response;
  } catch (error) {
    throw error.response?.data || { message: '고정 지출 항목 조회 중 오류가 발생했습니다.' };
  }
};

// 특정 월에 적용 가능한 고정 지출 항목 조회
export const getApplicableFixedExpenses = async (year, month) => {
  try {
    const response = await api.get(`/fixed-expense/applicable/${year}/${month}`);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '적용 가능한 고정 지출 항목 조회 중 오류가 발생했습니다.' };
  }
};

// 고정 지출 항목 생성
export const createFixedExpense = async (data) => {
  try {
    const response = await api.post('/fixed-expense', data);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '고정 지출 항목 생성 중 오류가 발생했습니다.' };
  }
};

// 고정 지출 항목 수정
export const updateFixedExpense = async (id, data) => {
  try {
    const response = await api.put(`/fixed-expense/${id}`, data);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '고정 지출 항목 수정 중 오류가 발생했습니다.' };
  }
};

// 고정 지출 항목 삭제
export const deleteFixedExpense = async (id) => {
  try {
    const response = await api.delete(`/fixed-expense/${id}`);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '고정 지출 항목 삭제 중 오류가 발생했습니다.' };
  }
};

// 고정 지출 항목 활성화/비활성화 토글
export const toggleFixedExpense = async (id) => {
  try {
    const response = await api.put(`/fixed-expense/${id}/toggle`);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '고정 지출 항목 토글 중 오류가 발생했습니다.' };
  }
}; 