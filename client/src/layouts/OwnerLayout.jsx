import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const navItems = [
  { id: 'dashboard', label: '홈', path: '/owner/dashboard', icon: '🏠' },
  { id: 'schedules', label: '승인', path: '/owner/schedules', icon: '✅' },
  { id: 'employees', label: '직원', path: '/owner/employees', icon: '👥' },
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
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-24 pt-6">
        <header className="mb-6 flex items-center justify-between rounded-3xl bg-white/90 p-4 shadow-sm backdrop-blur">
          <div>
            <p className="text-sm text-slate-500">점주 관리 시스템</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              {user?.name}님, 안녕하세요
            </h1>
            <p className="text-xs font-medium text-brand-600">점주</p>
          </div>
          <div className="flex items-center gap-2">
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

