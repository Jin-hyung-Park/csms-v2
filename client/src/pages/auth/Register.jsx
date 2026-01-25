import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../stores/authStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');

  // 이미 로그인되어 있으면 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/employee/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data) => {
    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || '',
        role: data.role || 'employee',
      });

      // 회원가입 성공 후 자동 로그인
      login(response.data.user, response.data.token);
      navigate('/employee/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f6f8ff] to-white px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/60 bg-white/90 p-8 shadow-lg backdrop-blur">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900">CSMS 회원가입</h1>
            <p className="mt-2 text-sm text-slate-500">새 계정을 만들어 시작하세요</p>
          </header>

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">이름</label>
              <input
                type="text"
                {...register('name', {
                  required: '이름을 입력해주세요',
                })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="홍길동"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

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
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="••••••"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">비밀번호 확인</label>
              <input
                type="password"
                {...register('confirmPassword', {
                  required: '비밀번호를 다시 입력해주세요',
                  validate: (value) => value === password || '비밀번호가 일치하지 않습니다',
                })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="••••••"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">전화번호 (선택)</label>
              <input
                type="tel"
                {...register('phone')}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="010-1234-5678"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">역할</label>
              <select
                {...register('role')}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                defaultValue="employee"
              >
                <option value="employee">근로자</option>
                <option value="owner">점주</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? '회원가입 중...' : '회원가입'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

