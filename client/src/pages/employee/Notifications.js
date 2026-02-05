import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
  Card,
  CardContent,
  Grid,
  Button
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Work,
  CheckCircle,
  Cancel,
  Edit,
  Schedule,
  AttachMoney,
  LocationOn,
  AccessTime
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getNotifications, markAsRead } from '../../store/slices/notificationSlice';
import { useIsMobile } from '../../hooks/useMediaQuery';

const Notifications = () => {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();
  const { notifications, loading, error } = useSelector((state) => state.notification);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getNotifications());
  }, [dispatch]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await dispatch(markAsRead(notificationId)).unwrap();
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'work_approval':
        return <CheckCircle color="success" />;
      case 'work_rejection':
        return <Cancel color="error" />;
      case 'work_modification':
        return <Edit color="warning" />;
      case 'work_approval_request':
        return <Schedule color="info" />;
      default:
        return <NotificationsIcon color="action" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'work_approval':
        return 'success';
      case 'work_rejection':
        return 'error';
      case 'work_modification':
        return 'warning';
      case 'work_approval_request':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDate = (date) => {
    return format(new Date(date), 'yyyy년 MM월 dd일 HH:mm', { locale: ko });
  };

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

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="div">
          알림
        </Typography>
        <Chip 
          label={`총 ${notifications.length}개`} 
          color="primary" 
          variant="outlined" 
        />
      </Box>

      {/* 읽지 않은 알림 */}
      {unreadNotifications.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary" component="div">
              읽지 않은 알림 ({unreadNotifications.length}개)
            </Typography>
            <List>
              {unreadNotifications.map((notification, index) => (
                <React.Fragment key={notification._id}>
                  <ListItem
                    sx={{
                      backgroundColor: 'action.hover',
                      borderRadius: 1,
                      mb: 1
                    }}
                  >
                    <ListItemIcon>
                      {getNotificationIcon(notification.type)}
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      primary={
                        <>
                          <Typography variant="subtitle1" fontWeight="bold" component="span">
                            {notification.title}
                          </Typography>
                          <Chip
                            label={notification.priority === 'high' ? '중요' : '일반'}
                            size="small"
                            color={notification.priority === 'high' ? 'error' : 'default'}
                          />
                        </>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} component="span">
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" component="span">
                            {formatDate(notification.createdAt)}
                          </Typography>
                        </>
                      }
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleMarkAsRead(notification._id)}
                      title="읽음 처리"
                    >
                      <CheckCircle color="action" />
                    </IconButton>
                  </ListItem>
                  {index < unreadNotifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* 읽은 알림 */}
      {readNotifications.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="text.secondary" component="div">
              읽은 알림 ({readNotifications.length}개)
            </Typography>
            <List>
              {readNotifications.map((notification, index) => (
                <React.Fragment key={notification._id}>
                  <ListItem>
                    <ListItemIcon>
                      {getNotificationIcon(notification.type)}
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      primary={
                        <>
                          <Typography variant="subtitle1" component="span">
                            {notification.title}
                          </Typography>
                          <Chip
                            label="읽음"
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        </>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} component="span">
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" component="span">
                            {formatDate(notification.createdAt)}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  {index < readNotifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* 알림이 없는 경우 */}
      {notifications.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom component="div">
            알림이 없습니다
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            새로운 알림이 오면 여기에 표시됩니다.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Notifications; 