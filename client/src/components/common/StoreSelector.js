import React, { useEffect, useCallback } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Skeleton
} from '@mui/material';
import { useStoreSelection } from '../../hooks/useMeta';
import { logger } from '../../utils/logger';

const StoreSelector = ({ 
  label = "점포 선택", 
  showCurrentStore = true, 
  disabled = false,
  onChange,
  size = "medium"
}) => {
  const { 
    stores, 
    selectedStoreId, 
    currentStore, 
    loading, 
    setSelectedStore, 
    fetchStores 
  } = useStoreSelection();

  useEffect(() => {
    // 점포관리에서 등록된 점포 정보를 가져옴
    fetchStores();
  }, [fetchStores]);

  const handleStoreChange = useCallback((event) => {
    const storeId = event.target.value;
    logger.debug('StoreSelector - 선택된 점포 ID:', storeId);
    setSelectedStore(storeId);
    if (onChange) {
      onChange(storeId);
    }
  }, [setSelectedStore, onChange]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Skeleton variant="rectangular" width={200} height={40} />
        {showCurrentStore && <Skeleton variant="text" width={150} />}
      </Box>
    );
  }

  if (stores.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size={size} disabled>
          <InputLabel>{label}</InputLabel>
          <Select
            value=""
            label={label}
            sx={{ minWidth: 200 }}
          >
            <MenuItem disabled>점포관리에서 등록된 점포가 없습니다</MenuItem>
          </Select>
        </FormControl>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <FormControl size={size} disabled={disabled}>
        <InputLabel>{label}</InputLabel>
        <Select
          value={selectedStoreId || ''}
          label={label}
          onChange={handleStoreChange}
          sx={{ minWidth: 200 }}
        >
          {stores.map(store => (
            <MenuItem key={store._id} value={store._id}>
              {store.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {showCurrentStore && currentStore && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            현재:
          </Typography>
          <Chip 
            label={currentStore.name} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </Box>
      )}
    </Box>
  );
};

export default StoreSelector; 