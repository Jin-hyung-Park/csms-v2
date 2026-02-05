import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  People,
  PersonAdd,
  Schedule,
  TrendingUp,
  Work,
  Notifications,
  AccountBalance
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getOwnerDashboard } from '../../store/slices/ownerSlice';
import { getPendingSchedules } from '../../store/slices/workScheduleSlice';
import { MetaInfo, StoreSelector } from '../../components/common';
import { useStoreSelection } from '../../hooks/useMeta';

/**
 * 대시보드 메트릭 카드 컴포넌트
 */
const MetricCard = ({ title, value, icon: Icon, color = 'primary' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h4" component="div" color={color}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Icon color={color} sx={{ fontSize: 40 }} />
      </Box>
    </CardContent>
  </Card>
);

/**
 * 최근 활동 아이템 컴포넌트
 */
const ActivityItem = ({ activity }) => (
  <ListItem>
    <ListItemText
      primary={activity.title}
      secondary={
        <Box component="span">
          <Box component="span" display="block" color="text.secondary" fontSize="0.875rem">
            {activity.description}
          </Box>
          <Box component="span" display="block" color="text.secondary" fontSize="0.75rem">
            {format(new Date(activity.timestamp), 'MM월 dd일 HH:mm', { locale: ko })}
          </Box>
        </Box>
      }
    />
  </ListItem>
);

/**
 * 승인 요청 리스트 컴포넌트
 */
const ApprovalRequestList = ({ schedules }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'modified': return 'info';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved': return '승인됨';
      case 'pending': return '승인 대기';
      case 'rejected': return '거절됨';
      case 'modified': return '수정됨';
      default: return '알 수 없음';
    }
  };

  if (!schedules || schedules.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={3}>
            <Work sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              승인 대기 중인 근무 일정이 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary">
              직원들이 근무 시간을 입력하면 여기에 표시됩니다
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">승인 요청 리스트</Typography>
          <Chip 
            icon={<Notifications />} 
            label={`${schedules.length}건 대기`} 
            color="warning" 
            size="small" 
          />
        </Box>
        <List>
          {schedules.slice(0, 5).map((schedule) => (
            <ListItem key={schedule._id} divider>
              <ListItemText
                primary={`${schedule.userId?.username || '알 수 없음'}의 근무 시간`}
                secondary={`${format(new Date(schedule.workDate), 'MM월 dd일', { locale: ko })} ${schedule.startTime}-${schedule.endTime} (${schedule.totalHours}시간)`}
              />
              <ListItemSecondaryAction>
                <Chip 
                  label={getStatusLabel(schedule.status)} 
                  color={getStatusColor(schedule.status)} 
                  size="small" 
                />
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

/**
 * 메인 대시보드 컴포넌트
 */
const Dashboard = () => {
  const dispatch = useDispatch();
  
  // Redux 상태
  const { dashboardData, loading, error } = useSelector((state) => state.owner);
  const { pendingSchedules } = useSelector((state) => state.workSchedule);
  
  // 점포 선택 훅
  const { selectedStoreId, stores } = useStoreSelection();

  // 대시보드 데이터 로드
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // 점포가 선택되지 않았어도 전체 데이터를 로드
        await dispatch(getOwnerDashboard({ storeId: selectedStoreId })).unwrap();
        await dispatch(getPendingSchedules({ storeId: selectedStoreId })).unwrap();
      } catch (error) {
        console.error('대시보드 데이터 로드 실패:', error);
      }
    };

    // 컴포넌트 마운트 시 항상 데이터 로드
    loadDashboardData();
  }, [dispatch, selectedStoreId]);

  // 메트릭 데이터 계산
  const metrics = useMemo(() => {
    if (!dashboardData) {
      return {
        totalEmployees: 0,
        newEmployeesThisMonth: 0,
        pendingApprovals: pendingSchedules?.length || 0,
        totalWorkHours: 0
      };
    }

    return {
      totalEmployees: dashboardData.totalEmployees || 0,
      newEmployeesThisMonth: dashboardData.newEmployeesThisMonth || 0,
      pendingApprovals: pendingSchedules?.length || 0,
      totalWorkHours: dashboardData.totalWorkHours || 0
    };
  }, [dashboardData, pendingSchedules]);

  // 로딩 상태
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom component="div">
        점주 대시보드
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <StoreSelector 
          label="점포 선택" 
          showCurrentStore={true}
          onChange={(storeId) => {
            // 점포 변경 시 대시보드 데이터 다시 로드
            dispatch(getOwnerDashboard({ storeId }));
            dispatch(getPendingSchedules({ storeId }));
          }}
        />
      </Box>
      
      <MetaInfo compact={true} />

      {/* 점포 선택 안내 */}
      {stores.length > 0 && !selectedStoreId && (
        <Alert severity="info" sx={{ mb: 3 }}>
          전체 점포의 데이터가 표시됩니다. 특정 점포의 데이터를 보려면 위의 점포 선택기를 사용하세요.
        </Alert>
      )}

      {/* 점포가 없는 경우 안내 */}
      {stores.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          등록된 점포가 없습니다. 점포를 먼저 등록해주세요.
        </Alert>
      )}

      {/* 에러 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 메트릭 카드들 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="총 근로자 수"
            value={metrics.totalEmployees}
            icon={People}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="이번달 신규 입사자"
            value={metrics.newEmployeesThisMonth}
            icon={PersonAdd}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="승인 대기 건수"
            value={metrics.pendingApprovals}
            icon={Schedule}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="이번달 총 근무시간"
            value={`${metrics.totalWorkHours}시간`}
            icon={TrendingUp}
            color="info"
          />
        </Grid>
      </Grid>

      {/* 비용 관리 섹션 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AccountBalance sx={{ color: 'error.main', mr: 1 }} />
                <Typography variant="h6">비용관리</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                수익률 관리
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <ApprovalRequestList schedules={pendingSchedules} />
        </Grid>
      </Grid>

      {/* 최근 활동 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            최근 활동
          </Typography>
          {dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
            <List>
              {dashboardData.recentActivities.map((activity, index) => (
                <ActivityItem key={index} activity={activity} />
              ))}
            </List>
          ) : (
            <Box textAlign="center" py={3}>
              <Typography variant="body2" color="text.secondary">
                활동 내역이 없습니다
              </Typography>
              <Typography variant="caption" color="text.secondary">
                최근 활동 내역이 여기에 표시됩니다
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard; 