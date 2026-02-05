import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
} from '@mui/icons-material';

import { login, clearError } from '../../store/slices/authSlice';
import KakaoLogin from '../../components/auth/KakaoLogin';

const validationSchema = Yup.object({
  email: Yup.string()
    .email('올바른 이메일 형식을 입력해주세요')
    .required('이메일을 입력해주세요'),
  password: Yup.string()
    .min(6, '비밀번호는 최소 6자 이상이어야 합니다')
    .required('비밀번호를 입력해주세요'),
});

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error, errorType } = useSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [localErrorType, setLocalErrorType] = useState(null);

  const from = location.state?.from?.pathname || '/';

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      const result = await dispatch(login(values));
      // 로그인 성공 시에만 리다이렉션
      if (result.meta.requestStatus === 'fulfilled') {
        setLocalError(null);
        setLocalErrorType(null);
        navigate(from, { replace: true });
      } else {
        // 실패 시 로컬 상태에 에러 저장
        if (result.payload) {
          setLocalError(result.payload.message || result.payload);
          setLocalErrorType(result.payload.type || 'UNKNOWN_ERROR');
        }
      }
    },
  });

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
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
      console.log('로그인 에러 발생, 페이지 유지:', localError || error);
    }
  }, [localError, error]);

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
          maxWidth: 400,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom align="center">
          로그인
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          안녕하세요. 오늘도 행복하세요.
        </Typography>

        {(localError || error) && (
          <Alert 
            severity={(localErrorType || errorType) === 'EMAIL_NOT_FOUND' ? 'info' : 'error'} 
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
              borderColor: (localErrorType || errorType) === 'EMAIL_NOT_FOUND' ? 'info.main' : 'error.main',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {(localErrorType || errorType) === 'EMAIL_NOT_FOUND' && '계정을 찾을 수 없습니다'}
                {(localErrorType || errorType) === 'INVALID_PASSWORD' && '비밀번호 오류'}
                {(localErrorType || errorType) === 'ACCOUNT_INACTIVE' && '계정 비활성화'}
                {(localErrorType || errorType) === 'UNKNOWN_ERROR' && '로그인 오류'}
              </Typography>
              <Typography variant="body2">
                {localError || error}
              </Typography>
              {(localErrorType || errorType) === 'EMAIL_NOT_FOUND' && (
                <Typography variant="body2" sx={{ mt: 1, color: 'primary.main' }}>
                  <Link to="/register" style={{ textDecoration: 'none', color: 'inherit' }}>
                    회원가입하러 가기 →
                  </Link>
                </Typography>
              )}
            </Box>
          </Alert>
        )}

        <form onSubmit={formik.handleSubmit}>
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

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 3, mb: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : '로그인'}
          </Button>
        </form>

        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" color="text.secondary">
            또는
          </Typography>
        </Divider>

        <KakaoLogin />

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            계정이 없으신가요?{' '}
            <Link to="/register" style={{ textDecoration: 'none', color: 'primary.main' }}>
              회원가입
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login; 