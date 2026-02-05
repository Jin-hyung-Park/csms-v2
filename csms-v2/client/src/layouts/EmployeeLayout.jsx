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

  // 승인 대기 중인 근로자는 대시보드만 접근 가능
  const isPendingApproval = user?.approvalStatus === 'pending';
  useEffect(() => {
    if (isPendingApproval && location.pathname !== '/employee/dashboard') {
      navigate('/employee/dashboard', { replace: true });
    }
  }, [isPendingApproval, location.pathname, navigate]);
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
      {user?.approvalStatus === 'pending' && (
        <div className="sticky top-0 z-10 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-white">
          가입 승인 대기 중입니다. 점주 승인 후 서비스를 이용할 수 있습니다.
        </div>
      )}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4 sm:pb-24 sm:pt-6" style={{ paddingBottom: 'max(7rem, calc(7rem + env(safe-area-inset-bottom)))' }}>
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/90 p-4 shadow-sm backdrop-blur sm:mb-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500">오늘도 화이팅이에요 👋</p>
            <h1 className="mt-1 truncate text-xl font-semibold text-slate-900 sm:text-2xl">
              {user?.name}님, 안녕하세요
            </h1>
            <p className="truncate text-xs font-medium text-brand-600">{user?.storeName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/employee/notifications')}
              className="touch-target relative flex items-center justify-center rounded-full bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600"
            >
              🔔 알림
              {notifications?.unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-500 px-1 text-xs font-bold text-white">
                  {notifications.unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={logout}
              className="touch-target flex items-center justify-center rounded-full bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600"
            >
              로그아웃
            </button>
          </div>
        </header>

        <Outlet />
      </main>

      {!isPendingApproval && (
        <nav className="fixed bottom-0 left-0 right-0 border-t border-white/60 bg-white/90 backdrop-blur safe-area-bottom">
          <div className="mx-auto flex max-w-md items-center justify-between px-2 py-2 text-xs font-semibold text-slate-500 sm:px-6 sm:py-3">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`touch-target flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 transition active:bg-slate-100/80 ${
                    active ? 'text-brand-600' : ''
                  }`}
                >
                  <span className="text-xl sm:text-lg">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden" style={{ fontSize: '10px' }}>{item.label}</span>
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
      )}
    </div>
  );
}

