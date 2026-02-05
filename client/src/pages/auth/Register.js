import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Divider,
  IconButton,
  InputAdornment,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
} from '@mui/icons-material';

import { register, clearError } from '../../store/slices/authSlice';
import { fetchPublicStores } from '../../store/slices/metaSlice';
import KakaoLogin from '../../components/auth/KakaoLogin';

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { loading: authLoading, error, errorType } = useSelector((state) => state.auth);
  const { stores, loading: metaLoading } = useSelector((state) => state.meta);
  const storesLoading = metaLoading?.stores || false;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [localErrorType, setLocalErrorType] = useState(null);

  // 점포 목록 가져오기 (점포관리에서 등록된 모든 활성화된 점포)
  useEffect(() => {
    dispatch(fetchPublicStores());
  }, [dispatch]);

  // 동적 validation schema 생성
  const validationSchema = Yup.object({
    username: Yup.string()
      .min(2, '사용자명은 최소 2자 이상이어야 합니다')
      .max(50, '사용자명은 50자를 초과할 수 없습니다')
      .required('사용자명을 입력해주세요'),
    email: Yup.string()
      .email('올바른 이메일 형식을 입력해주세요')
      .required('이메일을 입력해주세요'),
    password: Yup.string()
      .min(6, '비밀번호는 최소 6자 이상이어야 합니다')
      .required('비밀번호를 입력해주세요'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], '비밀번호가 일치하지 않습니다')
      .required('비밀번호 확인을 입력해주세요'),
    role: Yup.string()
      .oneOf(['employee', 'manager', 'owner'], '올바른 역할을 선택해주세요')
      .required('역할을 선택해주세요'),
    workLocation: Yup.string()
      .oneOf(stores.length > 0 ? stores.map(store => store.name) : [], '올바른 근무점포를 선택해주세요')
      .when('role', {
        is: (role) => role === 'employee' || role === 'manager',
        then: (schema) => schema.required('근무점포를 선택해주세요'),
        otherwise: (schema) => schema.optional(),
      }),
    hourlyWage: Yup.number()
      .min(0, '시급은 0 이상이어야 합니다')
      .when('role', {
        is: (role) => role === 'employee' || role === 'manager',
        then: (schema) => schema.required('시급을 입력해주세요'),
        otherwise: (schema) => schema.optional(),
      }),
  });

  // 근로일 설정 상태

  // 근로일 설정 상태
  const [workSchedule, setWorkSchedule] = useState({
    monday: { enabled: false, startTime: '09:00', endTime: '18:00' },
    tuesday: { enabled: false, startTime: '09:00', endTime: '18:00' },
    wednesday: { enabled: false, startTime: '09:00', endTime: '18:00' },
    thursday: { enabled: false, startTime: '09:00', endTime: '18:00' },
    friday: { enabled: false, startTime: '09:00', endTime: '18:00' },
    saturday: { enabled: false, startTime: '09:00', endTime: '18:00' },
    sunday: { enabled: false, startTime: '09:00', endTime: '18:00' }
  });

  const weekdays = [
    { key: 'monday', label: '월요일' },
    { key: 'tuesday', label: '화요일' },
    { key: 'wednesday', label: '수요일' },
    { key: 'thursday', label: '목요일' },
    { key: 'friday', label: '금요일' },
    { key: 'saturday', label: '토요일' },
    { key: 'sunday', label: '일요일' }
  ];

  const formik = useFormik({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'employee', // 기본값은 근로자
      workLocation: '',
      hourlyWage: '10030', // 최저시급 기본값
    },
    validationSchema,
    enableReinitialize: true, // stores가 변경될 때 formik 재초기화
    onSubmit: async (values) => {
      // 선택된 점포의 ID 찾기
      const selectedStore = stores.find(store => store.name === values.workLocation);
      
      const submitData = {
        ...values,
        storeId: selectedStore?.id || selectedStore?._id, // 점포 ID 추가
        hourlyWage: parseInt(values.hourlyWage),
        workSchedule
      };
      const result = await dispatch(register(submitData));
      // 회원가입 성공 시에만 리다이렉션
      if (result.meta.requestStatus === 'fulfilled') {
        setLocalError(null);
        setLocalErrorType(null);
        navigate('/');
      } else {
        // 실패 시 로컬 상태에 에러 저장
        if (result.payload) {
          setLocalError(result.payload.message || result.payload);
          setLocalErrorType(result.payload.type || 'UNKNOWN_ERROR');
        }
      }
    },
  });

  // 점포 목록이 로딩되면 기본값 설정
  useEffect(() => {
    if (stores.length > 0 && !formik.values.workLocation) {
      formik.setFieldValue('workLocation', stores[0].name);
    }
  }, [stores, formik.values.workLocation]);

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleClearError = () => {
    dispatch(clearError());
    setLocalError(null);
    setLocalErrorType(null);
  };

  // 에러 메시지는 사용자가 직접 닫을 때까지 유지
  // 자동으로 사라지지 않도록 설정
  
  // Redux 에러를 로컬 상태로 동기화
  React.useEffect(() => {
    if (error && !localError) {
      setLocalError(error);
      setLocalErrorType(errorType);
    }
  }, [error, errorType, localError]);

  // 에러가 있을 때는 현재 페이지에 머무르도록 보호
  React.useEffect(() => {
    if (localError || error) {
      // 에러가 있을 때는 현재 페이지에 머무르도록 함
      console.log('회원가입 에러 발생, 페이지 유지:', localError || error);
    }
  }, [localError, error]);

  const handleWorkScheduleChange = (day, field, value) => {
    setWorkSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
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
    
    // 최소 1시간, 최대 24시간 근무 허용
    return diffHours >= 1 && diffHours <= 24;
  };

  // 저장 버튼 활성화 조건
  const canSave = () => {
    // 필수 필드 검증
    if (!formik.values.username || !formik.values.email || !formik.values.password || !formik.values.confirmPassword) {
      return false;
    }

    // 근로자/매니저인 경우 점포 선택 필수
    if ((formik.values.role === 'employee' || formik.values.role === 'manager') && 
        (storesLoading || stores.length === 0 || !formik.values.workLocation)) {
      return false;
    }

    // 근로일 설정 검증 - 최소 하나의 요일이 선택되어야 함
    const enabledDays = Object.keys(workSchedule).filter(day => workSchedule[day].enabled);
    if (enabledDays.length === 0) {
      return false;
    }

    // 선택된 요일들의 시간 유효성 검증
    for (const day of enabledDays) {
      const schedule = workSchedule[day];
      if (!validateTimeRange(schedule.startTime, schedule.endTime)) {
        return false;
      }
    }

    return true;
  };

  const [applyAllDialogOpen, setApplyAllDialogOpen] = useState(false);
  const [applyAllStartTime, setApplyAllStartTime] = useState('09:00');
  const [applyAllEndTime, setApplyAllEndTime] = useState('18:00');

  const handleApplyToAll = () => {
    const enabledDays = Object.keys(workSchedule).filter(day => workSchedule[day].enabled);
    if (enabledDays.length === 0) {
      alert('먼저 근무 가능한 요일을 선택해주세요.');
      return;
    }

    // 시간 유효성 검증
    if (!validateTimeRange(applyAllStartTime, applyAllEndTime)) {
      alert('올바른 시간 범위를 입력해주세요. (최소 1시간, 최대 24시간)');
      return;
    }

    const newWorkSchedule = { ...workSchedule };
    enabledDays.forEach(day => {
      newWorkSchedule[day] = {
        ...newWorkSchedule[day],
        startTime: applyAllStartTime,
        endTime: applyAllEndTime
      };
    });
    setWorkSchedule(newWorkSchedule);
    setApplyAllDialogOpen(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 600,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom align="center">
          회원가입
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          CSMS에 가입하세요
        </Typography>

        {(localError || error) && (
          <Alert 
            severity={(localErrorType || errorType) === 'EMAIL_EXISTS' ? 'warning' : 'error'} 
            onClose={handleClearError} 
            sx={{ 
              mb: 2,
              '& .MuiAlert-message': {
                width: '100%'
              },
              animation: 'shake 0.5s ease-in-out',
              '@keyframes shake': {
                '0%, 100%': { transform: 'translateX(0)' },
                '25%': { transform: 'translateX(-5px)' },
                '75%': { transform: 'translateX(5px)' }
              },
              border: '2px solid',
              borderColor: (localErrorType || errorType) === 'EMAIL_EXISTS' ? 'warning.main' : 'error.main',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {(localErrorType || errorType) === 'EMAIL_EXISTS' && '이미 등록된 이메일'}
                {(localErrorType || errorType) === 'USERNAME_EXISTS' && '이미 사용 중인 사용자명'}
                {(localErrorType || errorType) === 'VALIDATION_ERROR' && '입력 정보 오류'}
                {(localErrorType || errorType) === 'UNKNOWN_ERROR' && '회원가입 오류'}
              </Typography>
              <Typography variant="body2">
                {localError || error}
              </Typography>
              {(localErrorType || errorType) === 'EMAIL_EXISTS' && (
                <Typography variant="body2" sx={{ mt: 1, color: 'primary.main' }}>
                  <Link to="/login" style={{ textDecoration: 'none', color: 'inherit' }}>
                    로그인하러 가기 →
                  </Link>
                </Typography>
              )}
            </Box>
          </Alert>
        )}

        <form onSubmit={formik.handleSubmit}>
          <TextField
            fullWidth
            id="username"
            name="username"
            label="사용자명"
            value={formik.values.username}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.username && Boolean(formik.errors.username)}
            helperText={formik.touched.username && formik.errors.username}
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            id="email"
            name="email"
            label="이메일"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            id="password"
            name="password"
            label="비밀번호"
            type={showPassword ? 'text' : 'password'}
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleShowPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            id="confirmPassword"
            name="confirmPassword"
            label="비밀번호 확인"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formik.values.confirmPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
            helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleShowConfirmPassword}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel id="role-label">역할</InputLabel>
            <Select
              labelId="role-label"
              id="role"
              name="role"
              value={formik.values.role}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.role && Boolean(formik.errors.role)}
              disabled
            >
              <MenuItem value="employee">근로자</MenuItem>
              <MenuItem value="manager">매니저</MenuItem>
              <MenuItem value="owner">점주</MenuItem>
            </Select>
          </FormControl>

          <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
            <Typography variant="body2">
              역할과 시급은 점주님에 의해 수정됩니다.
            </Typography>
          </Alert>

          {(formik.values.role === 'employee' || formik.values.role === 'manager') && (
            <>
              <FormControl fullWidth margin="normal">
                <InputLabel id="workLocation-label">근무점포</InputLabel>
                <Select
                  labelId="workLocation-label"
                  id="workLocation"
                  name="workLocation"
                  value={formik.values.workLocation}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.workLocation && Boolean(formik.errors.workLocation)}
                  disabled={Boolean(storesLoading) || stores.length === 0}
                >
                  {storesLoading ? (
                    <MenuItem value="">점포 목록을 불러오는 중...</MenuItem>
                  ) : stores.length === 0 ? (
                    <MenuItem value="">점포관리에서 등록된 점포가 없습니다</MenuItem>
                  ) : (
                    stores.map(store => (
                      <MenuItem key={store._id || store.id} value={store.name}>{store.name}</MenuItem>
                    ))
                  )}
                </Select>
                {stores.length === 0 && !storesLoading && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    점포관리에서 점포를 등록해주세요.
                  </Typography>
                )}
              </FormControl>

              <TextField
                fullWidth
                id="hourlyWage"
                name="hourlyWage"
                label="시급 (원)"
                type="number"
                value={formik.values.hourlyWage}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.hourlyWage && Boolean(formik.errors.hourlyWage)}
                helperText={formik.touched.hourlyWage && formik.errors.hourlyWage}
                margin="normal"
                disabled
              />
            </>
          )}

          {/* 근로일과 시간 설정 */}
          {(formik.values.role === 'employee' || formik.values.role === 'manager') && (
            <Card sx={{ mt: 2, mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    근로일 및 시간 설정
                  </Typography>
                  <Button
                    variant="outlined"
                    size={isMobile ? "medium" : "small"}
                    onClick={() => setApplyAllDialogOpen(true)}
                    fullWidth={isMobile}
                    sx={{ ml: isMobile ? 0 : 2, mt: isMobile ? 1 : 0 }}
                  >
                    선택한 요일에 같은 시간 적용
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  근무 가능한 요일과 시간을 설정해주세요
                </Typography>
                
                <Grid container spacing={2}>
                  {weekdays.map((day) => (
                    <Grid item xs={12} key={day.key}>
                      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={workSchedule[day.key].enabled}
                              onChange={(e) => handleWorkScheduleChange(day.key, 'enabled', e.target.checked)}
                            />
                          }
                          label={day.label}
                        />
                        
                        {workSchedule[day.key].enabled && (
                          <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={6}>
                              <TextField
                                fullWidth
                                label="시작시간"
                                type="time"
                                value={workSchedule[day.key].startTime}
                                onChange={(e) => {
                                  if (!e.target.value || e.target.value === '') return;
                                  handleWorkScheduleChange(day.key, 'startTime', e.target.value);
                                }}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{
                                  style: { fontSize: '16px' } // 모바일에서 자동 줌 방지
                                }}
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <TextField
                                fullWidth
                                label="종료시간"
                                type="time"
                                value={workSchedule[day.key].endTime}
                                onChange={(e) => {
                                  if (!e.target.value || e.target.value === '') return;
                                  handleWorkScheduleChange(day.key, 'endTime', e.target.value);
                                }}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{
                                  style: { fontSize: '16px' }
                                }}
                                error={!validateTimeRange(workSchedule[day.key].startTime, workSchedule[day.key].endTime)}
                                helperText={
                                  !validateTimeRange(workSchedule[day.key].startTime, workSchedule[day.key].endTime) ? 
                                  '최소 1시간, 최대 24시간 근무' : ''
                                }
                              />
                            </Grid>
                          </Grid>
                        )}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={authLoading || !canSave() || !!(localError || error)}
            sx={{ mt: 3, mb: 2 }}
          >
            {authLoading ? <CircularProgress size={24} /> : '회원가입'}
          </Button>
          
          {/* 점포가 없을 때 안내 메시지 */}
          {(formik.values.role === 'employee' || formik.values.role === 'manager') && 
           stores.length === 0 && !storesLoading && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                등록된 점포가 없습니다. 점주님이 먼저 점포를 등록해주세요.
              </Typography>
            </Alert>
          )}
        </form>

        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" color="text.secondary">
            또는
          </Typography>
        </Divider>

        <KakaoLogin />

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" style={{ textDecoration: 'none', color: 'primary.main' }}>
              로그인
            </Link>
          </Typography>
        </Box>

        {/* 전체 적용 다이얼로그 */}
        <Dialog open={applyAllDialogOpen} onClose={() => setApplyAllDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>선택한 요일에 같은 시간 적용</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              선택된 모든 요일에 아래 시간을 일괄 적용합니다.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="시작시간"
                  type="time"
                  value={applyAllStartTime}
                  onChange={(e) => setApplyAllStartTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    style: { fontSize: '16px' }
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="종료시간"
                  type="time"
                  value={applyAllEndTime}
                  onChange={(e) => setApplyAllEndTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    style: { fontSize: '16px' }
                  }}
                  error={!validateTimeRange(applyAllStartTime, applyAllEndTime)}
                  helperText={
                    !validateTimeRange(applyAllStartTime, applyAllEndTime) ? 
                    '최소 1시간, 최대 24시간' : ''
                  }
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApplyAllDialogOpen(false)}>취소</Button>
            <Button 
              onClick={handleApplyToAll} 
              variant="contained"
              disabled={!validateTimeRange(applyAllStartTime, applyAllEndTime)}
            >
              적용
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default Register; 