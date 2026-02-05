import React from 'react';
import { Chip } from '@mui/material';
import { formatStatus } from '../../utils/formatters';
import { WORK_STATUS_COLORS } from '../../utils/constants';

/**
 * 상태 칩 컴포넌트
 * @param {Object} props - 컴포넌트 props
 * @param {string} props.status - 상태값
 * @param {Object} props.statusLabels - 상태 라벨 객체 (선택사항)
 * @param {Object} props.statusColors - 상태 색상 객체 (선택사항)
 * @param {string} props.size - 크기 (기본값: 'small')
 * @param {Object} props.sx - 추가 스타일
 * @returns {JSX.Element} 상태 칩 컴포넌트
 */
const StatusChip = ({ 
  status, 
  statusLabels, 
  statusColors = WORK_STATUS_COLORS, 
  size = 'small',
  sx = {}
}) => {
  const label = formatStatus(status, statusLabels);
  const color = statusColors[status] || 'default';

  return (
    <Chip
      label={label}
      color={color}
      size={size}
      sx={sx}
    />
  );
};

export default StatusChip; 