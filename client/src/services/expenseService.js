import { api } from '../utils/api';

// 월별 비용 데이터 조회
export const getExpenses = async (year, month) => {
  try {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    
    const response = await api.get('/expense', params);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '비용 데이터 조회 중 오류가 발생했습니다.' };
  }
};

// 특정 월 비용 데이터 조회
export const getExpenseByMonth = async (year, month, storeId) => {
  try {
    const params = storeId ? { storeId } : {};
    const response = await api.get(`/expense/${year}/${month}`, params);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '월별 비용 데이터 조회 중 오류가 발생했습니다.' };
  }
};

// 월별 비용 데이터 저장
export const saveExpense = async (year, month, data, storeId) => {
  try {
    const requestData = { ...data, storeId };
    const response = await api.post(`/expense/${year}/${month}`, requestData);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '비용 데이터 저장 중 오류가 발생했습니다.' };
  }
};

// 지출 항목 추가
export const addExpenseItem = async (year, month, expenseItem, storeId) => {
  try {
    const requestData = { ...expenseItem, storeId };
    const response = await api.post(`/expense/${year}/${month}/expenses`, requestData);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '지출 항목 추가 중 오류가 발생했습니다.' };
  }
};

// 지출 항목 수정
export const updateExpenseItem = async (year, month, expenseId, updateData, storeId) => {
  try {
    const requestData = { ...updateData, storeId };
    const response = await api.put(`/expense/${year}/${month}/expenses/${expenseId}`, requestData);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '지출 항목 수정 중 오류가 발생했습니다.' };
  }
};

// 지출 항목 삭제
export const deleteExpenseItem = async (year, month, expenseId, storeId) => {
  try {
    const params = storeId ? { storeId } : {};
    const response = await api.delete(`/expense/${year}/${month}/expenses/${expenseId}`, params);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '지출 항목 삭제 중 오류가 발생했습니다.' };
  }
};

// 연간 통계 조회
export const getAnnualStats = async (year, storeId) => {
  try {
    const params = storeId ? { storeId } : {};
    const response = await api.get(`/expense/stats/annual/${year}`, params);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '연간 통계 조회 중 오류가 발생했습니다.' };
  }
};

// 월별 인건비 조회
export const getLaborCost = async (year, month, storeId) => {
  try {
    const params = storeId ? { storeId } : {};
    const response = await api.get(`/expense/labor-cost/${year}/${month}`, params);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '인건비 조회 중 오류가 발생했습니다.' };
  }
};

// 입금 항목 추가
export const addIncomeItem = async (year, month, incomeItem, storeId) => {
  try {
    const requestData = { ...incomeItem, storeId };
    const response = await api.post(`/expense/${year}/${month}/income`, requestData);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '입금 항목 추가 중 오류가 발생했습니다.' };
  }
};

// 입금 항목 수정
export const updateIncomeItem = async (year, month, incomeId, incomeItem, storeId) => {
  try {
    const requestData = { ...incomeItem, storeId };
    const response = await api.put(`/expense/${year}/${month}/income/${incomeId}`, requestData);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '입금 항목 수정 중 오류가 발생했습니다.' };
  }
};

// 입금 항목 삭제
export const deleteIncomeItem = async (year, month, incomeId, storeId) => {
  try {
    const params = storeId ? { storeId } : {};
    const response = await api.delete(`/expense/${year}/${month}/income/${incomeId}`, params);
    return response;
  } catch (error) {
    throw error.response?.data || { message: '입금 항목 삭제 중 오류가 발생했습니다.' };
  }
}; 