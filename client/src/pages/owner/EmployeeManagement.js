import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Pagination,
  Switch,
  FormControlLabel,
  Grid,
  Stack
} from '@mui/material';
import { Edit, PersonOff, Business, Delete } from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { StoreSelector } from '../../components/common';
import { useStoreSelection } from '../../hooks/useMeta';
import ResponsiveTable from '../../components/common/ResponsiveTable';
import { useIsMobile } from '../../hooks/useMediaQuery';

const EmployeeManagement = () => {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();
  
  // 점포 선택 훅
  const { stores, selectedStoreId: metaSelectedStoreId } = useStoreSelection();
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState('all');
  const [editForm, setEditForm] = useState({
    role: '',
    hourlyWage: '',
    taxType: '',
    storeId: '',
    ssn: '',
    hireDate: '',
    isActive: true,
    workSchedule: {
      monday: { enabled: false, startTime: '09:00', endTime: '18:00' },
      tuesday: { enabled: false, startTime: '09:00', endTime: '18:00' },
      wednesday: { enabled: false, startTime: '09:00', endTime: '18:00' },
      thursday: { enabled: false, startTime: '09:00', endTime: '18:00' },
      friday: { enabled: false, startTime: '09:00', endTime: '18:00' },
      saturday: { enabled: false, startTime: '09:00', endTime: '18:00' },
      sunday: { enabled: false, startTime: '09:00', endTime: '18:00' }
    }
  });
  const [terminateForm, setTerminateForm] = useState({
    terminationDate: ''
  });

  useEffect(() => {
    fetchEmployeeContracts();
  }, [selectedStoreId]);

  const fetchEmployeeContracts = async () => {
    try {
      setLoading(true);
      const url = selectedStoreId === 'all' 
        ? '/api/owner/employee-contracts'
        : `/api/owner/employee-contracts?storeId=${selectedStoreId}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('근로자 계약정보를 불러오는데 실패했습니다');
      }
      
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (employee) => {
    console.log('편집할 직원 정보:', employee);
    setSelectedEmployee(employee);
    setEditForm({
      role: employee.role || 'employee',
      ssn: employee.ssn || '',
      hourlyWage: employee.hourlyWage || '',
      taxType: employee.taxType || '미신고',
      storeId: employee.storeId || '',
      hireDate: employee.hireDate ? format(new Date(employee.hireDate), 'yyyy-MM-dd') : '',
      isActive: employee.isActive,
      workSchedule: employee.workSchedule || {
        monday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        tuesday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        wednesday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        thursday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        friday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        saturday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        sunday: { enabled: false, startTime: '09:00', endTime: '18:00' }
      }
    });
    console.log('설정된 editForm:', {
      role: employee.role || 'employee',
      hourlyWage: employee.hourlyWage || '',
      storeId: employee.storeId || '',
      workSchedule: employee.workSchedule
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const response = await fetch(`/api/owner/employee-contracts/${selectedEmployee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          role: editForm.role,
          hourlyWage: parseInt(editForm.hourlyWage),
          taxType: editForm.taxType,
          storeId: editForm.storeId,
          ssn: editForm.ssn,
          hireDate: editForm.hireDate,
          workSchedule: editForm.workSchedule
        })
      });

      if (!response.ok) {
        throw new Error('근로자 정보 수정에 실패했습니다');
      }

      setEditDialogOpen(false);
      setSelectedEmployee(null);
      fetchEmployeeContracts(); // 목록 새로고침
    } catch (error) {
      setError(error.message);
    }
  };

  const handleTerminateClick = (employee) => {
    setSelectedEmployee(employee);
    setTerminateForm({
      terminationDate: format(new Date(), 'yyyy-MM-dd')
    });
    setTerminateDialogOpen(true);
  };

  const handleTerminateSubmit = async () => {
    try {
      const response = await fetch(`/api/owner/employee-contracts/${selectedEmployee._id}/terminate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(terminateForm)
      });

      if (!response.ok) {
        throw new Error('퇴사 처리에 실패했습니다');
      }

      setTerminateDialogOpen(false);
      setSelectedEmployee(null);
      fetchEmployeeContracts(); // 목록 새로고침
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteClick = (employee) => {
    setSelectedEmployee(employee);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSubmit = async () => {
    try {
      const response = await fetch(`/api/owner/employee-contracts/${selectedEmployee._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '근로자 삭제에 실패했습니다');
      }

      setDeleteDialogOpen(false);
      setSelectedEmployee(null);
      fetchEmployeeContracts(); // 목록 새로고침
    } catch (error) {
      setError(error.message);
    }
  };

  const handleWorkScheduleChange = (day, field, value) => {
    setEditForm(prev => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        [day]: {
          ...prev.workSchedule[day],
          [field]: value
        }
      }
    }));
  };

  // 시간 유효성 검증 함수
  const validateTimeRange = (startTime, endTime) => {
    if (!startTime || !endTime) return true; // 빈 값은 유효하다고 처리
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    // 야간 근무의 경우 (종료시간이 시작시간보다 작은 경우)
    if (end < start) {
      // 24시간을 더해서 계산
      end.setDate(end.getDate() + 1);
    }
    
    const diffHours = (end - start) / (1000 * 60 * 60);
    
    console.log('시간 유효성 검증:', { startTime, endTime, diffHours });
    
    // 최소 1시간, 최대 24시간 근무 허용
    const isValid = diffHours >= 1 && diffHours <= 24;
    console.log('시간 유효성 결과:', isValid);
    
    return isValid;
  };

  // 저장 버튼 활성화 조건
  const canSave = () => {
    console.log('canSave 함수 호출됨');
    console.log('현재 editForm 상태:', editForm);
    
    // 필수 필드 검증
          if (!editForm.role || !editForm.hourlyWage || !editForm.storeId || !editForm.hireDate) {
        console.log('필수 필드 검증 실패:', { role: editForm.role, hourlyWage: editForm.hourlyWage, storeId: editForm.storeId, hireDate: editForm.hireDate });
      return false;
    }

    // 근로일 설정 검증 - 최소 하나의 요일이 선택되어야 함
    const enabledDays = Object.keys(editForm.workSchedule).filter(day => editForm.workSchedule[day].enabled);
    console.log('선택된 요일들:', enabledDays);
    if (enabledDays.length === 0) {
      console.log('근로일 설정 검증 실패: 선택된 요일 없음');
      return false;
    }

    // 선택된 요일들의 시간 유효성 검증
    for (const day of enabledDays) {
      const schedule = editForm.workSchedule[day];
      console.log(`${day} 요일 스케줄:`, schedule);
      if (!validateTimeRange(schedule.startTime, schedule.endTime)) {
        console.log('시간 유효성 검증 실패:', day, schedule);
        return false;
      }
    }

    console.log('모든 검증 통과');
    return true;
  };

  const handleApplyToAll = () => {
    const enabledDays = Object.keys(editForm.workSchedule).filter(day => editForm.workSchedule[day].enabled);
    if (enabledDays.length === 0) {
      alert('먼저 근무 가능한 요일을 선택해주세요.');
      return;
    }

    const startTime = prompt('시작시간을 입력해주세요 (예: 09:00)', '09:00');
    const endTime = prompt('종료시간을 입력해주세요 (예: 18:00)', '18:00');

    if (startTime && endTime) {
      // 시간 유효성 검증
      if (!validateTimeRange(startTime, endTime)) {
        alert('올바른 시간 범위를 입력해주세요. (최소 1시간, 최대 24시간)');
        return;
      }

      const newWorkSchedule = { ...editForm.workSchedule };
      enabledDays.forEach(day => {
        newWorkSchedule[day] = {
          ...newWorkSchedule[day],
          startTime,
          endTime
        };
      });
      setEditForm(prev => ({
        ...prev,
        workSchedule: newWorkSchedule
      }));
    }
  };

  const getTaxTypeColor = (taxType) => {
    switch (taxType) {
      case '미신고':
        return 'default';
      case '주15시간미만':
        return 'warning';
      case '사업자소득(3.3%)':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'success' : 'error';
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'employee':
        return '근로자';
      case 'manager':
        return '매니저';
      case 'owner':
        return '점주';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const weekdays = [
    { key: 'monday', label: '월요일' },
    { key: 'tuesday', label: '화요일' },
    { key: 'wednesday', label: '수요일' },
    { key: 'thursday', label: '목요일' },
    { key: 'friday', label: '금요일' },
    { key: 'saturday', label: '토요일' },
    { key: 'sunday', label: '일요일' }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        근로자 관리
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 점포 선택 */}
      <Box sx={{ mb: 3 }}>
        <StoreSelector 
          label="점포 선택" 
          showCurrentStore={true}
          onChange={(storeId) => setSelectedStoreId(storeId || 'all')}
        />
      </Box>

      <Paper sx={{ p: isMobile ? 2 : 3 }}>
        <ResponsiveTable
          columns={[
            {
              id: 'username',
              label: '이름',
              render: (employee) => (
                <Typography variant={isMobile ? 'body2' : 'subtitle1'} fontWeight="bold">
                  {employee.username}
                </Typography>
              )
            },
            {
              id: 'role',
              label: '역할',
              render: (employee) => (
                <Chip
                  label={getRoleLabel(employee.role)}
                  color={employee.role === 'owner' ? 'error' : employee.role === 'manager' ? 'warning' : 'primary'}
                  size="small"
                />
              )
            },
            {
              id: 'storeName',
              label: '근무점포',
              hideOnMobile: true,
              render: (employee) => (
                <Box display="flex" alignItems="center">
                  <Business sx={{ fontSize: 16, mr: 1 }} />
                  {employee.storeName || '근무점포 미지정'}
                </Box>
              )
            },
            {
              id: 'hourlyWage',
              label: '시급',
              render: (employee) => (
                <Typography variant="body2" fontWeight="bold">
                  {employee.hourlyWage?.toLocaleString()}원
                </Typography>
              )
            },
            {
              id: 'hireDate',
              label: '입사일',
              hideOnMobile: true,
              render: (employee) => 
                employee.hireDate ? format(new Date(employee.hireDate), 'yyyy.MM.dd', { locale: ko }) : '정보 없음'
            },
            {
              id: 'workInfo',
              label: '근무정보',
              render: (employee) => (
                <Box>
                  <Typography variant="caption" display="block">
                    {employee.workDays || '정보 없음'}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    {employee.avgWorkTime}
                  </Typography>
                </Box>
              )
            },
            {
              id: 'taxType',
              label: '세금신고',
              hideOnMobile: true,
              render: (employee) => (
                <Box>
                  <Chip
                    label={employee.taxType}
                    color={getTaxTypeColor(employee.taxType)}
                    size="small"
                    sx={{ mb: 0.5 }}
                  />
                  {employee.weeklyWorkHours > 0 && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      주 {employee.weeklyWorkHours}시간
                    </Typography>
                  )}
                </Box>
              )
            },
            {
              id: 'isActive',
              label: '상태',
              render: (employee) => (
                <Chip
                  label={employee.isActive ? '재직' : '퇴사'}
                  color={getStatusColor(employee.isActive)}
                  size="small"
                />
              )
            },
            {
              id: 'actions',
              label: '작업',
              render: (employee) => (
                <Stack direction={isMobile ? 'column' : 'row'} spacing={1}>
                  <Button
                    size="small"
                    variant={isMobile ? 'outlined' : 'text'}
                    onClick={() => handleEditClick(employee)}
                    disabled={!employee.isActive}
                    startIcon={<Edit />}
                    fullWidth={isMobile}
                  >
                    {isMobile && '편집'}
                  </Button>
                  <Button
                    size="small"
                    variant={isMobile ? 'outlined' : 'text'}
                    onClick={() => handleTerminateClick(employee)}
                    color="error"
                    disabled={!employee.isActive}
                    startIcon={<PersonOff />}
                    fullWidth={isMobile}
                  >
                    {isMobile && '퇴사'}
                  </Button>
                  <Button
                    size="small"
                    variant={isMobile ? 'contained' : 'text'}
                    onClick={() => handleDeleteClick(employee)}
                    color="error"
                    startIcon={<Delete />}
                    fullWidth={isMobile}
                  >
                    {isMobile && '삭제'}
                  </Button>
                </Stack>
              )
            }
          ]}
          data={employees}
          keyField="_id"
          emptyMessage="등록된 근로자가 없습니다."
        />
      </Paper>

      {/* 편집 다이얼로그 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>근로자 계약정보 수정</DialogTitle>
        <DialogContent>
          {selectedEmployee && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedEmployee.username}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>역할</InputLabel>
                    <Select
                      value={editForm.role}
                      onChange={(e) => {
                        console.log('역할 변경:', e.target.value);
                        setEditForm({ ...editForm, role: e.target.value });
                      }}
                      label="역할"
                    >
                      <MenuItem value="employee">근로자</MenuItem>
                      <MenuItem value="manager">매니저</MenuItem>
                      <MenuItem value="owner">점주</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="시급 (원)"
                    type="number"
                    value={editForm.hourlyWage}
                    onChange={(e) => {
                      console.log('시급 변경:', e.target.value);
                      setEditForm({ ...editForm, hourlyWage: e.target.value });
                    }}
                    margin="normal"
                  />

                  <FormControl fullWidth margin="normal">
                    <InputLabel>근무점포</InputLabel>
                    <Select
                      value={editForm.storeId || ''}
                      onChange={(e) => {
                        console.log('근무점포 변경:', e.target.value);
                        setEditForm({ ...editForm, storeId: e.target.value });
                      }}
                      label="근무점포"
                    >
                      <MenuItem value="">점포 선택</MenuItem>
                      {stores.map(store => (
                        <MenuItem key={store._id} value={store._id}>
                          {store.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="주민번호 (000000-0000000)"
                    value={editForm.ssn}
                    onChange={(e) => setEditForm({ ...editForm, ssn: e.target.value })}
                    margin="normal"
                    placeholder="000000-0000000"
                    helperText="임금 신고용 엑셀 파일에 실제 주민번호가 포함됩니다"
                  />

                  <TextField
                    fullWidth
                    label="입사일"
                    type="date"
                    value={editForm.hireDate}
                    onChange={(e) => setEditForm({ ...editForm, hireDate: e.target.value })}
                    margin="normal"
                    InputLabelProps={{
                      shrink: true,
                    }}
                    helperText="근로자의 입사일을 설정합니다"
                  />

                  <FormControl fullWidth margin="normal">
                    <InputLabel>세금 신고 유형</InputLabel>
                    <Select
                      value={editForm.taxType}
                      onChange={(e) => setEditForm({ ...editForm, taxType: e.target.value })}
                      label="세금 신고 유형"
                    >
                      <MenuItem value="미신고">미신고</MenuItem>
                      <MenuItem value="주15시간미만">주15시간미만 (주 15시간 미만)</MenuItem>
                      <MenuItem value="사업자소득(3.3%)">사업자소득(3.3%) (주 15시간 이상)</MenuItem>
                    </Select>
                  </FormControl>
                  
                  {selectedEmployee && selectedEmployee.weeklyWorkHours > 0 && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        현재 주간 근무시간: {selectedEmployee.weeklyWorkHours}시간
                        {selectedEmployee.weeklyWorkHours < 15 ? ' (15시간 미만)' : ' (15시간 이상)'}
                      </Typography>
                    </Alert>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    근로일 및 시간 설정
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      근무 가능한 요일과 시간을 설정해주세요
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleApplyToAll}
                    >
                      전체 적용
                    </Button>
                  </Box>
                  
                  <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                    {weekdays.map((day) => (
                      <Box key={day.key} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1, mb: 1 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={editForm.workSchedule[day.key].enabled}
                              onChange={(e) => {
                                console.log(`${day.key} 요일 활성화 변경:`, e.target.checked);
                                handleWorkScheduleChange(day.key, 'enabled', e.target.checked);
                              }}
                            />
                          }
                          label={day.label}
                        />
                        
                        {editForm.workSchedule[day.key].enabled && (
                          <Grid container spacing={1} sx={{ mt: 1 }}>
                            <Grid item xs={6}>
                              <TextField
                                fullWidth
                                label="시작시간"
                                type="time"
                                value={editForm.workSchedule[day.key].startTime}
                                onChange={(e) => {
                                  console.log(`${day.key} 시작시간 변경:`, e.target.value);
                                  handleWorkScheduleChange(day.key, 'startTime', e.target.value);
                                }}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <TextField
                                fullWidth
                                label="종료시간"
                                type="time"
                                value={editForm.workSchedule[day.key].endTime}
                                onChange={(e) => {
                                  console.log(`${day.key} 종료시간 변경:`, e.target.value);
                                  handleWorkScheduleChange(day.key, 'endTime', e.target.value);
                                }}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                              />
                            </Grid>
                          </Grid>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  역할과 시급은 점주님에 의해 수정됩니다.
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleEditSubmit} 
            variant="contained"
            disabled={!canSave()}
          >
            저장 {canSave() ? '(활성화)' : '(비활성화)'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 퇴사 다이얼로그 */}
      <Dialog open={terminateDialogOpen} onClose={() => setTerminateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>퇴사 처리</DialogTitle>
        <DialogContent>
          {selectedEmployee && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedEmployee.username} 퇴사 처리
              </Typography>
              
              <Alert severity="warning" sx={{ mb: 2 }}>
                퇴사 처리 시 해당 근로자의 계정이 비활성화됩니다.
              </Alert>
              
              <TextField
                fullWidth
                label="퇴사일"
                type="date"
                value={terminateForm.terminationDate}
                onChange={(e) => setTerminateForm({ ...terminateForm, terminationDate: e.target.value })}
                margin="normal"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerminateDialogOpen(false)}>취소</Button>
          <Button onClick={handleTerminateSubmit} variant="contained" color="error">
            퇴사 처리
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>근로자 삭제</DialogTitle>
        <DialogContent>
          {selectedEmployee && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom color="error">
                {selectedEmployee.username} 삭제
              </Typography>
              
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  이 작업은 되돌릴 수 없습니다. 다음 데이터가 모두 삭제됩니다:
                </Typography>
                <Box component="ul" sx={{ mt: 1, mb: 0 }}>
                  <li>근로자 계정 정보</li>
                  <li>모든 근무 일정 데이터</li>
                  <li>모든 알림 데이터</li>
                  <li>기타 관련된 모든 데이터</li>
                </Box>
              </Alert>
              
              <Typography variant="body2" color="text.secondary">
                정말로 이 근로자를 삭제하시겠습니까?
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleDeleteSubmit} 
            variant="contained" 
            color="error"
            sx={{ 
              backgroundColor: 'error.main',
              '&:hover': {
                backgroundColor: 'error.dark'
              }
            }}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeManagement; 