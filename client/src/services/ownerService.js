import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Axios 인스턴스 생성
const ownerAPI = axios.create({
  baseURL: `${API_URL}/owner`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 추가
ownerAPI.interceptors.request.use(
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
ownerAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const ownerService = {
  // 대시보드 조회
  getDashboard: async (params = {}) => {
    const response = await ownerAPI.get('/dashboard', { params });
    return response.data;
  },

  // 근로자 목록 조회
  getEmployees: async (params = {}) => {
    const response = await ownerAPI.get('/employees', { params });
    return response.data;
  },

  // 근로자 필터용 목록 조회 (간단한 정보만)
  getEmployeesForFilter: async (params = {}) => {
    const response = await ownerAPI.get('/employees/filter', { params });
    return response.data;
  },

  // 근로자 상세 정보 조회
  getEmployeeDetails: async (id) => {
    const response = await ownerAPI.get(`/employees/${id}`);
    return response.data;
  },

  // 근로자 정보 수정
  updateEmployee: async (id, employeeData) => {
    const response = await ownerAPI.put(`/employees/${id}`, employeeData);
    return response.data;
  },

  // 근로자 통계 조회
  getEmployeeStatistics: async (id, params = {}) => {
    const response = await ownerAPI.get(`/employees/${id}/statistics`, { params });
    return response.data;
  },

  // 근무 일정 조회
  getSchedules: async (params = {}) => {
    const response = await ownerAPI.get('/schedules', { params });
    return response.data;
  },

  // 전체 통계 조회
  getStatistics: async (params = {}) => {
    const response = await ownerAPI.get('/statistics', { params });
    return response.data;
  },

  // 임금 신고용 엑셀 파일 다운로드
  downloadSalaryReport: async (year, month) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/owner/salary-report/excel?year=${year}&month=${month}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('엑셀 파일 다운로드에 실패했습니다');
      }

      // 파일명 추출
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `임금신고_${year}년${month}월.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      // 파일 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (error) {
      console.error('Download salary report error:', error);
      throw error;
    }
  },
};

// 통계 데이터 가져오기
export const getStatistics = async (storeId = null, month = null) => {
  try {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (storeId) {
      params.append('storeId', storeId);
    }
    if (month) {
      params.append('month', month);
    }

    const response = await fetch(`/api/work-schedule/statistics?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('통계 데이터를 가져오는데 실패했습니다');
    }

    return await response.json();
  } catch (error) {
    console.error('Get statistics error:', error);
    throw error;
  }
};

// 주차별 통계 데이터 가져오기 (통합된 근로자 API 사용)
export const getWeeklyStatistics = async (storeId = null, month = null) => {
  try {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (storeId) {
      params.append('storeId', storeId);
    }
    if (month) {
      params.append('month', month);
    }

    const response = await fetch(`/api/employee/all-weekly-stats?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Weekly stats API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      throw new Error(`주차별 통계 데이터를 가져오는데 실패했습니다 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('Weekly stats data received:', data);
    return data;
  } catch (error) {
    console.error('Get weekly statistics error:', error);
    throw error;
  }
};

export default ownerService; 