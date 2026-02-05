import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Divider,
  Paper
} from '@mui/material';
import { useMeta } from '../../hooks/useMeta';

const MetaInfo = ({ 
  showStore = true, 
  showUser = true, 
  showSystem = true,
  compact = false 
}) => {
  const { currentStore, user, system } = useMeta();

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {showStore && currentStore && (
          <Chip 
            label={`점포: ${currentStore.name}`} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        )}
        {showUser && user && (
          <Chip 
            label={`사용자: ${user.name || user.username}`} 
            size="small" 
            color="secondary" 
            variant="outlined"
          />
        )}
        {showSystem && (
          <Chip 
            label={`${system.currentYear}년 ${system.currentMonth}월`} 
            size="small" 
            color="default" 
            variant="outlined"
          />
        )}
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        메타 정보
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {showStore && currentStore && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              현재 점포
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {currentStore.name}
            </Typography>
            {currentStore.address && (
              <Typography variant="body2" color="text.secondary">
                {currentStore.address}
              </Typography>
            )}
          </Box>
        )}
        
        {showUser && user && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              사용자
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {user.name || user.username}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.role === 'owner' ? '점주' : '직원'}
            </Typography>
          </Box>
        )}
        
        {showSystem && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              시스템 정보
            </Typography>
            <Typography variant="body1">
              {system.currentYear}년 {system.currentMonth}월
            </Typography>
            <Typography variant="body2" color="text.secondary">
              버전: {system.appVersion}
            </Typography>
            {system.lastSync && (
              <Typography variant="body2" color="text.secondary">
                마지막 동기화: {new Date(system.lastSync).toLocaleString('ko-KR')}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default MetaInfo; 