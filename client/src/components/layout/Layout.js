import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Notifications,
  People,
  AccountCircle,
  Logout,
  Work,
  CheckCircle,
  BarChart,
  Settings,
  TrendingUp,
  AccountBalance,
  Store,
} from '@mui/icons-material';

import { logout } from '../../store/slices/authSlice';
import { useMeta } from '../../hooks/useMeta';

const drawerWidth = 240;

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { unreadCount } = useSelector((state) => state.notification);
  const { currentStore } = useMeta();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const isOwner = user?.role === 'owner';

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const menuItems = isOwner
    ? [
        {
          text: '대시보드',
          icon: <Dashboard />,
          path: '/owner/dashboard',
        },
        {
          text: '근로자 관리',
          icon: <People />,
          path: '/owner/employees',
        },
        {
          text: '근로시간 관리',
          icon: <CheckCircle />,
          path: '/owner/work-schedule',
        },
        {
          text: '통계',
          icon: <BarChart />,
          path: '/owner/statistics',
        },
        {
          text: '점포 관리',
          icon: <Store />,
          path: '/owner/store-management',
        },
        {
          text: '비용 관리',
          icon: <AccountBalance />,
          path: '/owner/expense-management',
        },
      ]
    : [
        {
          text: '대시보드',
          icon: <Dashboard />,
          path: '/employee/dashboard',
        },
        {
          text: '근무 시간 입력',
          icon: <Work />,
          path: '/employee/work-schedule',
        },
        {
          text: '주차별 근로 정보',
          icon: <TrendingUp />,
          path: '/employee/weekly-stats',
        },
        {
          text: '알림',
          icon: <Notifications />,
          path: '/employee/notifications',
        },
        {
          text: '프로필',
          icon: <Settings />,
          path: '/employee/profile',
        },
      ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          {user?.workLocation || 'CSMS'}
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ component: 'div' }}
              />
              {item.text === '알림' && unreadCount > 0 && (
                <Badge badgeContent={unreadCount} color="error" />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" noWrap component="div">
              {menuItems.find(item => item.path === location.pathname)?.text || 'CSMS'}
            </Typography>
            {currentStore && (
              <Typography 
                variant="body2" 
                sx={{ 
                  opacity: 0.8,
                  display: { xs: 'none', md: 'block' },
                  color: 'inherit'
                }}
              >
                | {currentStore.name}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography 
              variant="body2" 
              color="inherit" 
              sx={{ 
                opacity: 0.9,
                display: { xs: 'none', sm: 'block' } // 모바일에서는 숨김
              }}
            >
              {user?.username}님
            </Typography>
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="primary-search-account-menu"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="profile" />
                ) : (
                  <AccountCircle />
                )}
              </Avatar>
            </IconButton>
          </Box>
          <Menu
            id="primary-search-account-menu"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
            <MenuItem onClick={handleProfileMenuClose}>
              <Typography variant="body2" component="div">
                {user?.username} ({user?.role === 'owner' ? '점주' : '근로자'})
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => {
              handleProfileMenuClose();
              navigate('/employee/profile');
            }}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              프로필 수정
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              로그아웃
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout; 