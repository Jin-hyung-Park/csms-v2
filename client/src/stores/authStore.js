import { create } from 'zustand';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

export const useAuthStore = create((set) => ({
  ...initialState,

  // 로그인
  login: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({
      user,
      token,
      isAuthenticated: true,
    });
  },

  // 로그아웃
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({
      ...initialState,
    });
  },

  // 사용자 정보 업데이트
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  // 초기화 (토큰이 있으면 로그인 상태로)
  initialize: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({
          user,
          token,
          isAuthenticated: true,
        });
      } catch (error) {
        console.error('사용자 정보 파싱 오류:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  },
}));

