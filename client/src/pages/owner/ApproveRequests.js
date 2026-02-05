import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Pagination,
  Card,
  CardContent,
  CardActions,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Edit
} from '@mui/icons-material';

// Hooks
import { useWorkSchedules, useApprovalDialog } from '../../hooks';

// Utils
import { 
  WORK_STATUS, 
  WORK_STATUS_LABELS, 
  WORK_STATUS_COLORS, 
  WORK_LOCATIONS,
  FILTER_DEFAULTS
} from '../../utils/constants';
import { 
  formatDate, 
  formatUsername, 
  formatNotes 
} from '../../utils/formatters';

// Components
import { 
  LoadingSpinner, 
  StatusChip, 
  FilterSection, 
  EmptyState 
} from '../../components/common';

/**
 * 승인요청 관리 페이지 컴포넌트
 * @returns {JSX.Element} 승인요청 관리 페이지
 */
const ApproveRequests = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // 성공 메시지 상태
  const [successMessage, setSuccessMessage] = useState('');

  // 커스텀 훅 사용
  const {
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
    handleApproval,
    handlePageChange,
    handleFilterChange,
    setError
  } = useWorkSchedules({
    defaultStatus: WORK_STATUS.PENDING
  });

  const {
    isOpen: approvalDialogOpen,
    selectedSchedule,
    action: approvalAction,
    rejectionReason,
    modificationReason,
    modifiedStartTime,
    modifiedEndTime,
    openApproveDialog,
    openRejectDialog,
    openModifyDialog,
    closeDialog,
    getApprovalData,
    validateForm,
    setRejectionReason,
    setModificationReason,
    setModifiedStartTime,
    setModifiedEndTime
  } = useApprovalDialog();

  // 에러 닫기 핸들러
  const handleCloseError = () => {
    setError(null);
  };

  // 승인 처리 핸들러
  const handleApprovalSubmit = useCallback(async () => {
    if (!validateForm()) {
      setError('필수 항목을 입력해주세요.');
      return;
    }

    console.log('승인 처리 시작:', {
      scheduleId: selectedSchedule._id,
      action: approvalAction,
      data: getApprovalData()
    });

    const success = await handleApproval(
      selectedSchedule._id,
      approvalAction,
      getApprovalData()
    );

    if (success) {
      closeDialog();
      setError(null);
      
      // 성공 메시지 표시
      const actionText = {
        'approve': '승인',
        'reject': '거절',
        'modify': '수정'
      }[approvalAction];
      
      setSuccessMessage(`근무 일정이 성공적으로 ${actionText}되었습니다.`);
      console.log('승인 처리 성공:', actionText);
    } else {
      console.error('승인 처리 실패');
    }
  }, [validateForm, setError, selectedSchedule, approvalAction, getApprovalData, handleApproval, closeDialog]);

  // 성공 메시지 닫기
  const handleCloseSuccessMessage = useCallback(() => {
    setSuccessMessage('');
  }, []);

  // 공통 액션 버튼 컴포넌트
  const ActionButtons = useCallback(({ schedule }) => {
    if (schedule.status !== WORK_STATUS.PENDING) {
      return <Typography variant="body2" color="text.secondary">처리 완료</Typography>;
    }

    const handleApproveClick = () => {
      console.log('승인 버튼 클릭:', schedule);
      openApproveDialog(schedule);
    };

    const handleRejectClick = () => {
      console.log('거절 버튼 클릭:', schedule);
      openRejectDialog(schedule);
    };

    const handleModifyClick = () => {
      console.log('수정 버튼 클릭:', schedule);
      openModifyDialog(schedule);
    };

    return (
      <>
        <Button
          size="small"
          variant="contained"
          color="success"
          startIcon={<CheckCircle />}
          onClick={handleApproveClick}
          disabled={approvalLoading}
          sx={{ mr: 1 }}
        >
          {approvalLoading ? '처리중...' : '승인'}
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<Cancel />}
          onClick={handleRejectClick}
          disabled={approvalLoading}
          sx={{ mr: 1 }}
        >
          {approvalLoading ? '처리중...' : '거절'}
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="warning"
          startIcon={<Edit />}
          onClick={handleModifyClick}
          disabled={approvalLoading}
        >
          {approvalLoading ? '처리중...' : '수정'}
        </Button>
      </>
    );
  }, [approvalLoading, openApproveDialog, openRejectDialog, openModifyDialog]);

  // 모바일 카드 컴포넌트
  const ScheduleCard = useCallback(({ schedule }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="h6">
            {formatUsername(schedule.userId?.username)}
          </Typography>
          <StatusChip
            status={schedule.status}
            statusLabels={WORK_STATUS_LABELS}
            statusColors={WORK_STATUS_COLORS}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          근무점포: {schedule.workLocation}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          날짜: {formatDate(schedule.workDate)}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          시간: {schedule.startTime} - {schedule.endTime} ({schedule.totalHours}시간)
        </Typography>
        
        {schedule.notes && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            메모: {schedule.notes}
          </Typography>
        )}
      </CardContent>
      
      <CardActions>
        <ActionButtons schedule={schedule} />
      </CardActions>
    </Card>
  ), [ActionButtons]);

  // 필터 설정
  const filters = useCallback(() => [
    {
      label: '점포 선택',
      value: selectedWorkLocation,
      onChange: (e) => handleFilterChange('location', e.target.value),
      options: [
        { value: FILTER_DEFAULTS.ALL, label: '전체 점포' },
        { value: WORK_LOCATIONS.DAEJI, label: WORK_LOCATIONS.DAEJI },
        { value: WORK_LOCATIONS.SAMSUNG, label: WORK_LOCATIONS.SAMSUNG }
      ]
    },
    {
      label: '근로자 선택',
      value: selectedEmployee,
      onChange: (e) => handleFilterChange('employee', e.target.value),
      options: [
        { value: FILTER_DEFAULTS.ALL, label: '전체 근로자' },
        ...employees.map((employee) => ({
          value: employee._id,
          label: employee.username
        }))
      ]
    },
    {
      label: '승인 상태',
      value: selectedStatus,
      onChange: (e) => handleFilterChange('status', e.target.value),
      options: [
        { value: FILTER_DEFAULTS.ALL, label: '전체 상태' },
        { value: WORK_STATUS.PENDING, label: WORK_STATUS_LABELS[WORK_STATUS.PENDING] },
        { value: WORK_STATUS.APPROVED, label: WORK_STATUS_LABELS[WORK_STATUS.APPROVED] },
        { value: WORK_STATUS.REJECTED, label: WORK_STATUS_LABELS[WORK_STATUS.REJECTED] },
        { value: WORK_STATUS.MODIFIED, label: WORK_STATUS_LABELS[WORK_STATUS.MODIFIED] }
      ]
    }
  ], [selectedWorkLocation, selectedEmployee, selectedStatus, employees, handleFilterChange]);

  if (loading) {
    return <LoadingSpinner message="승인요청 목록을 불러오는 중..." />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        승인요청 관리
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={handleCloseError}>
          {error}
        </Alert>
      )}

      {approvalLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          승인 처리 중입니다. 잠시만 기다려주세요...
        </Alert>
      )}

      {/* 필터링 UI */}
      <FilterSection filters={filters()} />

      {/* 데이터 표시 */}
      {schedules.length > 0 ? (
        <>
          {isMobile ? (
            <Box>
              {schedules.map((schedule) => (
                <ScheduleCard key={schedule._id} schedule={schedule} />
              ))}
            </Box>
          ) : (
            <Paper sx={{ p: 3 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>직원명</TableCell>
                      <TableCell>근무점포</TableCell>
                      <TableCell>날짜</TableCell>
                      <TableCell>시간</TableCell>
                      <TableCell>총 시간</TableCell>
                      <TableCell>메모</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule._id}>
                        <TableCell>{formatUsername(schedule.userId?.username)}</TableCell>
                        <TableCell>{schedule.workLocation}</TableCell>
                        <TableCell>{formatDate(schedule.workDate)}</TableCell>
                        <TableCell>{schedule.startTime} - {schedule.endTime}</TableCell>
                        <TableCell>{schedule.totalHours}시간</TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                            {formatNotes(schedule.notes)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip
                            status={schedule.status}
                            statusLabels={WORK_STATUS_LABELS}
                            statusColors={WORK_STATUS_COLORS}
                          />
                        </TableCell>
                        <TableCell>
                          <ActionButtons schedule={schedule} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
          
          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </>
      ) : (
        <EmptyState
          title="조건에 맞는 승인요청이 없습니다"
          description="필터 조건을 변경하거나 새로운 승인요청을 확인해보세요"
        />
      )}

      {/* 승인/거절/수정 다이얼로그 */}
      <Dialog open={approvalDialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalAction === 'approve' && '근무시간 승인'}
          {approvalAction === 'reject' && '근무시간 거절'}
          {approvalAction === 'modify' && '근무시간 수정'}
        </DialogTitle>
        <DialogContent>
          {selectedSchedule && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {formatUsername(selectedSchedule.userId?.username)} ({selectedSchedule.userId?.email})
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                근무점포: {selectedSchedule.workLocation}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                날짜: {formatDate(selectedSchedule.workDate)}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                시간: {selectedSchedule.startTime} - {selectedSchedule.endTime} ({selectedSchedule.totalHours}시간)
              </Typography>
              
              {selectedSchedule.notes && (
                <Typography variant="body2" gutterBottom>
                  메모: {selectedSchedule.notes}
                </Typography>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                일정 ID: {selectedSchedule._id}
              </Typography>

              {approvalAction === 'reject' && (
                <TextField
                  fullWidth
                  label="거절 사유"
                  multiline
                  rows={3}
                  value={rejectionReason}
                  onChange={setRejectionReason}
                  margin="normal"
                  placeholder="거절 사유를 입력하세요"
                  required
                />
              )}

              {approvalAction === 'modify' && (
                <>
                  <TextField
                    fullWidth
                    label="수정 사유"
                    multiline
                    rows={3}
                    value={modificationReason}
                    onChange={setModificationReason}
                    margin="normal"
                    placeholder="수정 사유를 입력하세요"
                    required
                  />
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      수정된 시간
                    </Typography>
                    <Box display="flex" gap={2}>
                      <TextField
                        label="시작 시간"
                        type="time"
                        value={modifiedStartTime}
                        onChange={setModifiedStartTime}
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                      <TextField
                        label="종료 시간"
                        type="time"
                        value={modifiedEndTime}
                        onChange={setModifiedEndTime}
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={approvalLoading}>취소</Button>
          <Button 
            onClick={handleApprovalSubmit} 
            variant="contained"
            disabled={approvalLoading}
            color={
              approvalAction === 'approve' ? 'success' :
              approvalAction === 'reject' ? 'error' : 'warning'
            }
          >
            {approvalLoading ? '처리중...' : (
              <>
                {approvalAction === 'approve' && '승인'}
                {approvalAction === 'reject' && '거절'}
                {approvalAction === 'modify' && '수정'}
              </>
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 성공 메시지 표시 */}
      <Snackbar open={!!successMessage} autoHideDuration={6000} onClose={handleCloseSuccessMessage}>
        <Alert onClose={handleCloseSuccessMessage} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ApproveRequests; 