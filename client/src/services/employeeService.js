import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Axios 인스턴스 생성
const employeeAPI = axios.create({
  baseURL: `${API_URL}/employee`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 추가
employeeAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
employeeAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const employeeService = {
  // 대시보드 조회
  getDashboard: async (params = {}) => {
    const response = await employeeAPI.get('/dashboard', { params });
    return response.data;
  },

  // 통계 조회
  getStatistics: async (params = {}) => {
    const response = await employeeAPI.get('/statistics', { params });
    return response.data;
  },

  // 프로필 업데이트
  updateProfile: async (profileData) => {
    const response = await employeeAPI.put('/profile', profileData);
    return response.data;
  },

  // 근무 일정 조회
  getSchedules: async (params = {}) => {
    const response = await employeeAPI.get('/schedules', { params });
    return response.data;
  },

  // 주차별 근로 통계 조회
  getWeeklyStats: async (params = {}) => {
    const response = await employeeAPI.get('/weekly-stats', { params });
    return response.data;
  },

  // 주휴수당 조회
  getHolidayPay: async (params = {}) => {
    const response = await axios.get(`${API_URL}/monthly-salary/holiday-pay`, { 
      params,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },
};

export default employeeService; 