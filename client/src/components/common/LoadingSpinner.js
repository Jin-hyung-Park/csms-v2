import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * 로딩 스피너 컴포넌트
 * @param {Object} props - 컴포넌트 props
 * @param {string} props.message - 로딩 메시지 (기본값: '로딩 중...')
 * @param {number} props.minHeight - 최소 높이 (기본값: 400)
 * @param {boolean} props.fullScreen - 전체 화면 여부 (기본값: false)
 * @returns {JSX.Element} 로딩 스피너 컴포넌트
 */
const LoadingSpinner = ({ 
  message = '로딩 중...', 
  minHeight = 400, 
  fullScreen = false 
}) => {
  const containerStyle = fullScreen 
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 9999
      }
    : {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: `${minHeight}px`
      };

  return (
    <Box sx={containerStyle}>
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress size={40} />
        {message && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ mt: 2 }}
          >
            {message}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default LoadingSpinner; 