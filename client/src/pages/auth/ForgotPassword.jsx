import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { apiClient } from '../../lib/apiClient';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setError(null);
    setLoading(true);
    try {
      const { data: res } = await apiClient.post('/auth/forgot-password', {
        email: data.email,
      });
      setSent(true);
      if (res.resetToken) {
        setResetLink(`${window.location.origin}/reset-password?token=${res.resetToken}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || '요청 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f6f8ff] to-white px-4 py-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg backdrop-blur sm:p-8">
            <h1 className="text-xl font-bold text-slate-900">이메일을 확인해주세요</h1>
            <p className="mt-2 text-sm text-slate-600">
              등록된 이메일인 경우 비밀번호 재설정 링크를 발송했습니다. 이메일함을 확인해주세요.
            </p>
            {resetLink && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="mb-2 text-xs font-semibold text-slate-500">개발/배타: 아래 링크로 재설정</p>
                <a
                  href={resetLink}
                  className="block break-all text-sm font-medium text-brand-600 underline"
                >
                  비밀번호 재설정 페이지 열기
                </a>
              </div>
            )}
            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-block rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                로그인으로 돌아가기
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
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">비밀번호 찾기</h1>
            <p className="mt-2 text-sm text-slate-500">가입한 이메일을 입력하면 재설정 링크를 보내드립니다.</p>
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
            <button
              type="submit"
              disabled={loading}
              className="touch-target w-full rounded-2xl bg-brand-500 py-3 text-base font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? '전송 중...' : '재설정 링크 받기'}
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
