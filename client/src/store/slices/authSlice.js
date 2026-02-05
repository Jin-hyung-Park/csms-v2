import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      localStorage.setItem('token', response.token);
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.message || '로그인에 실패했습니다';
      const errorType = error.response?.data?.errorType || 'UNKNOWN_ERROR';
      return rejectWithValue({ message: errorMessage, type: errorType });
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      localStorage.setItem('token', response.token);
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.message || '회원가입에 실패했습니다';
      const errorType = error.response?.data?.errorType || 'UNKNOWN_ERROR';
      return rejectWithValue({ message: errorMessage, type: errorType });
    }
  }
);

export const kakaoLogin = createAsyncThunk(
  'auth/kakaoLogin',
  async (kakaoData, { rejectWithValue }) => {
    try {
      const response = await authService.kakaoLogin(kakaoData);
      localStorage.setItem('token', response.token);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '카카오 로그인에 실패했습니다');
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getCurrentUser();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '사용자 정보를 가져오는데 실패했습니다');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await authService.updateProfile(profileData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '프로필 업데이트에 실패했습니다');
    }
  }
);

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: false,
  error: null,
  errorType: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
      state.errorType = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false; // 로그인 실패 시 인증 상태를 false로 설정
        state.user = null; // 로그인 실패 시 사용자 정보 제거
        state.token = null; // 로그인 실패 시 토큰 제거
        localStorage.removeItem('token'); // 로컬 스토리지의 토큰도 제거
        if (typeof action.payload === 'object' && action.payload.message) {
          state.error = action.payload.message;
          state.errorType = action.payload.type;
        } else {
          state.error = action.payload;
          state.errorType = 'UNKNOWN_ERROR';
        }
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false; // 회원가입 실패 시 인증 상태를 false로 설정
        state.user = null; // 회원가입 실패 시 사용자 정보 제거
        state.token = null; // 회원가입 실패 시 토큰 제거
        localStorage.removeItem('token'); // 로컬 스토리지의 토큰도 제거
        if (typeof action.payload === 'object' && action.payload.message) {
          state.error = action.payload.message;
          state.errorType = action.payload.type;
        } else {
          state.error = action.payload;
          state.errorType = 'UNKNOWN_ERROR';
        }
      })
      // Kakao Login
      .addCase(kakaoLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(kakaoLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(kakaoLogin.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false; // 카카오 로그인 실패 시 인증 상태를 false로 설정
        state.user = null; // 카카오 로그인 실패 시 사용자 정보 제거
        state.token = null; // 카카오 로그인 실패 시 토큰 제거
        localStorage.removeItem('token'); // 로컬 스토리지의 토큰도 제거
        state.error = action.payload;
      })
      // Get Current User
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError, setLoading } = authSlice.actions;
export default authSlice.reducer; 