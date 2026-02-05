import { useState, useCallback } from 'react';

/**
 * 승인 다이얼로그 커스텀 훅
 * @returns {Object} 승인 다이얼로그 관련 상태와 함수들
 */
export const useApprovalDialog = () => {
  // 다이얼로그 상태
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [action, setAction] = useState('approve');
  
  // 폼 데이터
  const [rejectionReason, setRejectionReason] = useState('');
  const [modificationReason, setModificationReason] = useState('');
  const [modifiedStartTime, setModifiedStartTime] = useState('');
  const [modifiedEndTime, setModifiedEndTime] = useState('');

  // 승인 다이얼로그 열기
  const openApproveDialog = useCallback((schedule) => {
    setSelectedSchedule(schedule);
    setAction('approve');
    setIsOpen(true);
  }, []);

  // 거절 다이얼로그 열기
  const openRejectDialog = useCallback((schedule) => {
    setSelectedSchedule(schedule);
    setAction('reject');
    setRejectionReason('');
    setIsOpen(true);
  }, []);

  // 수정 다이얼로그 열기
  const openModifyDialog = useCallback((schedule) => {
    setSelectedSchedule(schedule);
    setAction('modify');
    setModificationReason('');
    setModifiedStartTime(schedule.startTime);
    setModifiedEndTime(schedule.endTime);
    setIsOpen(true);
  }, []);

  // 다이얼로그 닫기
  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setSelectedSchedule(null);
    setAction('approve');
    setRejectionReason('');
    setModificationReason('');
    setModifiedStartTime('');
    setModifiedEndTime('');
  }, []);

  // 승인 데이터 생성
  const getApprovalData = useCallback(() => {
    const baseData = { action };
    
    switch (action) {
      case 'reject':
        return {
          ...baseData,
          rejectionReason
        };
      case 'modify':
        return {
          ...baseData,
          modificationReason,
          startTime: modifiedStartTime,
          endTime: modifiedEndTime
        };
      default:
        return baseData;
    }
  }, [action, rejectionReason, modificationReason, modifiedStartTime, modifiedEndTime]);

  // 유효성 검사
  const validateForm = useCallback(() => {
    switch (action) {
      case 'reject':
        return rejectionReason.trim().length > 0;
      case 'modify':
        return (
          modificationReason.trim().length > 0 &&
          modifiedStartTime &&
          modifiedEndTime
        );
      default:
        return true;
    }
  }, [action, rejectionReason, modificationReason, modifiedStartTime, modifiedEndTime]);

  // setter 함수들을 useCallback으로 메모이제이션
  const setRejectionReasonCallback = useCallback((value) => {
    setRejectionReason(value);
  }, []);

  const setModificationReasonCallback = useCallback((value) => {
    setModificationReason(value);
  }, []);

  const setModifiedStartTimeCallback = useCallback((value) => {
    setModifiedStartTime(value);
  }, []);

  const setModifiedEndTimeCallback = useCallback((value) => {
    setModifiedEndTime(value);
  }, []);

  return {
    // 상태
    isOpen,
    selectedSchedule,
    action,
    rejectionReason,
    modificationReason,
    modifiedStartTime,
    modifiedEndTime,
    
    // 함수
    openApproveDialog,
    openRejectDialog,
    openModifyDialog,
    closeDialog,
    getApprovalData,
    validateForm,
    
    // setter 함수들
    setRejectionReason: setRejectionReasonCallback,
    setModificationReason: setModificationReasonCallback,
    setModifiedStartTime: setModifiedStartTimeCallback,
    setModifiedEndTime: setModifiedEndTimeCallback
  };
}; 