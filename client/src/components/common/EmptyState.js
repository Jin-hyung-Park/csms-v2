import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

/**
 * 빈 상태 컴포넌트
 * @param {Object} props - 컴포넌트 props
 * @param {string} props.title - 제목
 * @param {string} props.description - 설명
 * @param {React.ReactNode} props.icon - 아이콘 (선택사항)
 * @param {Object} props.sx - 추가 스타일
 * @returns {JSX.Element} 빈 상태 컴포넌트
 */
const EmptyState = ({ 
  title, 
  description, 
  icon = null,
  sx = {}
}) => {
  return (
    <Paper sx={{ p: 3, textAlign: 'center', ...sx }}>
      {icon && (
        <Box sx={{ mb: 2 }}>
          {icon}
        </Box>
      )}
      <Typography variant="h6" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" mt={1}>
        {description}
      </Typography>
    </Paper>
  );
};

export default EmptyState; 