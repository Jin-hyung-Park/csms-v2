import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../lib/apiClient';

const navItems = [
  { id: 'dashboard', label: '홈', path: '/employee/dashboard', icon: '🏠' },
  { id: 'schedule', label: '근무표', path: '/employee/schedule', icon: '📅' },
  { id: 'salary', label: '급여', path: '/employee/salary', icon: '💵' },
  { id: 'profile', label: '내정보', path: '/employee/profile', icon: '👤' },
];

export default function EmployeeLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();

  // 인증 및 역할 확인
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user?.role !== 'employee') {
      // 직원이 아니면 역할에 따라 리다이렉트
      navigate(user?.role === 'owner' ? '/owner/dashboard' : '/login');
    }
  }, [isAuthenticated, user, navigate]);
  const { data: notifications } = useQuery({
    queryKey: ['employee-notifications'],
    queryFn: async () => {
      const { data } = await apiClient.get('/employee/notifications');
      return data;
    },
    staleTime: 60 * 1000,
  });

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#f6f8ff] to-white">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-6">
        <header className="mb-6 flex items-center justify-between rounded-3xl bg-white/90 p-4 shadow-sm backdrop-blur">
          <div>
            <p className="text-sm text-slate-500">오늘도 화이팅이에요 👋</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              {user?.name}님, 안녕하세요
            </h1>
            <p className="text-xs font-medium text-brand-600">{user?.storeName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/employee/notifications')}
              className="relative rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600"
            >
              🔔 알림
              {notifications?.unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-500 px-1 text-xs font-bold text-white">
                  {notifications.unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={logout}
              className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600"
            >
              로그아웃
            </button>
          </div>
        </header>

        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-white/60 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-3 text-xs font-semibold text-slate-500">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition ${
                  active ? 'text-brand-600' : ''
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
                <span
                  className={`h-1 w-6 rounded-full ${
                    active ? 'bg-brand-500' : 'bg-slate-200'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

