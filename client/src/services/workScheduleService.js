import { api } from '../utils/api';
import { API_ENDPOINTS } from '../utils/constants';

const workScheduleService = {
  /**
   * 근무 일정 생성
   * @param {Object} scheduleData - 근무 일정 데이터
   * @returns {Promise} 생성된 근무 일정
   */
  createWorkSchedule: async (scheduleData) => {
    return api.post(API_ENDPOINTS.WORK_SCHEDULE, scheduleData);
  },

  /**
   * 근무 일정 목록 조회
   * @param {Object} params - 조회 파라미터
   * @returns {Promise} 근무 일정 목록
   */
  getWorkSchedules: async (params = {}) => {
    console.log('getWorkSchedules 호출:', { params, endpoint: API_ENDPOINTS.WORK_SCHEDULE });
    try {
      const response = await api.get(API_ENDPOINTS.WORK_SCHEDULE, params);
      console.log('getWorkSchedules 응답:', response);
      return response;
    } catch (error) {
      console.error('getWorkSchedules 에러:', error);
      throw error;
    }
  },

  /**
   * 특정 근무 일정 조회
   * @param {string} id - 근무 일정 ID
   * @returns {Promise} 근무 일정 상세 정보
   */
  getWorkSchedule: async (id) => {
    return api.get(`${API_ENDPOINTS.WORK_SCHEDULE}/${id}`);
  },

  /**
   * 근무 일정 수정
   * @param {string} id - 근무 일정 ID
   * @param {Object} scheduleData - 수정할 데이터
   * @returns {Promise} 수정된 근무 일정
   */
  updateWorkSchedule: async (id, scheduleData) => {
    return api.put(`${API_ENDPOINTS.WORK_SCHEDULE}/${id}`, scheduleData);
  },

  /**
   * 근무 일정 삭제
   * @param {string} id - 근무 일정 ID
   * @returns {Promise} 삭제 결과
   */
  deleteWorkSchedule: async (id) => {
    return api.delete(`${API_ENDPOINTS.WORK_SCHEDULE}/${id}`);
  },

  /**
   * 승인 대기 일정 조회 (점주용)
   * @param {Object} params - 조회 파라미터
   * @returns {Promise} 승인 대기 일정 목록
   */
  getPendingSchedules: async (params = {}) => {
    return api.get(`${API_ENDPOINTS.WORK_SCHEDULE}/pending`, params);
  },

  /**
   * 모든 근무 일정 조회 (점주용)
   * @param {Object} params - 조회 파라미터
   * @returns {Promise} 모든 근무 일정 목록
   */
  getAllSchedules: async (params = {}) => {
    return api.get(API_ENDPOINTS.OWNER_SCHEDULES, params);
  },

  /**
   * 근무 일정 승인/거절/수정 (점주용)
   * @param {string} id - 근무 일정 ID
   * @param {string} action - 액션 (approve, reject, modify)
   * @param {Object} data - 액션 데이터
   * @returns {Promise} 처리 결과
   */
  approveWorkSchedule: async (id, action, data = {}) => {
    console.log('approveWorkSchedule 호출:', { id, action, data });
    
    try {
      if (action === 'approve-modification') {
        const response = await api.put(`${API_ENDPOINTS.WORK_SCHEDULE}/${id}/approve-modification`);
        console.log('approve-modification 응답:', response);
        return response;
      }
      
      const requestData = {
        action,
        ...data,
      };
      
      console.log('승인 처리 요청 데이터:', requestData);
      
      const response = await api.put(`${API_ENDPOINTS.WORK_SCHEDULE}/${id}/approve`, requestData);
      console.log('승인 처리 응답:', response);
      
      return response;
    } catch (error) {
      console.error('승인 처리 API 호출 실패:', error);
      throw error;
    }
  },

  /**
   * 근무 일정 승인 요청 (직원용)
   * @param {string} id - 근무 일정 ID
   * @returns {Promise} 요청 결과
   */
  requestApproval: async (id) => {
    return api.put(`${API_ENDPOINTS.WORK_SCHEDULE}/${id}/request-approval`);
  },

  /**
   * 근무 일정 통계 조회 (점주용)
   * @param {Object} params - 조회 파라미터
   * @returns {Promise} 통계 데이터
   */
  getStatistics: async (params = {}) => {
    return api.get(`${API_ENDPOINTS.WORK_SCHEDULE}/statistics`, params);
  },

  /**
   * 주간 통계 조회 (점주용)
   * @param {Object} params - 조회 파라미터
   * @returns {Promise} 주간 통계 데이터
   */
  getWeeklyStats: async (params = {}) => {
    return api.get(`${API_ENDPOINTS.WORK_SCHEDULE}/weekly-stats`, params);
  },

  /**
   * 통합된 주차별 통계 조회 (근로자와 점주 모두 사용)
   * @param {Object} params - 조회 파라미터
   * @returns {Promise} 통합된 주차별 통계
   */
  getUnifiedWeeklyStats: async (params = {}) => {
    return api.get(`${API_ENDPOINTS.WORK_SCHEDULE}/unified-weekly-stats`, params);
  },

  /**
   * 근무 일정 일괄 승인 (점주용)
   * @param {Object} data - 일괄 승인 데이터
   * @param {Array} data.scheduleIds - 승인할 일정 ID 목록
   * @param {string} data.storeId - 점포 ID (선택사항)
   * @param {string} data.month - 월 (YYYY-MM 형식, 선택사항)
   * @returns {Promise} 일괄 승인 결과
   */
  bulkApproveSchedules: async (data) => {
    console.log('bulkApproveSchedules 호출:', data);
    
    try {
      const response = await api.post(`${API_ENDPOINTS.WORK_SCHEDULE}/bulk-approve`, data);
      console.log('일괄 승인 응답:', response);
      return response;
    } catch (error) {
      console.error('일괄 승인 API 호출 실패:', error);
      throw error;
    }
  }
};

export default workScheduleService; 