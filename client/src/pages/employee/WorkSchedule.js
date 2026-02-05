import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  useTheme,
  useMediaQuery,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  Schedule,
  Save,
  Close,
  Visibility,
  AccessTime,
  LocationOn,
  CalendarToday,
  Person,
  CheckBox,
  CheckBoxOutlineBlank,
  SelectAll
} from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale';
import { format } from 'date-fns';
import { 
  getWorkSchedules, 
  createWorkSchedule, 
  updateWorkSchedule, 
  deleteWorkSchedule,
  requestApproval
} from '../../store/slices/workScheduleSlice';
import { fetchPublicStores } from '../../store/slices/metaSlice';
import { useIsMobile } from '../../hooks/useMediaQuery';

const validationSchema = Yup.object({
  workDate: Yup.date()
    .required('근무 시작일을 선택해주세요')
    .typeError('올바른 날짜를 입력해주세요'),
  endDate: Yup.date()
    .required('근무 종료일을 선택해주세요')
    .typeError('올바른 날짜를 입력해주세요')
    .test('endDate-validation', '', function(value) {
      const { workDate, startTime, endTime } = this.parent;
      if (!workDate || !value) return this.createError({ message: '근무 시작일과 종료일을 모두 입력해주세요' });
      
      // 날짜 차이 계산
      const daysDiff = Math.floor((value.getTime() - workDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // 종료일이 시작일보다 2일 이상 차이나면 에러
      if (daysDiff > 1) {
        return this.createError({ message: '근무는 최대 1박 2일(야간근무)까지 가능합니다' });
      }
      
      // 종료일이 시작일보다 이전이면 에러
      if (daysDiff < 0) {
        return this.createError({ message: '근무 종료일은 시작일 이후여야 합니다' });
      }
      
      // 같은 날 근무인 경우
      if (daysDiff === 0) {
        if (startTime && endTime) {
          const startHours = startTime.getHours();
          const endHours = endTime.getHours();
          const startMinutes = startTime.getMinutes();
          const endMinutes = endTime.getMinutes();
          
          // 종료 시간이 시작 시간보다 이르거나 같으면 에러
          if (startHours > endHours || (startHours === endHours && startMinutes >= endMinutes)) {
            return this.createError({ message: '같은 날 근무의 경우 종료시간이 시작시간보다 늦어야 합니다. 야간근무인 경우 "야간근무" 체크박스를 선택해주세요' });
          }
        }
      }
      
      // 다음날 근무인 경우 (야간근무)
      if (daysDiff === 1) {
        if (startTime && endTime) {
          const startHours = startTime.getHours();
          const endHours = endTime.getHours();
          
          // 야간근무이면서 종료시간이 시작시간보다 늦으면 경고
          if (startHours < endHours) {
            return this.createError({ message: '야간근무가 아닌 경우 "야간근무" 체크박스를 해제해주세요' });
          }
        }
      }
      
      return true;
    }),
  storeId: Yup.string()
    .required('근무점포를 선택해주세요'),
  startTime: Yup.date()
    .required('시작 시간을 선택해주세요')
    .typeError('올바른 시간을 입력해주세요'),
  endTime: Yup.date()
    .required('종료 시간을 선택해주세요')
    .typeError('올바른 시간을 입력해주세요')
    .test('time-validation', '', function(value) {
      const { startTime, workDate, endDate } = this.parent;
      if (!startTime || !value) return this.createError({ message: '시작 시간과 종료 시간을 모두 입력해주세요' });
      
      const startHours = startTime.getHours();
      const endHours = value.getHours();
      const startMinutes = startTime.getMinutes();
      const endMinutes = value.getMinutes();
      
      // 근무 시간 계산 (분 단위)
      let totalMinutes;
      
      if (workDate && endDate && workDate.getTime() !== endDate.getTime()) {
        // 야간근무: 24시간에서 시작시간을 빼고 종료시간을 더함
        const minutesToMidnight = (24 - startHours) * 60 - startMinutes;
        const minutesFromMidnight = endHours * 60 + endMinutes;
        totalMinutes = minutesToMidnight + minutesFromMidnight;
      } else {
        // 일반 근무
        totalMinutes = (endHours - startHours) * 60 + (endMinutes - startMinutes);
        
        if (totalMinutes <= 0) {
          return this.createError({ message: '종료 시간은 시작 시간보다 늦어야 합니다' });
        }
      }
      
      // 최소 30분 이상 근무
      if (totalMinutes < 30) {
        return this.createError({ message: '최소 30분 이상 근무해야 합니다' });
      }
      
      // 최대 24시간 근무
      if (totalMinutes > 24 * 60) {
        return this.createError({ message: '최대 24시간까지만 근무 가능합니다' });
      }
      
      return true;
    }),
  notes: Yup.string()
    .max(1000, '메모는 1000자를 초과할 수 없습니다')
});

const WorkSchedule = () => {
  const dispatch = useDispatch();
  const { schedules, loading, error, totalPages, currentPage } = useSelector((state) => state.workSchedule);
  const { user } = useSelector((state) => state.auth);
  const { stores, loading: metaLoading } = useSelector((state) => state.meta);
  const storesLoading = metaLoading.stores;
  

  

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [requestingApproval, setRequestingApproval] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  
  // 일괄 선택 관련 상태
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);

  // 입사일부터 현재월까지의 월 목록 생성
  const getAvailableMonths = () => {
    const months = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // 입사일이 있으면 입사월부터, 없으면 1월부터
    const hireDate = user?.hireDate ? new Date(user.hireDate) : new Date(currentYear, 0, 1);
    const hireYear = hireDate.getFullYear();
    const hireMonth = hireDate.getMonth() + 1;
    
    for (let year = hireYear; year <= currentYear; year++) {
      const startMonth = year === hireYear ? hireMonth : 1;
      const endMonth = year === currentYear ? currentMonth : 12;
      
      for (let month = startMonth; month <= endMonth; month++) {
        const value = `${year}-${String(month).padStart(2, '0')}`;
        const label = `${year}년 ${month}월`;
        months.push({ value, label });
      }
    }
    
    return months.reverse(); // 최신월부터 정렬
  };
  const isMobile = useIsMobile();

  useEffect(() => {
    dispatch(getWorkSchedules({ month: selectedMonth }));
  }, [dispatch, selectedMonth]);

  // 점포관리에서 등록된 점포 목록 가져오기 (공개 API 사용)
  useEffect(() => {
    dispatch(fetchPublicStores());
  }, [dispatch]);





  const formik = useFormik({
    initialValues: {
      workDate: new Date(),
      endDate: new Date(),
      storeId: stores && stores.length > 0 ? stores[0]._id : '', // 점포 목록이 있으면 첫 번째 점포 선택
      startTime: new Date(),
      endTime: new Date(),
      notes: ''
    },
    enableReinitialize: false, // 점포 목록이 변경될 때 자동으로 재초기화하지 않음
    validationSchema,
    onSubmit: async (values) => {
      try {
        // 시간을 HH:MM 형식으로 변환
        const formatTime = (date) => {
          if (!date) return '';
          return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        };

        const scheduleData = {
          ...values,
          workDate: values.workDate,
          endDate: values.endDate,
          storeId: values.storeId, // storeId 사용
          startTime: formatTime(values.startTime),
          endTime: formatTime(values.endTime)
        };

        if (editingId) {
          await dispatch(updateWorkSchedule({
            id: editingId,
            scheduleData: scheduleData
          })).unwrap();
          setEditingId(null);
        } else {
          await dispatch(createWorkSchedule(scheduleData)).unwrap();
          setIsAdding(false);
        }
        formik.resetForm();
        dispatch(getWorkSchedules({ month: selectedMonth }));
      } catch (error) {
        console.error('근무 일정 저장 실패:', error);
      }
    }
  });

  // 점포 목록이 로드되면 첫 번째 점포를 기본값으로 설정
  useEffect(() => {
    if (stores && stores.length > 0 && !formik.values.storeId) {
      formik.setFieldValue('storeId', stores[0]._id);
    }
  }, [stores]);

  const handleAddClick = () => {
    if (!stores || stores.length === 0) {
      alert('점포관리에서 등록된 점포가 없습니다. 점포를 등록한 후 근무 시간을 입력할 수 있습니다.');
      return;
    }
    
    setIsAdding(true);
    setEditingId(null);
    formik.resetForm();
    // 점포 목록이 로드되면 첫 번째 점포를 기본값으로 설정
    if (stores.length > 0) {
      formik.setFieldValue('storeId', stores[0]._id);
    }
  };

  const handleEditClick = (schedule) => {
    setEditingId(schedule._id);
    setIsAdding(false);
    
    // 시간 문자열을 Date 객체로 변환
    const createTimeFromString = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    };
    
    // 야간근무 여부 확인 (시작 시간이 종료 시간보다 늦은 경우)
    const startTime = createTimeFromString(schedule.startTime);
    const endTime = createTimeFromString(schedule.endTime);
    const workDate = new Date(schedule.workDate);
    
    let endDate = workDate;
    if (schedule.endDate) {
      endDate = new Date(schedule.endDate);
    } else {
      // 시간만으로 야간근무 여부 판단
      const startHours = startTime.getHours();
      const endHours = endTime.getHours();
      
      if (startHours > endHours || (startHours === endHours && startTime.getMinutes() > endTime.getMinutes())) {
        // 야간근무인 경우 다음날로 설정
        endDate = new Date(workDate);
        endDate.setDate(endDate.getDate() + 1);
      }
    }
    
    // storeId 처리: schedule.storeId가 객체인 경우 _id를 사용, 문자열인 경우 그대로 사용
    const storeId = typeof schedule.storeId === 'object' ? schedule.storeId._id : schedule.storeId;
    
    formik.setValues({
      workDate: workDate,
      endDate: endDate,
      storeId: storeId || (stores.length > 0 ? stores[0]._id : ''),
      startTime: startTime,
      endTime: endTime,
      notes: schedule.notes || ''
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    formik.resetForm();
    // 점포 목록이 로드되면 첫 번째 점포를 기본값으로 설정
    if (stores.length > 0) {
      formik.setFieldValue('storeId', stores[0]._id);
    }
  };

  const handleDelete = async (scheduleId) => {
    if (window.confirm('정말로 이 근무 일정을 삭제하시겠습니까?')) {
      try {
        await dispatch(deleteWorkSchedule(scheduleId)).unwrap();
        dispatch(getWorkSchedules({ month: selectedMonth }));
      } catch (error) {
        console.error('근무 일정 삭제 실패:', error);
      }
    }
  };

  const handleRequestApproval = async (scheduleId) => {
    try {
      setRequestingApproval(prev => ({ ...prev, [scheduleId]: true }));
      // 새로운 승인 요청 API 사용
      await dispatch(requestApproval(scheduleId)).unwrap();
      dispatch(getWorkSchedules({ month: selectedMonth }));
      // 성공 메시지 표시 (실제로는 Toast나 Alert 사용)
      alert('승인 요청이 완료되었습니다. 점주에게 알림이 전송되었습니다.');
    } catch (error) {
      console.error('승인 요청 실패:', error);
      alert('승인 요청에 실패했습니다: ' + error);
    } finally {
      setRequestingApproval(prev => ({ ...prev, [scheduleId]: false }));
    }
  };

  const handleViewDetail = (schedule) => {
    setSelectedSchedule(schedule);
    setDetailDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedSchedule(null);
  };

  // 일괄 선택 관련 함수들
  const handleSelectAll = () => {
    if (selectedSchedules.length === schedules.length) {
      setSelectedSchedules([]);
    } else {
      setSelectedSchedules(schedules.map(schedule => schedule._id));
    }
  };

  const handleSelectSchedule = (scheduleId) => {
    setSelectedSchedules(prev => {
      if (prev.includes(scheduleId)) {
        return prev.filter(id => id !== scheduleId);
      } else {
        return [...prev, scheduleId];
      }
    });
  };

  const handleBulkApprovalRequest = async () => {
    if (selectedSchedules.length === 0) {
      alert('승인 요청할 근무 일정을 선택해주세요.');
      return;
    }

    if (window.confirm(`선택한 ${selectedSchedules.length}개의 근무 일정에 대해 승인 요청하시겠습니까?`)) {
      try {
        // 각 선택된 일정에 대해 승인 요청
        const promises = selectedSchedules.map(scheduleId => 
          dispatch(requestApproval(scheduleId)).unwrap()
        );
        
        await Promise.all(promises);
        
        // 성공 메시지 표시
        alert(`${selectedSchedules.length}개의 근무 일정에 대한 승인 요청이 완료되었습니다.`);
        
        // 선택 초기화 및 목록 새로고침
        setSelectedSchedules([]);
        setIsSelecting(false);
        dispatch(getWorkSchedules({ month: selectedMonth }));
      } catch (error) {
        console.error('일괄 승인 요청 실패:', error);
        alert('일괄 승인 요청에 실패했습니다: ' + error);
      }
    }
  };

  const handleCancelSelection = () => {
    setSelectedSchedules([]);
    setIsSelecting(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      case 'modified':
        return 'info';
      case null:
      case undefined:
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved':
        return '승인됨';
      case 'pending':
        return '승인 진행중';
      case 'rejected':
        return '거절됨';
      case 'modified':
        return '수정됨';
      case null:
      case undefined:
        return '승인 요청 필요';
      default:
        return status;
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    return time;
  };

  const calculateTotalHours = (startDate, startTime, endDate, endTime) => {
    if (!startTime || !endTime || !startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    start.setHours(startTime.getHours(), startTime.getMinutes(), 0);
    
    const end = new Date(endDate);
    end.setHours(endTime.getHours(), endTime.getMinutes(), 0);
    
    const diffMs = end - start;
    const totalHours = diffMs / (1000 * 60 * 60);
    return Math.round(totalHours * 100) / 100;
  };

  const totalHours = calculateTotalHours(formik.values.workDate, formik.values.startTime, formik.values.endDate, formik.values.endTime);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
      <Box>
        <Box mb={3}>
          {/* 제목과 월 선택 - 모바일에서 세로 배치 */}
          <Box 
            display="flex" 
            flexDirection={isMobile ? 'column' : 'row'}
            justifyContent="space-between" 
            alignItems={isMobile ? 'flex-start' : 'center'} 
            mb={isMobile ? 2 : 0}
            gap={isMobile ? 2 : 0}
          >
            <Box>
              <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom>
                근무 시간 입력
              </Typography>
              <Typography variant={isMobile ? 'body2' : 'body1'} color="text.secondary">
                {selectedMonth.split('-')[1]}월 근무 일정
              </Typography>
              {user?.hireDate && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  입사일: {new Date(user.hireDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
              )}
            </Box>
            
            <FormControl sx={{ minWidth: isMobile ? '100%' : 120 }}>
              <InputLabel>월 선택</InputLabel>
              <Select
                value={selectedMonth}
                label="월 선택"
                onChange={(e) => setSelectedMonth(e.target.value)}
                size={isMobile ? 'medium' : 'medium'}
              >
                {getAvailableMonths().map(({ value, label }) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* 버튼들 - 모바일에서 세로 배치 */}
          {!isAdding && !editingId && (
            <Box 
              display="flex" 
              flexDirection={isMobile ? 'column' : 'row'}
              gap={isMobile ? 1.5 : 2} 
              alignItems={isMobile ? 'stretch' : 'center'}
            >
              <Button
                variant="outlined"
                startIcon={<SelectAll />}
                onClick={() => setIsSelecting(!isSelecting)}
                color={isSelecting ? "primary" : "inherit"}
                size={isMobile ? 'large' : 'medium'}
                fullWidth={isMobile}
                sx={{ 
                  minHeight: isMobile ? 48 : 36,
                  fontSize: isMobile ? '1rem' : '0.875rem'
                }}
              >
                {isSelecting ? '선택 모드 종료' : '일괄 선택'}
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddClick}
                disabled={storesLoading || !stores || stores.length === 0}
                title={storesLoading ? '점포 목록을 불러오는 중...' : (!stores || stores.length === 0) ? '점포가 없습니다' : ''}
                size={isMobile ? 'large' : 'medium'}
                fullWidth={isMobile}
                sx={{ 
                  minHeight: isMobile ? 48 : 36,
                  fontSize: isMobile ? '1rem' : '0.875rem'
                }}
              >
                근무 시간 추가
              </Button>
            </Box>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {(!stores || stores.length === 0) && !storesLoading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            점포관리에서 등록된 점포가 없습니다. 점포를 등록한 후 근무 시간을 입력할 수 있습니다.
          </Alert>
        )}

        {/* 일괄 선택 모드일 때 표시되는 버튼들 */}
        {isSelecting && (
          <Paper sx={{ p: isMobile ? 2 : 2, mb: 2 }}>
            <Box 
              display="flex" 
              flexDirection={isMobile ? 'column' : 'row'}
              justifyContent="space-between" 
              alignItems={isMobile ? 'stretch' : 'center'}
              gap={isMobile ? 2 : 0}
            >
              <Box 
                display="flex" 
                alignItems="center" 
                gap={isMobile ? 1 : 2}
                flexDirection={isMobile ? 'column' : 'row'}
                width={isMobile ? '100%' : 'auto'}
              >
                <Typography variant={isMobile ? 'body2' : 'body1'}>
                  선택된 항목: {selectedSchedules.length}개
                </Typography>
                <Button
                  variant="outlined"
                  size={isMobile ? 'medium' : 'small'}
                  onClick={handleSelectAll}
                  fullWidth={isMobile}
                  sx={{ minHeight: isMobile ? 44 : 32 }}
                >
                  {selectedSchedules.length === schedules.length ? '전체 해제' : '전체 선택'}
                </Button>
              </Box>
              <Box 
                display="flex" 
                gap={1}
                flexDirection={isMobile ? 'column' : 'row'}
                width={isMobile ? '100%' : 'auto'}
              >
                <Button
                  variant="outlined"
                  onClick={handleCancelSelection}
                  fullWidth={isMobile}
                  size={isMobile ? 'medium' : 'medium'}
                  sx={{ minHeight: isMobile ? 44 : 36 }}
                >
                  취소
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleBulkApprovalRequest}
                  disabled={selectedSchedules.length === 0}
                  fullWidth={isMobile}
                  size={isMobile ? 'medium' : 'medium'}
                  sx={{ minHeight: isMobile ? 44 : 36 }}
                >
                  {isMobile ? `승인 요청 (${selectedSchedules.length}개)` : `선택 항목 승인 요청 (${selectedSchedules.length}개)`}
                </Button>
              </Box>
            </Box>
          </Paper>
        )}

        {/* 입력 폼 */}
        {(isAdding || editingId) && (
          <Paper sx={{ p: isMobile ? 2 : 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant={isMobile ? 'h6' : 'h6'}>
                {editingId ? '근무 시간 수정' : '근무 시간 입력'}
              </Typography>
              <IconButton onClick={handleCancel} sx={{ minWidth: 44, minHeight: 44 }}>
                <Close />
              </IconButton>
            </Box>
            
            <form onSubmit={formik.handleSubmit}>
              <Grid container spacing={2}>
                {/* 1번째 행: 근무점포 */}
                <Grid item xs={12}>
                  <FormControl fullWidth error={formik.touched.storeId && Boolean(formik.errors.storeId)}>
                    <InputLabel>근무점포</InputLabel>
                    <Select
                      name="storeId"
                      value={formik.values.storeId || ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="근무점포"
                      disabled={storesLoading}
                    >
                      {storesLoading ? (
                        <MenuItem value="">점포 목록을 불러오는 중...</MenuItem>
                      ) : (!stores || stores.length === 0) ? (
                        <MenuItem value="">점포관리에서 등록된 점포가 없습니다</MenuItem>
                      ) : (
                        stores.map(store => (
                          <MenuItem key={store._id} value={store._id}>
                            {store.name}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                    {formik.touched.storeId && formik.errors.storeId && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                        {formik.errors.storeId}
                      </Typography>
                    )}
                    {(!stores || stores.length === 0) && !storesLoading && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        점포관리에서 점포를 등록해주세요.
                      </Typography>
                    )}
                  </FormControl>
                </Grid>

                {/* 2번째 행: 근무 시작일 */}
                <Grid item xs={12}>
                  <TextField
                    label="근무 시작일"
                    type="date"
                    name="workDate"
                    value={formik.values.workDate ? formik.values.workDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      if (!e.target.value || e.target.value === '') {
                        // 빈 값일 때는 현재 날짜로 설정
                        const today = new Date();
                        formik.setFieldValue('workDate', today);
                        if (!editingId) {
                          formik.setFieldValue('endDate', today);
                        }
                        return;
                      }
                      const date = new Date(e.target.value + 'T12:00:00');
                      if (isNaN(date.getTime())) {
                        // 잘못된 날짜일 때는 현재 날짜로 설정
                        const today = new Date();
                        formik.setFieldValue('workDate', today);
                        if (!editingId) {
                          formik.setFieldValue('endDate', today);
                        }
                        return;
                      }
                      formik.setFieldValue('workDate', date);
                      // 수정 모드가 아닐 때만 종료일을 자동으로 설정
                      if (!editingId) {
                        formik.setFieldValue('endDate', date);
                      }
                    }}
                    onBlur={formik.handleBlur}
                    fullWidth
                    error={formik.touched.workDate && Boolean(formik.errors.workDate)}
                    helperText={formik.touched.workDate && formik.errors.workDate}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      style: { fontSize: isMobile ? '16px' : '14px' } // 모바일에서 폰트 크기 증가로 자동 줌 방지
                    }}
                  />
                </Grid>

                {/* 3번째 행: 근무 시간 (시작~종료) */}
                <Grid item xs={6}>
                  <TextField
                    label="시작 시간"
                    type="time"
                    name="startTime"
                    value={formik.values.startTime ? formik.values.startTime.toTimeString().slice(0, 5) : ''}
                    onChange={(e) => {
                      if (!e.target.value || e.target.value === '') {
                        return;
                      }
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      if (isNaN(hours) || isNaN(minutes)) {
                        return;
                      }
                      const time = new Date();
                      time.setHours(hours, minutes, 0, 0);
                      formik.setFieldValue('startTime', time);
                    }}
                    onBlur={formik.handleBlur}
                    fullWidth
                    error={formik.touched.startTime && Boolean(formik.errors.startTime)}
                    helperText={formik.touched.startTime && formik.errors.startTime}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      style: { fontSize: isMobile ? '16px' : '14px' }
                    }}
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    label="종료 시간"
                    type="time"
                    name="endTime"
                    value={formik.values.endTime ? formik.values.endTime.toTimeString().slice(0, 5) : ''}
                    onChange={(e) => {
                      if (!e.target.value || e.target.value === '') {
                        return;
                      }
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      if (isNaN(hours) || isNaN(minutes)) {
                        return;
                      }
                      const time = new Date();
                      time.setHours(hours, minutes, 0, 0);
                      formik.setFieldValue('endTime', time);
                    }}
                    onBlur={formik.handleBlur}
                    fullWidth
                    error={formik.touched.endTime && Boolean(formik.errors.endTime)}
                    helperText={formik.touched.endTime && formik.errors.endTime}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      style: { fontSize: isMobile ? '16px' : '14px' }
                    }}
                  />
                </Grid>

                {/* 4번째 행: 야간근무 체크박스 */}
                <Grid item xs={12}>
                  <Box sx={{ 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 1, 
                    p: 2,
                    bgcolor: 'background.paper'
                  }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formik.values.workDate && formik.values.endDate && 
                                   formik.values.workDate.getTime() !== formik.values.endDate.getTime()}
                          onChange={(e) => {
                            if (!formik.values.workDate) return;
                            if (e.target.checked) {
                              // 야간근무로 설정: 종료일을 다음날로
                              const nextDay = new Date(formik.values.workDate);
                              nextDay.setDate(nextDay.getDate() + 1);
                              formik.setFieldValue('endDate', nextDay);
                            } else {
                              // 일반 근무로 설정: 종료일을 같은 날로
                              formik.setFieldValue('endDate', formik.values.workDate);
                            }
                          }}
                          sx={{ 
                            '& .MuiSvgIcon-root': { 
                              fontSize: isMobile ? 28 : 24 
                            } 
                          }}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            야간근무 (자정을 넘는 근무)
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            종료시간이 다음날인 경우 체크하세요
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                </Grid>





                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="메모"
                    multiline
                    rows={3}
                    value={formik.values.notes}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    name="notes"
                    error={formik.touched.notes && Boolean(formik.errors.notes)}
                    helperText={formik.touched.notes && formik.errors.notes}
                    placeholder="근무 중 특이사항이나 메모를 입력하세요"
                  />
                </Grid>

                {formik.values.startTime && formik.values.endTime && formik.values.workDate && formik.values.endDate && (
                  <Grid item xs={12}>
                    <Alert 
                      severity={formik.errors.endDate || formik.errors.endTime ? "warning" : "info"}
                      sx={{ fontSize: isMobile ? '0.9rem' : '0.875rem' }}
                    >
                      <Typography variant="body2" sx={{ fontSize: isMobile ? '0.95rem' : '0.875rem' }}>
                        <strong>예상 총 근무 시간:</strong> {totalHours}시간
                        {formik.values.workDate.getTime() !== formik.values.endDate.getTime() && (
                          <Chip 
                            label="야간근무" 
                            size="small" 
                            color="warning" 
                            sx={{ ml: 1, fontSize: '0.75rem' }} 
                          />
                        )}
                        <br />
                        <strong>적용 시급:</strong> {user?.hourlyWage?.toLocaleString() || 0}원/시간
                        <br />
                        <strong>예상 총 급여:</strong> {(totalHours * (user?.hourlyWage || 0)).toLocaleString()}원
                      </Typography>
                      {formik.errors.endDate && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                          ⚠️ {formik.errors.endDate}
                        </Typography>
                      )}
                      {formik.errors.endTime && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                          ⚠️ {formik.errors.endTime}
                        </Typography>
                      )}
                    </Alert>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Box display="flex" gap={2} justifyContent="flex-end">
                    <Button onClick={handleCancel} variant="outlined">
                      취소
                    </Button>
                    <Button 
                      type="submit"
                      variant="contained"
                      startIcon={<Save />}
                      disabled={!formik.isValid || formik.isSubmitting || storesLoading || !stores || stores.length === 0}
                      onClick={() => {
                        console.log('Formik 상태:', {
                          isValid: formik.isValid,
                          isSubmitting: formik.isSubmitting,
                          errors: formik.errors,
                          values: formik.values,
                          touched: formik.touched
                        });
                      }}
                    >
                      {formik.isSubmitting ? <CircularProgress size={20} /> : (editingId ? '수정' : '저장')}
                      {!formik.isValid && ' (유효성 검증 실패)'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </Paper>
        )}

        {/* 근무 일정 목록 */}
        <Paper sx={{ p: isMobile ? 1 : 3 }}>
          {isMobile ? (
            // 모바일 카드 뷰
            <Box>
              {schedules && schedules.length > 0 ? (
                schedules.map((schedule) => (
                <Card key={schedule._id} sx={{ mb: 2 }}>
                  {isSelecting && (
                    <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                      <Checkbox
                        checked={selectedSchedules.includes(schedule._id)}
                        onChange={() => handleSelectSchedule(schedule._id)}
                        size="small"
                      />
                    </Box>
                  )}
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="h6">
                        {format(new Date(schedule.workDate), 'MM/dd (E)', { locale: ko })}
                        {schedule.endDate && new Date(schedule.workDate).getTime() !== new Date(schedule.endDate).getTime() && (
                          <span style={{ fontSize: '0.8em', color: 'text.secondary' }}>
                            {' '}~ {format(new Date(schedule.endDate), 'MM/dd', { locale: ko })}
                          </span>
                        )}
                      </Typography>
                      <Chip
                        label={getStatusLabel(schedule.status)}
                        color={getStatusColor(schedule.status)}
                        size="small"
                      />
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        {schedule.endDate && new Date(schedule.workDate).getTime() !== new Date(schedule.endDate).getTime() && (
                          <span> (야간근무)</span>
                        )}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {schedule.totalHours}시간
                      </Typography>
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        근무점포: {schedule.storeId?.name || '점포 정보 없음'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        시급: {schedule.hourlyWage?.toLocaleString() || 0}원
                      </Typography>
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        총 급여: {schedule.totalPay?.toLocaleString() || 0}원
                      </Typography>
                    </Box>
                    

                    
                    {schedule.notes && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {schedule.notes}
                      </Typography>
                    )}
                  </CardContent>
                  
                  <CardActions sx={{ gap: 0.5, flexWrap: 'nowrap' }}>
                    {/* 상세보기 버튼 */}
                    <Tooltip title="상세보기">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetail(schedule)}
                        color="info"
                        sx={{ padding: 0.5 }}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    {/* 승인 요청 버튼 - 상태가 null인 경우에만 표시 */}
                    {(schedule.status === null || schedule.status === undefined) && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() => handleRequestApproval(schedule._id)}
                        startIcon={<Schedule />}
                        disabled={requestingApproval[schedule._id]}
                        sx={{ 
                          minWidth: 'auto',
                          px: 1,
                          fontSize: '0.75rem',
                          '& .MuiButton-startIcon': {
                            marginRight: 0.5
                          }
                        }}
                      >
                        {requestingApproval[schedule._id] ? '요청 중...' : '승인 요청'}
                      </Button>
                    )}
                    <Tooltip title={schedule.status === 'pending' ? '승인 진행중인 일정은 수정할 수 없습니다' : schedule.status === 'approved' ? '승인된 일정은 수정할 수 없습니다' : '수정'}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleEditClick(schedule)}
                          disabled={schedule.status === 'approved' || schedule.status === 'pending'}
                          color="primary"
                          sx={{ padding: 0.5 }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={schedule.status === 'pending' ? '승인 진행중인 일정은 삭제할 수 없습니다' : schedule.status === 'approved' ? '승인된 일정은 삭제할 수 없습니다' : '삭제'}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(schedule._id)}
                          disabled={schedule.status === 'approved' || schedule.status === 'pending'}
                          color="error"
                          sx={{ padding: 0.5 }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </CardActions>
                </Card>
              ))) : (
                <Box textAlign="center" py={isMobile ? 3 : 4}>
                  <Typography variant={isMobile ? 'h6' : 'h6'} color="text.secondary" sx={{ fontSize: isMobile ? '1.1rem' : '1.25rem' }}>
                    등록된 근무 일정이 없습니다
                  </Typography>
                  <Typography variant={isMobile ? 'body2' : 'body2'} color="text.secondary" mt={1} sx={{ fontSize: isMobile ? '0.9rem' : '0.875rem' }}>
                    근무 시간 추가 버튼을 클릭하여 첫 번째 근무 일정을 등록해보세요
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            // 데스크톱 테이블 뷰
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {isSelecting && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedSchedules.length === schedules.length && schedules.length > 0}
                          indeterminate={selectedSchedules.length > 0 && selectedSchedules.length < schedules.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                    )}
                    <TableCell>날짜</TableCell>
                    <TableCell>근무점포</TableCell>
                    <TableCell>시작 시간</TableCell>
                    <TableCell>종료 시간</TableCell>
                    <TableCell>총 근무 시간</TableCell>
                    <TableCell>시급</TableCell>
                    <TableCell>총 급여</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>메모</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                                <TableBody>
                  {schedules && schedules.length > 0 ? (
                    schedules.map((schedule) => (
                      <TableRow key={schedule._id}>
                        {isSelecting && (
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedSchedules.includes(schedule._id)}
                              onChange={() => handleSelectSchedule(schedule._id)}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          {format(new Date(schedule.workDate), 'yyyy-MM-dd (E)', { locale: ko })}
                          {schedule.endDate && new Date(schedule.workDate).getTime() !== new Date(schedule.endDate).getTime() && (
                            <div>
                              <Typography variant="caption" color="text.secondary">
                                ~ {format(new Date(schedule.endDate), 'MM/dd (E)', { locale: ko })}
                              </Typography>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{schedule.storeId?.name || '점포 정보 없음'}</TableCell>
                        <TableCell>{formatTime(schedule.startTime)}</TableCell>
                        <TableCell>
                          {formatTime(schedule.endTime)}
                          {schedule.endDate && new Date(schedule.workDate).getTime() !== new Date(schedule.endDate).getTime() && (
                            <Chip label="야간" size="small" color="warning" sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                        <TableCell>{schedule.totalHours}시간</TableCell>
                        <TableCell>{schedule.hourlyWage?.toLocaleString() || 0}원</TableCell>
                        <TableCell>{schedule.totalPay?.toLocaleString() || 0}원</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(schedule.status)}
                            color={getStatusColor(schedule.status)}
                            size="small"
                            icon={
                              schedule.status === 'approved' ? <CheckCircle /> :
                              schedule.status === 'rejected' ? <Cancel /> :
                              <Schedule />
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {schedule.notes ? (
                            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                              {schedule.notes}
                            </Typography>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5} alignItems="center" flexWrap="nowrap">
                            {/* 상세보기 버튼 */}
                            <Tooltip title="상세보기">
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetail(schedule)}
                                color="info"
                                sx={{ padding: 0.5 }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            {/* 승인 요청 버튼 - 상태가 null인 경우에만 표시 */}
                            {(schedule.status === null || schedule.status === undefined) && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                onClick={() => handleRequestApproval(schedule._id)}
                                startIcon={<Schedule />}
                                disabled={requestingApproval[schedule._id]}
                                sx={{ 
                                  minWidth: 'auto',
                                  px: 1,
                                  fontSize: '0.75rem',
                                  '& .MuiButton-startIcon': {
                                    marginRight: 0.5
                                  }
                                }}
                              >
                                {requestingApproval[schedule._id] ? '요청 중...' : '승인 요청'}
                              </Button>
                            )}
                            <Tooltip title={schedule.status === 'pending' ? '승인 진행중인 일정은 수정할 수 없습니다' : schedule.status === 'approved' ? '승인된 일정은 수정할 수 없습니다' : '수정'}>
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditClick(schedule)}
                                  disabled={schedule.status === 'approved' || schedule.status === 'pending'}
                                  color="primary"
                                  sx={{ padding: 0.5 }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title={schedule.status === 'pending' ? '승인 진행중인 일정은 삭제할 수 없습니다' : schedule.status === 'approved' ? '승인된 일정은 삭제할 수 없습니다' : '삭제'}>
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(schedule._id)}
                                  disabled={schedule.status === 'approved' || schedule.status === 'pending'}
                                  color="error"
                                  sx={{ padding: 0.5 }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Box py={isMobile ? 3 : 4}>
                          <Typography variant={isMobile ? 'h6' : 'h6'} color="text.secondary" sx={{ fontSize: isMobile ? '1.1rem' : '1.25rem' }}>
                            등록된 근무 일정이 없습니다
                          </Typography>
                          <Typography variant={isMobile ? 'body2' : 'body2'} color="text.secondary" mt={1} sx={{ fontSize: isMobile ? '0.9rem' : '0.875rem' }}>
                            근무 시간 추가 버튼을 클릭하여 첫 번째 근무 일정을 등록해보세요
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                                     )}
                  </TableBody>
              </Table>
            </TableContainer>
          )}

          {schedules && schedules.length > 0 && totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={2}>
                              <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(event, page) => dispatch(getWorkSchedules({ page, month: selectedMonth }))}
                />
            </Box>
          )}
        </Paper>

        {/* 모바일 플로팅 액션 버튼 */}
        {isMobile && !isAdding && !editingId && (
          <Fab
            color="primary"
            aria-label="add"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={handleAddClick}
          >
            <Add />
          </Fab>
        )}

        {/* 근무 일정 상세보기 다이얼로그 */}
        <Dialog
          open={detailDialogOpen}
          onClose={handleCloseDetail}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">근무 일정 상세보기</Typography>
              <IconButton onClick={handleCloseDetail}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedSchedule && (
              <Box>
                {/* 기본 정보 */}
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarToday color="primary" />
                    기본 정보
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <CalendarToday fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">근무 날짜</Typography>
                      </Box>
                      <Typography variant="body1">
                        {format(new Date(selectedSchedule.workDate), 'yyyy년 MM월 dd일 (E)', { locale: ko })}
                        {selectedSchedule.endDate && new Date(selectedSchedule.workDate).getTime() !== new Date(selectedSchedule.endDate).getTime() && (
                          <span style={{ color: '#1976d2' }}>
                            {' '}~ {format(new Date(selectedSchedule.endDate), 'MM월 dd일 (E)', { locale: ko })}
                          </span>
                        )}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">근무점포</Typography>
                      </Box>
                      <Typography variant="body1">{selectedSchedule.storeId?.name || '점포 정보 없음'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <AccessTime fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">근무 시간</Typography>
                      </Box>
                      <Typography variant="body1">
                        {formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}
                        {selectedSchedule.endDate && new Date(selectedSchedule.workDate).getTime() !== new Date(selectedSchedule.endDate).getTime() && (
                          <span style={{ color: '#1976d2' }}> (야간근무)</span>
                        )}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <AccessTime fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">총 근무시간</Typography>
                      </Box>
                      <Typography variant="body1" fontWeight="bold">
                        {selectedSchedule.totalHours}시간
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                {/* 승인 상태 */}
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle color="primary" />
                    승인 상태
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label={getStatusLabel(selectedSchedule.status)}
                      color={getStatusColor(selectedSchedule.status)}
                      size="medium"
                    />
                    {selectedSchedule.approvedBy && (
                      <Typography variant="body2" color="text.secondary">
                        승인자: {selectedSchedule.approvedBy.username}
                      </Typography>
                    )}
                    {selectedSchedule.approvedAt && (
                      <Typography variant="body2" color="text.secondary">
                        승인일: {format(new Date(selectedSchedule.approvedAt), 'yyyy년 MM월 dd일 HH:mm')}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* 급여 정보 */}
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person color="primary" />
                    급여 정보
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="body2" color="text.secondary">시급</Typography>
                      </Box>
                      <Typography variant="body1">
                        {selectedSchedule.hourlyWage?.toLocaleString() || 0}원
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="body2" color="text.secondary">총 급여</Typography>
                      </Box>
                      <Typography variant="body1" fontWeight="bold">
                        {selectedSchedule.totalPay?.toLocaleString() || 0}원
                      </Typography>
                    </Grid>
                    {selectedSchedule.overtimeHours > 0 && (
                      <Grid item xs={12} sm={6}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="body2" color="text.secondary">초과근무시간</Typography>
                        </Box>
                        <Typography variant="body1" color="error">
                          {selectedSchedule.overtimeHours}시간
                        </Typography>
                      </Grid>
                    )}
                    {selectedSchedule.breakTime > 0 && (
                      <Grid item xs={12} sm={6}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="body2" color="text.secondary">휴식시간</Typography>
                        </Box>
                        <Typography variant="body1">
                          {selectedSchedule.breakTime}시간
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>

                {/* 메모 */}
                {selectedSchedule.notes && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      메모
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="body1">
                        {selectedSchedule.notes}
                      </Typography>
                    </Paper>
                  </Box>
                )}

                {/* 거절 사유 */}
                {selectedSchedule.rejectionReason && (
                  <Box mt={3}>
                    <Typography variant="h6" gutterBottom color="error">
                      거절 사유
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Paper sx={{ p: 2, bgcolor: 'error.50' }}>
                      <Typography variant="body1" color="error">
                        {selectedSchedule.rejectionReason}
                      </Typography>
                    </Paper>
                  </Box>
                )}

                {/* 수정 사유 */}
                {selectedSchedule.modificationReason && (
                  <Box mt={3}>
                    <Typography variant="h6" gutterBottom color="warning.main">
                      수정 사유
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Paper sx={{ p: 2, bgcolor: 'warning.50' }}>
                      <Typography variant="body1" color="warning.dark">
                        {selectedSchedule.modificationReason}
                      </Typography>
                    </Paper>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDetail} color="primary">
              닫기
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default WorkSchedule; 