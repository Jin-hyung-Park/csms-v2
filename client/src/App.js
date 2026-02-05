import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box, CircularProgress } from '@mui/material';

import { getCurrentUser } from './store/slices/authSlice';
import { fetchStores, setUser } from './store/slices/metaSlice';
import PrivateRoute from './components/common/PrivateRoute';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import EmployeeDashboard from './pages/employee/Dashboard';
import WorkSchedule from './pages/employee/WorkSchedule';
import WeeklyStats from './pages/employee/WeeklyStats';
import Notifications from './pages/employee/Notifications';
import Profile from './pages/employee/Profile';
import OwnerDashboard from './pages/owner/Dashboard';
import EmployeeManagement from './pages/owner/EmployeeManagement';
import ApproveRequests from './pages/owner/ApproveRequests';
import Statistics from './pages/owner/Statistics';
import OwnerWorkSchedule from './pages/owner/WorkSchedule';
import ExpenseManagement from './pages/owner/ExpenseManagement';
import StoreManagement from './pages/owner/StoreManagement';

// 역할에 따른 리다이렉트 컴포넌트
const RoleBasedRedirect = () => {
  const { user } = useSelector((state) => state.auth);
  
  if (user?.role === 'owner') {
    return <Navigate to="/owner/dashboard" />;
  } else if (user?.role === 'employee' || user?.role === 'manager') {
    return <Navigate to="/employee/dashboard" />;
  } else {
    return <Navigate to="/employee/dashboard" />;
  }
};

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, token, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token && !isAuthenticated) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, token, isAuthenticated]);

  // 점포관리 메타 정보 초기화
  useEffect(() => {
    if (user && isAuthenticated) {
      dispatch(setUser(user));
      // 모든 사용자에게 점포관리에서 등록된 점포 정보 제공
      dispatch(fetchStores());
    }
  }, [dispatch, user, isAuthenticated]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!user || !token ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user || !token ? <Register /> : <Navigate to="/" />} />
      
      {/* Protected Routes */}
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        {/* Employee Routes */}
        <Route path="/employee" element={<Navigate to="/employee/dashboard" />} />
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="/employee/work-schedule" element={<WorkSchedule />} />
        <Route path="/employee/weekly-stats" element={<WeeklyStats />} />
        <Route path="/employee/notifications" element={<Notifications />} />
        <Route path="/employee/profile" element={<Profile />} />
        
        {/* Owner Routes */}
        <Route path="/owner" element={<Navigate to="/owner/dashboard" />} />
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
        <Route path="/owner/employees" element={<EmployeeManagement />} />
        <Route path="/owner/work-schedule" element={<OwnerWorkSchedule />} />
        <Route path="/owner/approve-requests" element={<ApproveRequests />} />
        <Route path="/owner/statistics" element={<Statistics />} />
        <Route path="/owner/store-management" element={<StoreManagement />} />
        <Route path="/owner/expense-management" element={<ExpenseManagement />} />
        
        {/* Default redirect - 역할에 따라 적절한 대시보드로 리다이렉트 */}
        <Route index element={<RoleBasedRedirect />} />
      </Route>
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App; 