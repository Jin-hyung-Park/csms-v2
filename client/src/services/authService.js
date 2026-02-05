import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Axios 인스턴스 생성
const authAPI = axios.create({
  baseURL: `${API_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 추가
authAPI.interceptors.request.use(
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
authAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const authService = {
  // 로그인
  login: async (credentials) => {
    const response = await authAPI.post('/login', credentials);
    return response.data;
  },

  // 회원가입
  register: async (userData) => {
    const response = await authAPI.post('/register', userData);
    return response.data;
  },

  // 카카오 로그인
  kakaoLogin: async (kakaoData) => {
    const response = await authAPI.post('/kakao', kakaoData);
    return response.data;
  },

  // 현재 사용자 정보 가져오기
  getCurrentUser: async () => {
    const response = await authAPI.get('/me');
    return response.data;
  },

  // 프로필 업데이트
  updateProfile: async (profileData) => {
    const response = await authAPI.put('/profile', profileData);
    return response.data;
  },

  // 로그아웃 (클라이언트에서 토큰 제거)
  logout: () => {
    localStorage.removeItem('token');
  },

  // 점주 목록 조회 (회원가입용)
  getOwners: async () => {
    const response = await authAPI.get('/owners');
    return response.data;
  },
};

export default authService; 