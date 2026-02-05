import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { approveWorkSchedule } from '../store/slices/workScheduleSlice';
import { api } from '../utils/api';
import { API_ENDPOINTS, FILTER_DEFAULTS } from '../utils/constants';

/**
 * 근무 일정 관리 커스텀 훅
 * @param {Object} options - 옵션 객체
 * @param {string} options.defaultStatus - 기본 상태 필터
 * @param {string} options.defaultLocation - 기본 점포 필터
 * @returns {Object} 근무 일정 관련 상태와 함수들
 */
export const useWorkSchedules = (options = {}) => {
  const dispatch = useDispatch();
  
  // 상태 관리
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // 필터 상태
  const [selectedWorkLocation, setSelectedWorkLocation] = useState(
    options.defaultLocation || FILTER_DEFAULTS.ALL
  );
  const [selectedEmployee, setSelectedEmployee] = useState(FILTER_DEFAULTS.ALL);
  const [selectedStatus, setSelectedStatus] = useState(
    options.defaultStatus || FILTER_DEFAULTS.ALL
  );

  // 근무 일정 조회
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        page: currentPage,
        ...(selectedWorkLocation !== FILTER_DEFAULTS.ALL && { workLocation: selectedWorkLocation }),
        ...(selectedEmployee !== FILTER_DEFAULTS.ALL && { employeeId: selectedEmployee }),
        ...(selectedStatus !== FILTER_DEFAULTS.ALL && { status: selectedStatus })
      };

      const data = await api.get(`${API_ENDPOINTS.WORK_SCHEDULE}/all`, params);
      setSchedules(data.schedules);
      setTotalPages(data.totalPages);
    } catch (error) {
      setError(error.message);
      console.error('근무 일정 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedWorkLocation, selectedEmployee, selectedStatus]);

  // 직원 목록 조회
  const fetchEmployees = useCallback(async () => {
    try {
      const data = await api.get(`${API_ENDPOINTS.OWNER}/employee-contracts`);
      setEmployees(data);
    } catch (error) {
      console.error('직원 목록 조회 실패:', error);
    }
  }, []);

  // 승인 처리
  const handleApproval = useCallback(async (scheduleId, action, data = {}) => {
    setApprovalLoading(true);
    setError(null);
    
    try {
      console.log('승인 처리 시작:', { scheduleId, action, data });
      
      const result = await dispatch(approveWorkSchedule({
        id: scheduleId,
        action,
        data
      })).unwrap();
      
      console.log('승인 처리 성공:', result);
      
      // 목록 새로고침
      await fetchSchedules();
      return true;
    } catch (error) {
      console.error('승인 처리 실패:', error);
      setError(error.message || '승인 처리 중 오류가 발생했습니다.');
      return false;
    } finally {
      setApprovalLoading(false);
    }
  }, [dispatch, fetchSchedules]);

  // 페이지 변경
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  // 필터 변경
  const handleFilterChange = useCallback((filterType, value) => {
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
    
    switch (filterType) {
      case 'location':
        setSelectedWorkLocation(value);
        break;
      case 'employee':
        setSelectedEmployee(value);
        break;
      case 'status':
        setSelectedStatus(value);
        break;
      default:
        break;
    }
  }, []);

  // 에러 설정 함수
  const setErrorCallback = useCallback((errorMessage) => {
    setError(errorMessage);
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  return {
    // 상태
    schedules,
    employees,
    loading,
    approvalLoading,
    error,
    currentPage,
    totalPages,
    selectedWorkLocation,
    selectedEmployee,
    selectedStatus,
    
    // 함수
    fetchSchedules,
    fetchEmployees,
    handleApproval,
    handlePageChange,
    handleFilterChange,
    setError: setErrorCallback
  };
}; 