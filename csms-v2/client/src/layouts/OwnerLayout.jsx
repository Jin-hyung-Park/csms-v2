import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const navItems = [
  { id: 'dashboard', label: '홈', path: '/owner/dashboard', icon: '🏠' },
  { id: 'schedules', label: '승인', path: '/owner/schedules', icon: '✅' },
  { id: 'salary', label: '급여', path: '/owner/salary', icon: '💰' },
  { id: 'employees', label: '직원', path: '/owner/employees', icon: '👥' },
  { id: 'notifications', label: '알림', path: '/owner/notifications', icon: '🔔' },
  { id: 'stores', label: '점포', path: '/owner/stores', icon: '🏪' },
];

export default function OwnerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();

  // 인증 및 역할 확인
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user?.role !== 'owner') {
      // 점주가 아니면 역할에 따라 리다이렉트
      navigate(user?.role === 'employee' ? '/employee/dashboard' : '/login');
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#f6f8ff] to-white">
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-28 pt-4 sm:pb-24 sm:pt-6" style={{ paddingBottom: 'max(7rem, calc(7rem + env(safe-area-inset-bottom)))' }}>
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/90 p-4 shadow-sm backdrop-blur sm:mb-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500">점주 관리 시스템</p>
            <h1 className="mt-1 truncate text-xl font-semibold text-slate-900 sm:text-2xl">
              {user?.name}님, 안녕하세요
            </h1>
            <p className="text-xs font-medium text-brand-600">점주</p>
          </div>
          <div className="flex shrink-0">
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

      <nav className="fixed bottom-0 left-0 right-0 border-t border-white/60 bg-white/90 backdrop-blur safe-area-bottom">
        <div className="mx-auto flex max-w-md items-center justify-between px-2 py-2 text-xs font-semibold text-slate-500 sm:px-6 sm:py-3">
          {navItems.map((item) => {
            const active = location.pathname === item.path ||
                          (item.id === 'salary' && location.pathname.startsWith('/owner/salary')) ||
                          (item.id === 'notifications' && location.pathname.startsWith('/owner/notifications'));
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
    </div>
  );
}

