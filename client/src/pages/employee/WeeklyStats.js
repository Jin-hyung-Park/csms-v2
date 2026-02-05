import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack
} from '@mui/material';
import {
  Schedule,
  AttachMoney,
  TrendingUp,
  Work
} from '@mui/icons-material';
import employeeService from '../../services/employeeService';
import { useIsMobile } from '../../hooks/useMediaQuery';

const WeeklyStats = () => {
  const isMobile = useIsMobile();
  const { user } = useSelector((state) => state.auth);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // 입사일부터 현재월까지의 월 목록 생성
  const getAvailableMonths = () => {
    const months = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // 입사일이 있으면 입사월부터, 없으면 1월부터
    const hireDate = user?.hireDate ? new Date(user.hireDate) : new Date(currentYear, 0, 1);
    const hireYear = hireDate.getFullYear();
    const hireMonth = hireDate.getMonth() + 1;
    
    for (let year = hireYear; year <= currentYear; year++) {
      const startMonth = year === hireYear ? hireMonth : 1;
      const endMonth = year === currentYear ? currentMonth : 12;
      
      for (let month = startMonth; month <= endMonth; month++) {
        const value = `${year}-${String(month).padStart(2, '0')}`;
        const label = `${year}년 ${month}월`;
        months.push({ value, label });
      }
    }
    
    return months.reverse(); // 최신월부터 정렬
  };

  const fetchWeeklyStats = async () => {
    setLoading(true);
    setError(null);
    try {
      // 기존 API와 새로운 주휴수당 API 모두 호출
      const [weeklyData, holidayPayData] = await Promise.all([
        employeeService.getWeeklyStats({ month: selectedMonth }),
        employeeService.getHolidayPay({ 
          year: selectedMonth.split('-')[0], 
          month: selectedMonth.split('-')[1] 
        }).catch(() => null) // 주휴수당 데이터가 없어도 계속 진행
      ]);
      
      // 주휴수당 데이터가 있으면 통합
      if (holidayPayData) {
        const integratedData = { ...weeklyData };
        
        // 주차별 데이터에 주휴수당 정보 추가
        Object.keys(integratedData).forEach(weekKey => {
          if (holidayPayData.weeklyStats[weekKey]) {
            integratedData[weekKey] = {
              ...integratedData[weekKey],
              ...holidayPayData.weeklyStats[weekKey]
            };
          }
        });
        
        // 월별 총계에 주휴수당 정보 추가
        if (holidayPayData.monthlyTotal) {
          integratedData.monthlyTotal = {
            ...integratedData.monthlyTotal,
            ...holidayPayData.monthlyTotal
          };
        }
        
        setWeeklyStats(integratedData);
      } else {
        setWeeklyStats(weeklyData);
      }
    } catch (err) {
      console.error('Weekly stats fetch error:', err);
      setError(err.response?.data?.message || '주차별 통계를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyStats();
  }, [selectedMonth]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatHours = (hours) => {
    return `${hours.toFixed(1)}시간`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // 모바일용 간소화된 날짜 형식
  const formatDateMobile = (dateString) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  // 모바일용 간소화된 시간 형식
  const formatHoursMobile = (hours) => {
    return `${hours.toFixed(1)}H`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box 
        display="flex" 
        flexDirection={isMobile ? 'column' : 'row'}
        justifyContent="space-between" 
        alignItems={isMobile ? 'flex-start' : 'center'} 
        mb={3}
        gap={isMobile ? 2 : 0}
      >
        <Box>
          <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom>
            주차별 근로 정보
          </Typography>
          <Typography variant={isMobile ? 'body2' : 'body1'} color="text.secondary">
            주차별 근무시간과 급여를 확인하세요.
          </Typography>
        </Box>
        <FormControl sx={{ minWidth: isMobile ? '100%' : 120 }}>
          <InputLabel>월 선택</InputLabel>
          <Select
            value={selectedMonth}
            label="월 선택"
            onChange={(e) => setSelectedMonth(e.target.value)}
            size={isMobile ? 'medium' : 'medium'}
          >
            {getAvailableMonths().map(({ value, label }) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {weeklyStats && (
        <>
          {/* 월별 요약 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Work color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">총 근무시간</Typography>
                  </Box>
                  <Typography variant="h4" color="primary">
                    {formatHours(weeklyStats.monthlyTotal.totalHours)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedMonth.split('-')[1]}월
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Schedule color="secondary" sx={{ mr: 1 }} />
                    <Typography variant="h6">근무일수</Typography>
                  </Box>
                  <Typography variant="h4" color="secondary">
                    {weeklyStats.monthlyTotal.workDays}일
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    모든 입력된 일정 기준
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <AttachMoney color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">총 급여</Typography>
                  </Box>
                  <Typography variant="h4" color="success.main">
                    {formatCurrency(weeklyStats.monthlyTotal.totalPay)}원
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    기본급
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <TrendingUp color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6">총 지급액</Typography>
                  </Box>
                  <Typography variant="h4" color="warning.main">
                    {formatCurrency(weeklyStats.monthlyTotal.totalGrossPay)}원
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 급여
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 세금 정보 표시 */}
          {weeklyStats.monthlyTotal.taxInfo && weeklyStats.monthlyTotal.taxInfo.taxAmount > 0 && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card sx={{ border: '1px solid', borderColor: 'error.main' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Typography variant="h6" color="error.main">세금 정보</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      세금 유형: {weeklyStats.monthlyTotal.taxInfo.taxType}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      세율: {(weeklyStats.monthlyTotal.taxInfo.taxRate * 100).toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ border: '1px solid', borderColor: 'error.main' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Typography variant="h6" color="error.main">세금</Typography>
                    </Box>
                    <Typography variant="h4" color="error.main">
                      {formatCurrency(weeklyStats.monthlyTotal.taxInfo.taxAmount)}원
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      공제될 세금
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ border: '1px solid', borderColor: 'success.main' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Typography variant="h6" color="success.main">실수령액</Typography>
                    </Box>
                    <Typography variant="h4" color="success.main">
                      {formatCurrency(weeklyStats.monthlyTotal.taxInfo.netPay)}원
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      세금 공제 후 실수령액
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* 주차별 상세 정보 */}
          <Paper sx={{ p: isMobile ? 2 : 3 }}>
            <Typography variant={isMobile ? 'h6' : 'h6'} sx={{ mb: 3, fontSize: isMobile ? '1.1rem' : '1.25rem' }}>
              주차별 상세 정보 - {selectedMonth.split('-')[1]}월
            </Typography>

            {Object.keys(weeklyStats.weeklyStats).length === 0 ? (
              <Alert severity="info">
                해당 월에 입력된 근무 기록이 없습니다.
              </Alert>
            ) : isMobile ? (
              // 모바일 카드 뷰
              <Stack spacing={2}>
                {Object.keys(weeklyStats.weeklyStats)
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map((weekKey) => {
                    const weekData = weeklyStats.weeklyStats[weekKey];
                    const startDate = formatDateMobile(weekData.startDate);
                    const endDate = formatDateMobile(weekData.endDate);
                    
                    return (
                      <Card key={weekKey} variant="outlined">
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" fontWeight="bold" color="primary">
                              {weekData.weekNumber}주차
                            </Typography>
                            <Chip 
                              label={`${startDate}-${endDate}`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                          
                          <Divider sx={{ mb: 2 }} />
                          
                          <Grid container spacing={1.5}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">근무시간</Typography>
                              <Typography variant="body1" fontWeight="bold">
                                {formatHoursMobile(weekData.totalHours)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">근무일수</Typography>
                              <Typography variant="body1" fontWeight="bold">
                                {weekData.workDays}일
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">시급</Typography>
                              <Typography variant="body1">
                                {formatCurrency(user?.hourlyWage || 0)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">기본급</Typography>
                              <Typography variant="body1">
                                {formatCurrency(weekData.totalPay)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">주휴수당</Typography>
                              <Typography 
                                variant="body1" 
                                color={weekData.holidayPayStatus === 'adjusted' ? 'warning.main' : 'primary'}
                                fontWeight="bold"
                              >
                                {formatCurrency(weekData.holidayPay || 0)}
                              </Typography>
                              {weekData.holidayPayStatus === 'adjusted' && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  (수정됨)
                                </Typography>
                              )}
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">주 총액</Typography>
                              <Typography variant="body1" color="primary" fontWeight="bold">
                                {formatCurrency(weekData.weeklyTotal)}
                              </Typography>
                            </Grid>
                            {user?.taxType === '사업자소득(3.3%)' && weekData.taxInfo && (
                              <>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">세금</Typography>
                                  <Typography variant="body1" color="error.main">
                                    {formatCurrency(weekData.taxInfo.taxAmount)}
                                  </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">실수령액</Typography>
                                  <Typography variant="body1" color="success.main" fontWeight="bold">
                                    {formatCurrency(weekData.taxInfo.netPay)}
                                  </Typography>
                                </Grid>
                              </>
                            )}
                          </Grid>
                        </CardContent>
                      </Card>
                    );
                  })}
                
                {/* 월별 합계 카드 */}
                <Card sx={{ backgroundColor: 'grey.50', border: 2, borderColor: 'primary.main' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                      월별 합계
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">총 근무시간</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {formatHoursMobile(weeklyStats.monthlyTotal.totalHours)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">총 근무일수</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {weeklyStats.monthlyTotal.workDays}일
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">시급</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {formatCurrency(user?.hourlyWage || 0)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">총 기본급</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {formatCurrency(weeklyStats.monthlyTotal.totalPay)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">총 주휴수당</Typography>
                        <Typography variant="body1" fontWeight="bold" color="primary">
                          {formatCurrency(weeklyStats.monthlyTotal.totalHolidayPay || 0)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">월 총액</Typography>
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {formatCurrency(weeklyStats.monthlyTotal.totalGrossPay)}
                        </Typography>
                      </Grid>
                      {user?.taxType === '사업자소득(3.3%)' && weeklyStats.monthlyTotal.taxInfo && (
                        <>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">총 세금</Typography>
                            <Typography variant="body1" color="error.main" fontWeight="bold">
                              {formatCurrency(weeklyStats.monthlyTotal.taxInfo.taxAmount)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">총 실수령액</Typography>
                            <Typography variant="h6" color="success.main" fontWeight="bold">
                              {formatCurrency(weeklyStats.monthlyTotal.taxInfo.netPay)}
                            </Typography>
                          </Grid>
                        </>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Stack>
            ) : (
              // 데스크톱 테이블 뷰
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>주차</TableCell>
                      <TableCell align="center">기간</TableCell>
                      <TableCell align="right">근무시간</TableCell>
                      <TableCell align="right">근무일수</TableCell>
                      <TableCell align="right">시급</TableCell>
                      <TableCell align="right">기본급</TableCell>
                      <TableCell align="right">주휴수당</TableCell>
                      <TableCell align="right">주 총액</TableCell>
                      {user?.taxType === '사업자소득(3.3%)' && (
                        <>
                          <TableCell align="right">세금</TableCell>
                          <TableCell align="right">실수령액</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.keys(weeklyStats.weeklyStats)
                      .sort((a, b) => parseInt(a) - parseInt(b))
                      .map((weekKey) => {
                        const weekData = weeklyStats.weeklyStats[weekKey];
                        const startDate = formatDateMobile(weekData.startDate);
                        const endDate = formatDateMobile(weekData.endDate);
                        
                        return (
                          <TableRow key={weekKey}>
                            <TableCell>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {weekData.weekNumber}주차
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {startDate}-{endDate}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold">
                                {formatHoursMobile(weekData.totalHours)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {weekData.workDays}일
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {formatCurrency(user?.hourlyWage || 0)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {formatCurrency(weekData.totalPay)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography 
                                variant="body2" 
                                fontWeight="bold" 
                                color={weekData.holidayPayStatus === 'adjusted' ? 'warning.main' : 'primary'}
                              >
                                {formatCurrency(weekData.holidayPay || 0)}
                              </Typography>
                              {weekData.holidayPayStatus === 'adjusted' && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  (수정됨)
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold" color="primary">
                                {formatCurrency(weekData.weeklyTotal)}
                              </Typography>
                            </TableCell>
                            {user?.taxType === '사업자소득(3.3%)' && weekData.taxInfo && (
                              <>
                                <TableCell align="right">
                                  <Typography variant="body2" color="error.main">
                                    {formatCurrency(weekData.taxInfo.taxAmount)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight="bold" color="success.main">
                                    {formatCurrency(weekData.taxInfo.netPay)}
                                  </Typography>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      })}
                    
                    {/* 월별 합계 행 */}
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell colSpan={2}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          월별 합계
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" fontWeight="bold">
                          {formatHours(weeklyStats.monthlyTotal.totalHours)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" fontWeight="bold">
                          {weeklyStats.monthlyTotal.workDays}일
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" fontWeight="bold">
                          {formatCurrency(user?.hourlyWage || 0)}원
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" fontWeight="bold">
                          {formatCurrency(weeklyStats.monthlyTotal.totalPay)}원
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" fontWeight="bold" color="primary">
                          {formatCurrency(weeklyStats.monthlyTotal.totalHolidayPay || 0)}원
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" fontWeight="bold" color="primary">
                          {formatCurrency(weeklyStats.monthlyTotal.totalGrossPay)}원
                        </Typography>
                      </TableCell>
                      {user?.taxType === '사업자소득(3.3%)' && weeklyStats.monthlyTotal.taxInfo && (
                        <>
                          <TableCell align="right">
                            <Typography variant="subtitle2" fontWeight="bold" color="error.main">
                              {formatCurrency(weeklyStats.monthlyTotal.taxInfo.taxAmount)}원
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2" fontWeight="bold" color="success.main">
                              {formatCurrency(weeklyStats.monthlyTotal.taxInfo.netPay)}원
                            </Typography>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>


          {/* 세금 안내 */}
          {user?.taxType === '사업자소득(3.3%)' && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                세금 안내
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                • 세금 유형: {user.taxType}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                • 세율: 3.3% (사업자 소득세)
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                • 세금 = 총 급여 × 3.3%
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                • 실수령액 = 총 급여 - 세금
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • 위 세금 정보는 예상 금액이며, 실제 세금은 다를 수 있습니다.
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default WeeklyStats; 