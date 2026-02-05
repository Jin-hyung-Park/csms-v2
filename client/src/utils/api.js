import axios from 'axios';
import { logger } from './logger';
import { ERROR_MESSAGES, STORAGE_KEYS } from './constants';

// API 기본 설정
// 배포 시 REACT_APP_API_URL 설정. 미설정 시: 개발은 localhost, 프로덕션은 동일 오리진 /api
const API_BASE_URL = process.env.REACT_APP_API_URL
  || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api');

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    logger.debug('API Request', {
      method: config.method?.toUpperCase(),
      url: config.url,
      data: config.data,
      params: config.params
    });
    
    return config;
  },
  (error) => {
    logger.error('API Request Error', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => {
    logger.debug('API Response', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    
    return response;
  },
  (error) => {
    logger.error('API Response Error', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message || error.message
    });
    
    // 인증 오류 처리
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// API 응답 래퍼 함수
export const apiRequest = async (config) => {
  try {
    const response = await apiClient(config);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// API 오류 처리 함수
export const handleApiError = (error) => {
  if (error.response) {
    // 서버 응답이 있는 경우
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return new Error(data.message || ERROR_MESSAGES.VALIDATION_ERROR);
      case 401:
        return new Error(ERROR_MESSAGES.UNAUTHORIZED);
      case 403:
        return new Error(ERROR_MESSAGES.FORBIDDEN);
      case 404:
        return new Error(ERROR_MESSAGES.NOT_FOUND);
      case 500:
        return new Error(ERROR_MESSAGES.SERVER_ERROR);
      default:
        return new Error(data.message || ERROR_MESSAGES.UNKNOWN_ERROR);
    }
  } else if (error.request) {
    // 요청은 보냈지만 응답이 없는 경우
    return new Error(ERROR_MESSAGES.NETWORK_ERROR);
  } else {
    // 요청 자체에 문제가 있는 경우
    return new Error(error.message || ERROR_MESSAGES.UNKNOWN_ERROR);
  }
};

// HTTP 메서드별 래퍼 함수들
export const api = {
  get: (url, params = {}) => apiRequest({ method: 'GET', url, params }),
  post: (url, data = {}) => apiRequest({ method: 'POST', url, data }),
  put: (url, data = {}) => apiRequest({ method: 'PUT', url, data }),
  patch: (url, data = {}) => apiRequest({ method: 'PATCH', url, data }),
  delete: (url) => apiRequest({ method: 'DELETE', url }),
};

// 파일 업로드 함수
export const uploadFile = async (url, file, onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// 파일 다운로드 함수
export const downloadFile = async (url, filename = null) => {
  try {
    const response = await apiClient.get(url, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return true;
  } catch (error) {
    throw handleApiError(error);
  }
};

// 쿼리 파라미터 생성 함수
export const buildQueryParams = (params) => {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => queryParams.append(key, item));
      } else {
        queryParams.append(key, value);
      }
    }
  });
  
  return queryParams.toString();
};

// URL 생성 함수
export const buildUrl = (endpoint, params = {}) => {
  const queryString = buildQueryParams(params);
  return queryString ? `${endpoint}?${queryString}` : endpoint;
};

// 페이지네이션 파라미터 생성 함수
export const buildPaginationParams = (page = 1, limit = 20, additionalParams = {}) => {
  return {
    page,
    limit,
    ...additionalParams
  };
};

// API 응답 데이터 정규화 함수
export const normalizeApiResponse = (response) => {
  if (!response) return null;
  
  // 성공 응답 구조 정규화
  if (response.success !== undefined) {
    return {
      success: response.success,
      data: response.data || response.result || response,
      message: response.message || '',
      errors: response.errors || null
    };
  }
  
  // 기본 응답 구조
  return {
    success: true,
    data: response,
    message: '',
    errors: null
  };
};

// API 요청 취소 토큰 생성 함수
export const createCancelToken = () => {
  return axios.CancelToken.source();
};

// 배치 요청 함수
export const batchRequest = async (requests) => {
  try {
    const responses = await Promise.all(requests.map(request => apiRequest(request)));
    return responses;
  } catch (error) {
    throw handleApiError(error);
  }
};

// 재시도 로직이 포함된 API 요청 함수
export const apiRequestWithRetry = async (config, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiRequest(config);
    } catch (error) {
      lastError = error;
      
      // 재시도 가능한 오류인지 확인
      if (error.message.includes(ERROR_MESSAGES.NETWORK_ERROR) || 
          error.message.includes(ERROR_MESSAGES.SERVER_ERROR)) {
        
        if (attempt < maxRetries) {
          logger.warn(`API request failed, retrying... (${attempt}/${maxRetries})`, {
            url: config.url,
            error: error.message
          });
          
          // 지수 백오프
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
          continue;
        }
      }
      
      // 재시도 불가능한 오류이거나 최대 재시도 횟수 초과
      break;
    }
  }
  
  throw lastError;
};

// 캐시된 API 요청 함수
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5분

export const cachedApiRequest = async (config, cacheKey = null) => {
  const key = cacheKey || `${config.method}-${config.url}-${JSON.stringify(config.params || {})}`;
  
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.debug('Using cached API response', { key });
    return cached.data;
  }
  
  const data = await apiRequest(config);
  cache.set(key, { data, timestamp: Date.now() });
  
  return data;
};

// 캐시 무효화 함수
export const invalidateCache = (pattern = null) => {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
  
  logger.debug('Cache invalidated', { pattern });
};

export default apiClient; 