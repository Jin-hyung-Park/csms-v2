import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Box, Typography } from '@mui/material';
import { kakaoLogin } from '../../store/slices/authSlice';

const KakaoLogin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleKakaoLogin = () => {
    // 카카오 로그인 기능이 현재 비활성화되어 있습니다.
    alert('카카오 로그인 기능이 현재 비활성화되어 있습니다. 이메일/비밀번호로 로그인해주세요.');
  };

  return (
    <Button
      fullWidth
      variant="contained"
      onClick={handleKakaoLogin}
      disabled={true} // 비활성화
      sx={{
        backgroundColor: '#FEE500',
        color: '#000000',
        opacity: 0.5, // 비활성화 상태 표시
        '&:hover': {
          backgroundColor: '#FEE500',
        },
        '&:disabled': {
          backgroundColor: '#FEE500',
          color: '#666666',
        },
        mb: 2,
        py: 1.5,
        fontWeight: 'bold'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
          카카오톡으로 시작하기 (비활성화)
        </Typography>
      </Box>
    </Button>
  );
};

export default KakaoLogin; 