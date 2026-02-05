import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../stores/authStore';

function StoreCodeField({ register, watch, errors }) {
  const role = watch('role');
  const [validateMsg, setValidateMsg] = useState(null); // { type: 'success'|'error', text }

  if (role !== 'employee') return null;

  const handleValidate = async () => {
    const code = (watch('storeCode') || '').trim().toUpperCase();
    if (code.length !== 5) {
      setValidateMsg({ type: 'error', text: '5자리를 입력한 뒤 검증해 주세요.' });
      return;
    }
    setValidateMsg(null);
    try {
      const { data } = await apiClient.get(`/auth/validate-store-code?code=${encodeURIComponent(code)}`);
      setValidateMsg({ type: 'success', text: `매장: ${data.storeName}` });
    } catch (err) {
      setValidateMsg({ type: 'error', text: err.response?.data?.message || '등록되지 않은 매장코드입니다.' });
    }
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-700">매장코드 (5자리) *</label>
      <p className="mb-2 text-xs text-slate-500">근무 예정 매장의 5자리 매장코드를 입력하세요. 점주에게 코드를 받으세요.</p>
      <div className="flex gap-2">
        <input
          type="text"
          maxLength={5}
          placeholder="예: PG001"
          {...register('storeCode', {
            required: role === 'employee' ? '매장코드를 입력해 주세요' : false,
            minLength: role === 'employee' ? { value: 5, message: '5자리로 입력해 주세요' } : undefined,
          })}
          className="input-touch flex-1 rounded-2xl border border-slate-200 px-4 py-3 uppercase focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          onChange={() => setValidateMsg(null)}
        />
        <button
          type="button"
          onClick={handleValidate}
          className="touch-target shrink-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100"
        >
          검증
        </button>
      </div>
      {errors.storeCode && <p className="mt-1 text-xs text-red-600">{errors.storeCode.message}</p>}
      {validateMsg && (
        <p className={`mt-1 text-xs ${validateMsg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
          {validateMsg.text}
        </p>
      )}
    </div>
  );
}

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
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || '',
        role: data.role || 'employee',
      };
      if (payload.role === 'employee') {
        const code = (data.storeCode || '').trim().toUpperCase();
        if (code.length !== 5) {
          setError('근로자 가입을 위해 5자리 매장코드를 입력해 주세요.');
          setLoading(false);
          return;
        }
        payload.storeCode = code;
      }

      const response = await apiClient.post('/auth/register', payload);
      const { user, token, message: serverMessage, approvalStatus } = response.data;

      // 회원가입 성공 후 자동 로그인
      login(user, token);
      if (approvalStatus === 'pending') {
        alert(serverMessage || '가입 요청이 완료되었습니다. 점주 승인 후 서비스를 이용할 수 있습니다.');
      }
      navigate(user.role === 'owner' ? '/owner/dashboard' : '/employee/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f6f8ff] to-white px-4 py-6">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg backdrop-blur sm:p-8">
          <header className="mb-6 text-center sm:mb-8">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">CSMS 회원가입</h1>
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
                className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">비밀번호 확인</label>
              <input
                type="password"
                {...register('confirmPassword', {
                  required: '비밀번호를 다시 입력해주세요',
                  validate: (value) => value === password || '비밀번호가 일치하지 않습니다',
                })}
                className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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
                className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="010-1234-5678"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">역할</label>
              <select
                {...register('role')}
                className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                defaultValue="employee"
              >
                <option value="employee">근로자</option>
                <option value="owner">점주</option>
              </select>
            </div>

            <StoreCodeField register={register} watch={watch} errors={errors} />

            <button
              type="submit"
              disabled={loading}
              className="touch-target w-full rounded-2xl bg-brand-500 py-3 text-base font-semibold text-white transition hover:bg-brand-600 active:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? '회원가입 중...' : '회원가입'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="inline-block py-2 font-semibold text-brand-600 hover:text-brand-700 active:opacity-80">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

