import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Pagination,
  Tooltip
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Edit,
  FilterList,
  Refresh,
  Clear,
  CheckBox,
  CheckBoxOutlineBlank
} from '@mui/icons-material';
import { format } from 'date-fns';
import { 
  getOwnerSchedules, 
  approveWorkSchedule,
  bulkApproveSchedules
} from '../../store/slices/workScheduleSlice';
import { StoreSelector } from '../../components/common';
import { useStoreSelection } from '../../hooks/useMeta';
import { formatDate, formatUsername, formatNotes } from '../../utils/formatters';
import ownerService from '../../services/ownerService';

// 상수 정의
const WORK_STATUS_LABELS = {
  pending: '승인 대기',
  approved: '승인됨',
  rejected: '거절됨',
  modified: '수정됨',
  owner_modified: '점주 수정 대기'
};

const WORK_STATUS_COLORS = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  modified: 'info',
  owner_modified: 'secondary'
};

/**
 * 통계 카드 컴포넌트
 */
const StatCard = ({ title, count, color = 'primary' }) => (
  <Card>
    <CardContent>
      <Typography variant="h4" component="div" color={color}>
        {count}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
    </CardContent>
  </Card>
);

/**
 * 필터 섹션 컴포넌트
 */
const FilterSection = ({ 
  filters, 
  onFilterChange, 
  onReset, 
  totalCount,
  selectedYearMonth,
  employees,
  employeesLoading
}) => (
  <Card sx={{ mb: 3 }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <FilterList />
          <Typography variant="h6">필터</Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Clear />}
          onClick={onReset}
          size="small"
        >
          필터 초기화
        </Button>
      </Box>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>연월</InputLabel>
            <Select
              value={selectedYearMonth}
              label="연월"
              onChange={(e) => onFilterChange('yearMonth', e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                return format(date, 'yyyy-MM');
              }).map(month => (
                <MenuItem key={month} value={month}>
                  {format(new Date(month + '-01'), 'yyyy년 MM월')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>승인 상태</InputLabel>
            <Select
              value={filters.status}
              label="승인 상태"
              onChange={(e) => onFilterChange('status', e.target.value)}
            >
              <MenuItem value="all">전체</MenuItem>
              <MenuItem value="pending">승인 대기</MenuItem>
              <MenuItem value="approved">승인됨</MenuItem>
              <MenuItem value="rejected">거절됨</MenuItem>
              <MenuItem value="modified">수정됨</MenuItem>
              <MenuItem value="owner_modified">점주 수정 대기</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>근로자</InputLabel>
            <Select
              value={filters.employee}
              label="근로자"
              onChange={(e) => onFilterChange('employee', e.target.value)}
              disabled={employeesLoading}
            >
              <MenuItem value="all">전체</MenuItem>
              {employeesLoading ? (
                <MenuItem disabled>로딩 중...</MenuItem>
              ) : employees.length === 0 ? (
                <MenuItem disabled>근로자가 없습니다</MenuItem>
              ) : (
                employees.map((employee) => (
                  <MenuItem key={employee._id} value={employee._id}>
                    {formatUsername(employee.username)}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>페이지 크기</InputLabel>
            <Select
              value={filters.pageSize}
              label="페이지 크기"
              onChange={(e) => onFilterChange('pageSize', e.target.value)}
            >
              <MenuItem value={10}>10건</MenuItem>
              <MenuItem value={20}>20건</MenuItem>
              <MenuItem value={50}>50건</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
        <Typography variant="body2" color="text.secondary">
          총 {totalCount}건
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {selectedYearMonth} 데이터
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

/**
 * 근무 일정 테이블 컴포넌트
 */
const ScheduleTable = ({ 
  schedules, 
  onApprove, 
  onReject, 
  onModify,
  onSelectSchedule,
  onSelectAll,
  selectedSchedules,
  selectAll,
  loading 
}) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          조건에 맞는 근무 일정이 없습니다
        </Typography>
        <Typography variant="body2" color="text.secondary">
          필터 조건을 변경하거나 새로운 근무 일정을 확인해보세요
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Tooltip title="전체 선택">
                <IconButton
                  size="small"
                  onClick={onSelectAll}
                >
                  {selectAll ? <CheckBox /> : <CheckBoxOutlineBlank />}
                </IconButton>
              </Tooltip>
            </TableCell>
            <TableCell>직원명</TableCell>
            <TableCell>근무 날짜</TableCell>
            <TableCell>근무 시간</TableCell>
            <TableCell>총 시간</TableCell>
            <TableCell>근무점포</TableCell>
            <TableCell>시급</TableCell>
            <TableCell>총 급여</TableCell>
            <TableCell>승인 상태</TableCell>
            <TableCell>메모</TableCell>
            <TableCell>작업</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {schedules.map((schedule) => (
            <TableRow key={schedule._id}>
              <TableCell padding="checkbox">
                {schedule.status === 'pending' && (
                  <Tooltip title="선택">
                    <IconButton
                      size="small"
                      onClick={() => onSelectSchedule(schedule._id)}
                    >
                      {selectedSchedules.includes(schedule._id) ? <CheckBox /> : <CheckBoxOutlineBlank />}
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell>{formatUsername(schedule.userId?.username)}</TableCell>
              <TableCell>{formatDate(schedule.workDate)}</TableCell>
              <TableCell>{schedule.startTime} - {schedule.endTime}</TableCell>
              <TableCell>{schedule.totalHours}시간</TableCell>
              <TableCell>{schedule.workLocation}</TableCell>
              <TableCell>{schedule.hourlyWage?.toLocaleString()}원</TableCell>
              <TableCell>{(schedule.totalHours * (schedule.hourlyWage || 0)).toLocaleString()}원</TableCell>
              <TableCell>
                <Chip
                  label={WORK_STATUS_LABELS[schedule.status] || '알 수 없음'}
                  color={WORK_STATUS_COLORS[schedule.status] || 'default'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                  {formatNotes(schedule.notes)}
                </Typography>
              </TableCell>
              <TableCell>
                {schedule.status === 'pending' && (
                  <Box display="flex" gap={1}>
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => onApprove(schedule)}
                    >
                      <CheckCircle />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onReject(schedule)}
                    >
                      <Cancel />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => onModify(schedule)}
                    >
                      <Edit />
                    </IconButton>
                  </Box>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/**
 * 메인 근무시간 관리 컴포넌트
 */
const WorkSchedule = () => {
  const dispatch = useDispatch();
  
  // Redux 상태
  const { 
    schedules, 
    loading, 
    error, 
    totalCount, 
    currentPage, 
    totalPages 
  } = useSelector((state) => state.workSchedule);
  
  // 점포 선택 훅
  const { selectedStoreId } = useStoreSelection();

  // 로컬 상태
  const [filters, setFilters] = useState({
    status: 'all',
    employee: 'all',
    pageSize: 20
  });
  const [selectedYearMonth, setSelectedYearMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // 통계 계산
  const stats = useMemo(() => {
    if (!schedules) return { total: 0, pending: 0, approved: 0, rejected: 0, modified: 0, ownerModified: 0 };
    
    return {
      total: schedules.length,
      pending: schedules.filter(s => s.status === 'pending').length,
      approved: schedules.filter(s => s.status === 'approved').length,
      rejected: schedules.filter(s => s.status === 'rejected').length,
      modified: schedules.filter(s => s.status === 'modified').length,
      ownerModified: schedules.filter(s => s.status === 'owner_modified').length
    };
  }, [schedules]);

  // 고유한 점포 목록 - 근무점포 필터 제거로 인해 더 이상 사용하지 않음

  // 데이터 로드
  useEffect(() => {
    console.log('WorkSchedule useEffect - selectedStoreId:', selectedStoreId);
    if (selectedStoreId) {
      loadSchedules();
      loadEmployees();
    }
  }, [selectedStoreId, filters, selectedYearMonth, currentPage]);



  const loadSchedules = () => {
    const params = {
      page: currentPage,
      limit: filters.pageSize,
      storeId: selectedStoreId
    };
    
    if (filters.status !== 'all') {
      params.status = filters.status;
    }
    if (filters.employee !== 'all') {
      params.employeeId = filters.employee;
    }
    if (selectedYearMonth) {
      params.month = selectedYearMonth;
    }

    console.log('loadSchedules 호출 - params:', params);
    dispatch(getOwnerSchedules(params));
  };

  // 근로자 목록 로드
  const loadEmployees = async () => {
    if (!selectedStoreId) return;
    
    setEmployeesLoading(true);
    try {
      const employeesData = await ownerService.getEmployeesForFilter({ storeId: selectedStoreId });
      setEmployees(employeesData);
    } catch (error) {
      console.error('근로자 목록 로드 실패:', error);
    } finally {
      setEmployeesLoading(false);
    }
  };

  // 필터 변경 핸들러
  const handleFilterChange = (key, value) => {
    console.log('필터 변경:', key, value);
    
    if (key === 'yearMonth') {
      setSelectedYearMonth(value);
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
      
      // 근로자 필터가 변경되면 선택된 일정 초기화
      if (key === 'employee') {
        setSelectedSchedules([]);
        setSelectAll(false);
      }
    }
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      employee: 'all',
      pageSize: 20
    });
    setSelectedYearMonth(format(new Date(), 'yyyy-MM'));
    setSelectedSchedules([]);
    setSelectAll(false);
  };

  // 페이지 변경
  const handlePageChange = (event, newPage) => {
    // Redux action을 통해 페이지 변경
    dispatch(getOwnerSchedules({ 
      page: newPage, 
      limit: filters.pageSize,
      storeId: selectedStoreId 
    }));
  };

  // 승인/거절/수정 핸들러
  const handleApprove = (schedule) => {
    if (window.confirm('이 근무 일정을 승인하시겠습니까?')) {
      dispatch(approveWorkSchedule({
        id: schedule._id,
        action: 'approve',
        data: {}
      }));
    }
  };

  const handleReject = (schedule) => {
    if (window.confirm('이 근무 일정을 거절하시겠습니까?')) {
      dispatch(approveWorkSchedule({
        id: schedule._id,
        action: 'reject',
        data: {}
      }));
    }
  };

  const handleModify = (schedule) => {
    // 수정 다이얼로그 로직 구현
    console.log('수정:', schedule);
  };

  // 새로고침
  const handleRefresh = () => {
    loadSchedules();
  };

  // 일정 선택 핸들러
  const handleSelectSchedule = (scheduleId) => {
    setSelectedSchedules(prev => {
      if (prev.includes(scheduleId)) {
        return prev.filter(id => id !== scheduleId);
      } else {
        return [...prev, scheduleId];
      }
    });
  };

  // 전체 선택 핸들러
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSchedules([]);
      setSelectAll(false);
    } else {
      const pendingScheduleIds = schedules
        .filter(schedule => schedule.status === 'pending')
        .map(schedule => schedule._id);
      setSelectedSchedules(pendingScheduleIds);
      setSelectAll(true);
    }
  };

  // 선택된 일정이 변경될 때 전체 선택 상태 업데이트
  useEffect(() => {
    const pendingSchedules = schedules.filter(schedule => schedule.status === 'pending');
    const selectedPendingSchedules = selectedSchedules.filter(id => 
      pendingSchedules.some(schedule => schedule._id === id)
    );
    
    if (pendingSchedules.length > 0 && selectedPendingSchedules.length === pendingSchedules.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [schedules, selectedSchedules]);

  // 일괄 승인 핸들러
  const handleBulkApprove = () => {
    if (selectedSchedules.length === 0) {
      alert('승인할 일정을 선택해주세요.');
      return;
    }

    if (window.confirm(`선택된 ${selectedSchedules.length}건의 일정을 모두 승인하시겠습니까?`)) {
      const bulkData = {
        scheduleIds: selectedSchedules,
        storeId: selectedStoreId,
        month: selectedYearMonth
      };

      dispatch(bulkApproveSchedules(bulkData))
        .then((result) => {
          if (bulkApproveSchedules.fulfilled.match(result)) {
            alert(`${result.payload.approvedCount}건의 일정이 일괄 승인되었습니다.`);
            setSelectedSchedules([]);
            setSelectAll(false);
            // 목록 새로고침
            setTimeout(() => {
              loadSchedules();
            }, 100);
          }
        })
        .catch((error) => {
          console.error('일괄 승인 실패:', error);
        });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          근로시간 관리
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
        >
          새로고침
        </Button>
      </Box>

      {/* 점포 선택 */}
      <Box sx={{ mb: 3 }}>
        <StoreSelector />
      </Box>

      {/* 에러 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 통계 카드 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard title="전체" count={stats.total} />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard title="승인 대기" count={stats.pending} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard title="승인됨" count={stats.approved} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard title="거절됨" count={stats.rejected} color="error" />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard title="수정됨" count={stats.modified} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard title="점주 수정 대기" count={stats.ownerModified} color="secondary" />
        </Grid>
      </Grid>

      {/* 필터 섹션 */}
      <FilterSection
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        totalCount={totalCount}
        selectedYearMonth={selectedYearMonth}
        employees={employees}
        employeesLoading={employeesLoading}
      />

      {/* 일괄 승인 버튼 */}
      {stats.pending > 0 && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
            onClick={handleBulkApprove}
            disabled={selectedSchedules.length === 0}
            sx={{ mr: 2 }}
          >
            선택한 일정 일괄 승인 ({selectedSchedules.length}건)
          </Button>
          {selectedSchedules.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              승인 대기 중인 일정을 체크박스로 선택한 후 일괄 승인할 수 있습니다.
            </Typography>
          )}
        </Box>
      )}

      {/* 근무 일정 테이블 */}
      <ScheduleTable
        schedules={schedules}
        onApprove={handleApprove}
        onReject={handleReject}
        onModify={handleModify}
        onSelectSchedule={handleSelectSchedule}
        onSelectAll={handleSelectAll}
        selectedSchedules={selectedSchedules}
        selectAll={selectAll}
        loading={loading}
      />

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
    </Box>
  );
};

export default WorkSchedule; 