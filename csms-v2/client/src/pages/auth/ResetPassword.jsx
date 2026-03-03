import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { apiClient } from '../../lib/apiClient';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const newPassword = watch('newPassword');

  useEffect(() => {
    if (!token) setError('재설정 링크가 올바르지 않습니다. 비밀번호 찾기를 다시 시도해주세요.');
  }, [token]);

  const onSubmit = async (data) => {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f6f8ff] to-white px-4 py-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg backdrop-blur sm:p-8">
            <h1 className="text-xl font-bold text-slate-900">비밀번호가 변경되었습니다</h1>
            <p className="mt-2 text-sm text-slate-600">새 비밀번호로 로그인해주세요.</p>
            <div className="mt-6">
              <Link
                to="/login"
                className="touch-target block w-full rounded-2xl bg-brand-500 py-3 text-center text-base font-semibold text-white transition hover:bg-brand-600"
              >
                로그인
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f6f8ff] to-white px-4 py-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg backdrop-blur sm:p-8">
            <p className="text-slate-700">{error}</p>
            <div className="mt-6">
              <Link to="/forgot-password" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                비밀번호 찾기
              </Link>
              {' · '}
              <Link to="/login" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                로그인
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f6f8ff] to-white px-4 py-6">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg backdrop-blur sm:p-8">
          <header className="mb-6 text-center sm:mb-8">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">비밀번호 재설정</h1>
            <p className="mt-2 text-sm text-slate-500">새 비밀번호를 입력해주세요.</p>
          </header>

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">새 비밀번호</label>
              <input
                type="password"
                {...register('newPassword', {
                  required: '비밀번호를 입력해주세요',
                  minLength: { value: 6, message: '비밀번호는 최소 6자 이상이어야 합니다' },
                })}
                className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="••••••"
              />
              {errors.newPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">비밀번호 확인</label>
              <input
                type="password"
                {...register('confirmPassword', {
                  required: '비밀번호 확인을 입력해주세요',
                  validate: (v) => v === newPassword || '비밀번호가 일치하지 않습니다',
                })}
                className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="••••••"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="touch-target w-full rounded-2xl bg-brand-500 py-3 text-base font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
