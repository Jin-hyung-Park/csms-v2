import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Work,
  Schedule,
  AttachMoney,
  TrendingUp,
  Notifications,
} from '@mui/icons-material';

import { getEmployeeDashboard } from '../../store/slices/employeeSlice';
import { useIsMobile } from '../../hooks/useMediaQuery';

const Dashboard = () => {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();
  const { dashboard, loading, error } = useSelector((state) => state.employee);
  const { user } = useSelector((state) => state.auth);
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

  useEffect(() => {
    dispatch(getEmployeeDashboard({ month: selectedMonth }));
  }, [dispatch, selectedMonth]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
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
            안녕하세요, {user?.username}님!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            오늘도 열심히 일하세요.
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

      {dashboard && (
        <Grid container spacing={3}>
          {/* 월간 통계 */}
          <Grid item xs={12} sm={6} md={6} lg={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={isMobile ? 1 : 2}>
                  <Work color="primary" sx={{ mr: 1, fontSize: isMobile ? 20 : 24 }} />
                  <Typography variant={isMobile ? 'subtitle1' : 'h6'}>총 근무 시간</Typography>
                </Box>
                <Typography variant={isMobile ? 'h5' : 'h4'} color="primary">
                  {dashboard.monthlyStats?.totalHours || 0}시간
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedMonth.split('-')[1]}월
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={6} lg={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={isMobile ? 1 : 2}>
                  <Schedule color="secondary" sx={{ mr: 1, fontSize: isMobile ? 20 : 24 }} />
                  <Typography variant={isMobile ? 'subtitle1' : 'h6'}>근무 일수</Typography>
                </Box>
                <Typography variant={isMobile ? 'h5' : 'h4'} color="secondary">
                  {dashboard.monthlyStats?.totalDays || 0}일
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedMonth.split('-')[1]}월 (승인)
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={6} lg={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={isMobile ? 1 : 2}>
                  <AttachMoney color="success" sx={{ mr: 1, fontSize: isMobile ? 20 : 24 }} />
                  <Typography variant={isMobile ? 'subtitle1' : 'h6'}>예상 급여</Typography>
                </Box>
                <Typography variant={isMobile ? 'h5' : 'h4'} color="success.main">
                  {dashboard.monthlyStats?.estimatedPay?.toLocaleString() || 0}원
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedMonth.split('-')[1]}월
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={6} lg={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={isMobile ? 1 : 2}>
                  <Notifications color="warning" sx={{ mr: 1, fontSize: isMobile ? 20 : 24 }} />
                  <Typography variant={isMobile ? 'subtitle1' : 'h6'}>공지사항</Typography>
                </Box>
                <Typography variant={isMobile ? 'h5' : 'h4'} color="warning.main">
                  {dashboard.unreadCount || 0}개
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  새로운 공지
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* 최근 근무 기록 */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} gutterBottom>
                  최근 근무 기록
                </Typography>
                {dashboard.recentSchedules && dashboard.recentSchedules.length > 0 ? (
                  <Box>
                    {dashboard.recentSchedules.map((schedule) => (
                      <Card
                        key={schedule._id}
                        variant="outlined"
                        sx={{
                          mb: 1.5,
                          p: isMobile ? 1.5 : 2,
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Typography variant={isMobile ? 'body2' : 'subtitle1'} fontWeight="bold">
                            {new Date(schedule.workDate).toLocaleDateString('ko-KR', { 
                              month: 'short', 
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </Typography>
                          <Chip
                            label={schedule.status === 'approved' ? '승인' : 
                                   schedule.status === 'pending' ? '대기' : 
                                   schedule.status === 'rejected' ? '거절' : '수정'}
                            color={schedule.status === 'approved' ? 'success' : 
                                   schedule.status === 'pending' ? 'warning' : 
                                   schedule.status === 'rejected' ? 'error' : 'info'}
                            size="small"
                          />
                        </Box>
                        <Typography variant={isMobile ? 'caption' : 'body2'} color="text.secondary">
                          {schedule.startTime} - {schedule.endTime} · {schedule.totalHours || 0}시간
                          {schedule.endDate && new Date(schedule.workDate).getTime() !== new Date(schedule.endDate).getTime() && (
                            <span> · 야간</span>
                          )}
                        </Typography>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    최근 근무 기록이 없습니다.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* 요약 정보 */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} gutterBottom>
                  요약 정보
                </Typography>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">시급:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {user?.hourlyWage?.toLocaleString()}원
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">초과 근무:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {dashboard.monthlyStats?.totalOvertime || 0}시간
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">휴식 시간:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {dashboard.monthlyStats?.totalBreakTime || 0}시간
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">평균 근무시간:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {dashboard.monthlyStats?.totalDays > 0 
                        ? Math.round((dashboard.monthlyStats.totalHours / dashboard.monthlyStats.totalDays) * 100) / 100 
                        : 0}시간/일
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    승인 상태별
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">승인됨:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      {dashboard.monthlyStats?.statusStats?.approved || 0}일
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">대기중:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="warning.main">
                      {dashboard.monthlyStats?.statusStats?.pending || 0}일
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">거절됨:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="error.main">
                      {dashboard.monthlyStats?.statusStats?.rejected || 0}일
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard; 