import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Stack,
  Chip
} from '@mui/material';
import { useIsMobile } from '../../hooks/useMediaQuery';

/**
 * 모바일에서는 카드형, 데스크톱에서는 테이블형으로 표시되는 반응형 테이블
 * 
 * @param {Array} columns - 컬럼 정의 [{ id, label, render, hideOnMobile }]
 * @param {Array} data - 표시할 데이터
 * @param {Function} onRowClick - 행 클릭 핸들러
 * @param {String} keyField - 고유 키 필드명 (기본: 'id')
 */
const ResponsiveTable = ({ 
  columns, 
  data, 
  onRowClick,
  keyField = '_id',
  emptyMessage = '데이터가 없습니다.'
}) => {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  // 모바일 카드 뷰
  if (isMobile) {
    return (
      <Stack spacing={2}>
        {data.map((row) => (
          <Card 
            key={row[keyField]} 
            sx={{ 
              cursor: onRowClick ? 'pointer' : 'default',
              '&:hover': onRowClick ? { boxShadow: 3 } : {}
            }}
            onClick={() => onRowClick && onRowClick(row)}
          >
            <CardContent>
              <Stack spacing={1.5}>
                {columns
                  .filter(col => !col.hideOnMobile)
                  .map((column) => {
                    const value = column.render 
                      ? column.render(row) 
                      : row[column.id];
                    
                    return (
                      <Box key={column.id}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ display: 'block', mb: 0.5 }}
                        >
                          {column.label}
                        </Typography>
                        <Box>
                          {typeof value === 'object' ? value : (
                            <Typography variant="body2">
                              {value}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  // 데스크톱 테이블 뷰
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.id} align={column.align || 'left'}>
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row[keyField]}
              hover={!!onRowClick}
              onClick={() => onRowClick && onRowClick(row)}
              sx={{ 
                cursor: onRowClick ? 'pointer' : 'default'
              }}
            >
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align || 'left'}>
                  {column.render ? column.render(row) : row[column.id]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ResponsiveTable;

