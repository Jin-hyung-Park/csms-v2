import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/**
 * 역할에 따라 적절한 대시보드로 리다이렉트하는 컴포넌트
 */
export default function RoleBasedRedirect() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // 역할에 따라 리다이렉트
  if (user.role === 'owner') {
    return <Navigate to="/owner/dashboard" replace />;
  }

  return <Navigate to="/employee/dashboard" replace />;
}

