import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Axios 인스턴스 생성
const notificationAPI = axios.create({
  baseURL: `${API_URL}/notifications`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 추가
notificationAPI.interceptors.request.use(
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
notificationAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const notificationService = {
  // 알림 목록 조회
  getNotifications: async (params = {}) => {
    const response = await notificationAPI.get('/', { params });
    return response.data;
  },

  // 미읽 알림 수 조회
  getUnreadCount: async () => {
    const response = await notificationAPI.get('/unread-count');
    return response.data;
  },

  // 알림 읽음 처리
  markAsRead: async (id) => {
    const response = await notificationAPI.put(`/${id}/read`);
    return response.data;
  },

  // 모든 알림 읽음 처리
  markAllAsRead: async () => {
    const response = await notificationAPI.put('/mark-all-read');
    return response.data;
  },

  // 알림 삭제
  deleteNotification: async (id) => {
    const response = await notificationAPI.delete(`/${id}`);
    return response.data;
  },

  // 읽은 알림 삭제
  deleteReadNotifications: async () => {
    const response = await notificationAPI.delete('/delete-read');
    return response.data;
  },
};

export default notificationService; 