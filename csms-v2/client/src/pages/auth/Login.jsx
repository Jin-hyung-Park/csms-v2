import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // 이미 로그인되어 있으면 역할에 따라 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          navigate(user.role === 'owner' ? '/owner/dashboard' : '/employee/dashboard');
        } catch {
          navigate('/employee/dashboard');
        }
      } else {
        navigate('/employee/dashboard');
      }
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data) => {
    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      // 로그인 성공
      login(response.data.user, response.data.token);
      
      // 역할에 따라 리다이렉트
      const redirectPath = response.data.user.role === 'owner' 
        ? '/owner/dashboard' 
        : '/employee/dashboard';
      navigate(redirectPath);
    } catch (err) {
      setError(err.response?.data?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f6f8ff] to-white px-4 py-6">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg backdrop-blur sm:p-8">
          <header className="mb-6 text-center sm:mb-8">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">CSMS 로그인</h1>
            <p className="mt-2 text-sm text-slate-500">편의점 관리 시스템에 오신 것을 환영합니다</p>
          </header>

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">이메일</label>
              <input
                type="email"
                {...register('email', {
                  required: '이메일을 입력해주세요',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: '올바른 이메일 형식이 아닙니다',
                  },
                })}
                className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="example@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">비밀번호</label>
              <input
                type="password"
                {...register('password', {
                  required: '비밀번호를 입력해주세요',
                  minLength: {
                    value: 6,
                    message: '비밀번호는 최소 6자 이상이어야 합니다',
                  },
                })}
                className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="••••••"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="touch-target w-full rounded-2xl bg-brand-500 py-3 text-base font-semibold text-white transition hover:bg-brand-600 active:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-slate-600">
              계정이 없으신가요?{' '}
              <Link to="/register" className="inline-block py-2 font-semibold text-brand-600 hover:text-brand-700 active:opacity-80">
                회원가입
              </Link>
            </p>
            <Link to="/forgot-password" className="text-sm font-medium text-slate-500 hover:text-slate-700">
              비밀번호 찾기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

