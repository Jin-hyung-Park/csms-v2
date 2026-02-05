import React from 'react';
import {
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import { FilterList } from '@mui/icons-material';

/**
 * 필터링 섹션 컴포넌트
 * @param {Object} props - 컴포넌트 props
 * @param {Array} props.filters - 필터 배열
 * @param {string} props.title - 제목 (기본값: '필터')
 * @param {Object} props.sx - 추가 스타일
 * @returns {JSX.Element} 필터링 섹션 컴포넌트
 */
const FilterSection = ({ 
  filters, 
  title = '필터',
  sx = {}
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3, ...sx }}>
      <Typography 
        variant="h6" 
        gutterBottom 
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <FilterList />
        {title}
      </Typography>
      
      <Grid container spacing={2}>
        {filters.map((filter, index) => (
          <Grid item xs={12} md={4} key={index}>
            <FormControl fullWidth>
              <InputLabel>{filter.label}</InputLabel>
              <Select
                value={filter.value}
                onChange={filter.onChange}
                label={filter.label}
              >
                {filter.options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default FilterSection; 