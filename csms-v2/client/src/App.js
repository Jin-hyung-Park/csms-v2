import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import OfflineBanner from './components/OfflineBanner';
import EmployeeLayout from './layouts/EmployeeLayout';
import OwnerLayout from './layouts/OwnerLayout';
import LoginPage from './pages/auth/Login';
import RegisterPage from './pages/auth/Register';
import EmployeeDashboardPage from './pages/employee/Dashboard';
import EmployeeSchedulePage from './pages/employee/Schedule';
import EmployeeSalaryPage from './pages/employee/Salary';
import EmployeeSalaryDetailPage from './pages/employee/SalaryDetail';
import EmployeeProfilePage from './pages/employee/Profile';
import EmployeeNotificationsPage from './pages/employee/Notifications';
import OwnerDashboardPage from './pages/owner/Dashboard';
import OwnerSchedulesPage from './pages/owner/Schedules';
import OwnerEmployeesPage from './pages/owner/Employees';
import OwnerStoresPage from './pages/owner/Stores';
import OwnerSalaryPage from './pages/owner/Salary';
import OwnerSalaryDetailPage from './pages/owner/SalaryDetail';
import OwnerEmployeeDetailPage from './pages/owner/EmployeeDetail';
import OwnerNotificationsPage from './pages/owner/Notifications';
import RoleBasedRedirect from './components/RoleBasedRedirect';

function App() {
  const { initialize } = useAuthStore();

  // 앱 시작 시 로그인 상태 초기화
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <OfflineBanner />
      <Routes>
        {/* 인증 페이지 (로그인/회원가입) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 보호된 라우트 - 직원 */}
        <Route element={<EmployeeLayout />}>
          <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
          <Route path="/employee/schedule" element={<EmployeeSchedulePage />} />
          <Route path="/employee/salary" element={<EmployeeSalaryPage />} />
          <Route path="/employee/salary/:year/:month" element={<EmployeeSalaryDetailPage />} />
          <Route path="/employee/profile" element={<EmployeeProfilePage />} />
          <Route path="/employee/notifications" element={<EmployeeNotificationsPage />} />
        </Route>

        {/* 보호된 라우트 - 점주 */}
        <Route element={<OwnerLayout />}>
          <Route path="/owner/dashboard" element={<OwnerDashboardPage />} />
          <Route path="/owner/schedules" element={<OwnerSchedulesPage />} />
          <Route path="/owner/employees" element={<OwnerEmployeesPage />} />
          <Route path="/owner/employees/:id" element={<OwnerEmployeeDetailPage />} />
          <Route path="/owner/stores" element={<OwnerStoresPage />} />
          <Route path="/owner/salary" element={<OwnerSalaryPage />} />
          <Route path="/owner/salary/:userId/:year/:month" element={<OwnerSalaryDetailPage />} />
          <Route path="/owner/notifications" element={<OwnerNotificationsPage />} />
        </Route>

        {/* 루트 경로 - 역할에 따라 리다이렉트 */}
        <Route path="/" element={<RoleBasedRedirect />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
