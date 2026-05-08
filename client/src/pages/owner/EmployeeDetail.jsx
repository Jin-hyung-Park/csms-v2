import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

const TAX_OPTIONS = [
  { value: 'none', label: '미신고' },
  { value: 'under-15-hours', label: '주 15시간 미만' },
  { value: 'business-income', label: '사업자소득 (3.3%)' },
  { value: 'labor-income', label: '근로소득' },
  { value: 'four-insurance', label: '4대 보험' },
];

const DEFAULT_MIN_WAGE = 10320; // 2026년 최저시급

const DAYS = [
  { key: 'monday', label: '월요일' },
  { key: 'tuesday', label: '화요일' },
  { key: 'wednesday', label: '수요일' },
  { key: 'thursday', label: '목요일' },
  { key: 'friday', label: '금요일' },
  { key: 'saturday', label: '토요일' },
  { key: 'sunday', label: '일요일' },
];

const defaultDaySchedule = () => ({ enabled: false, startTime: '09:00', endTime: '18:00' });

const defaultWorkSchedule = () =>
  DAYS.reduce((acc, { key }) => {
    acc[key] = defaultDaySchedule();
    return acc;
  }, {});

const mergeWorkSchedule = (from) => {
  const base = defaultWorkSchedule();
  if (!from || typeof from !== 'object') return base;
  DAYS.forEach(({ key }) => {
    if (from[key] && typeof from[key] === 'object') {
      base[key] = {
        enabled: Boolean(from[key].enabled),
        startTime: from[key].startTime || '09:00',
        endTime: from[key].endTime || '18:00',
      };
    }
  });
  return base;
};

export default function OwnerEmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hourlyWage, setHourlyWage] = useState('');
  const [taxType, setTaxType] = useState('');
  const [workSchedule, setWorkSchedule] = useState(() => defaultWorkSchedule());
  const [ssn, setSsn] = useState('');
  const [hiredAt, setHiredAt] = useState('');
  const [probationEndDate, setProbationEndDate] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['owner-employee', id],
    queryFn: async () => {
      const { data: res } = await apiClient.get(`/owner/employees/${id}`);
      return res;
    },
  });

  useEffect(() => {
    if (data?.employee?.workSchedule) {
      setWorkSchedule(mergeWorkSchedule(data.employee.workSchedule));
    } else if (data?.employee) {
      setWorkSchedule(defaultWorkSchedule());
    }
  }, [data?.employee]);

  useEffect(() => {
    if (data?.employee) {
      setSsn(data.employee.ssn ?? '');
      const h = data.employee.hiredAt;
      setHiredAt(h ? (typeof h === 'string' ? h.slice(0, 10) : new Date(h).toISOString().slice(0, 10)) : '');
      const p = data.employee.probationEndDate;
      setProbationEndDate(p ? (typeof p === 'string' ? p.slice(0, 10) : new Date(p).toISOString().slice(0, 10)) : '');
    }
  }, [data?.employee]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { data: res } = await apiClient.delete(`/owner/employees/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['owner-employees']);
      alert('직원이 퇴사 처리되었습니다.');
      navigate('/owner/employees');
    },
    onError: (err) => {
      alert(err.response?.data?.message || '퇴사 처리에 실패했습니다.');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (body) => {
      const { data: res } = await apiClient.put(`/owner/employees/${id}`, body);
      return res;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['owner-employee', id]);
      queryClient.invalidateQueries(['owner-employees']);
      if (variables.approvalStatus === 'rejected') {
        alert('가입이 거절되었습니다.');
      } else if (variables.approvalStatus === 'approved') {
        alert('승인되었습니다.');
      } else {
        alert('저장되었습니다.');
      }
      navigate('/owner/employees');
    },
    onError: (err) => {
      alert(err.response?.data?.message || '저장에 실패했습니다.');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">로딩 중...</p>
      </div>
    );
  }
  if (error || !data?.employee) {
    return (
      <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-center text-red-700">
        직원 정보를 불러올 수 없습니다.
        <button type="button" onClick={() => navigate('/owner/employees')} className="ml-2 underline">
          목록으로
        </button>
      </div>
    );
  }

  const { employee, stats } = data;
  const isPending = employee.approvalStatus === 'pending';
  const isRejected = employee.approvalStatus === 'rejected';
  const needsApprovalAction = isPending || isRejected;
  const storeMinWage = employee.storeId?.minimumWage ?? DEFAULT_MIN_WAGE;
  const wage = hourlyWage !== '' ? Number(hourlyWage) : (employee.hourlyWage ?? storeMinWage);
  const tax = taxType || employee.taxType || 'none';

  const handleWorkScheduleChange = (dayKey, field, value) => {
    setWorkSchedule((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: field === 'enabled' ? value : value,
      },
    }));
  };

  const handleApprove = () => {
    if (isPending && (wage < 0 || Number.isNaN(wage))) {
      alert('시급을 올바르게 입력해 주세요.');
      return;
    }
    if (window.confirm(isPending ? '이 직원의 가입을 승인하시겠습니까?' : '저장하시겠습니까?')) {
      approveMutation.mutate({
        approvalStatus: isPending ? 'approved' : undefined,
        hourlyWage: wage,
        taxType: tax,
        workSchedule,
        ssn: ssn.trim(),
        hiredAt: hiredAt.trim() || null,
        probationEndDate: probationEndDate.trim() || null,
      });
    }
  };

  const handleReject = () => {
    if (window.confirm('이 직원의 가입을 거절하시겠습니까?')) {
      approveMutation.mutate({ approvalStatus: 'rejected' });
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/owner/employees')}
        className="touch-target -ml-1 inline-block py-2 text-base font-semibold text-brand-600 hover:underline active:opacity-80"
      >
        ← 직원 목록
      </button>

      <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">{employee.name}</h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {isPending ? '승인 대기' : '승인됨'}
          </span>
        </div>
        <p className="text-slate-500">{employee.email}</p>
        <p className="mt-2 text-sm text-slate-600">
          점포: <span className="font-semibold">{employee.storeId?.name || '미할당'}</span>
        </p>
        {employee.phone && (
          <p className="text-sm text-slate-600">전화: {employee.phone}</p>
        )}
      </div>

      <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">근로 정보</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">시급 (원)</label>
            <input
              type="number"
              min={0}
              value={hourlyWage === '' ? (employee.hourlyWage ?? storeMinWage) : hourlyWage}
              onChange={(e) => setHourlyWage(e.target.value)}
              className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none"
              placeholder={String(storeMinWage)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">세금 유형</label>
            <select
              value={tax}
              onChange={(e) => setTaxType(e.target.value)}
              className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none"
            >
              {TAX_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">주민번호</label>
            <input
              type="text"
              value={ssn}
              onChange={(e) => setSsn(e.target.value)}
              className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none"
              placeholder="000000-0000000 (급여 엑셀용)"
              maxLength={20}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">입사일</label>
            <input
              type="date"
              value={hiredAt}
              onChange={(e) => setHiredAt(e.target.value)}
              className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">수습 종료일</label>
            <input
              type="date"
              value={probationEndDate}
              onChange={(e) => setProbationEndDate(e.target.value)}
              className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-brand-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-400">
              이 날짜 이전 근무는 최저시급(₩10,320)으로 산정되며, 이후부터 계약 시급이 적용됩니다. 미입력 시 계약 시급만 적용됩니다.
            </p>
          </div>
        </div>

        <h3 className="mt-6 mb-3 text-base font-semibold text-slate-800">근로 요일 · 근로 시간</h3>
        <p className="mb-4 text-xs text-slate-500">
          근무 가능 요일을 선택하고, 해당 요일의 기본 근로 시간을 설정합니다.
        </p>
        <div className="space-y-3">
          {DAYS.map(({ key, label }) => (
            <div
              key={key}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3"
            >
              <label className="flex min-w-[4rem] items-center gap-2">
                <input
                  type="checkbox"
                  checked={workSchedule[key]?.enabled ?? false}
                  onChange={(e) => handleWorkScheduleChange(key, 'enabled', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={workSchedule[key]?.startTime ?? '09:00'}
                  onChange={(e) => handleWorkScheduleChange(key, 'startTime', e.target.value)}
                  disabled={!workSchedule[key]?.enabled}
                  className="input-touch rounded-xl border border-slate-200 px-3 py-2.5 text-base disabled:bg-slate-100 disabled:text-slate-400"
                />
                <span className="text-slate-400">~</span>
                <input
                  type="time"
                  value={workSchedule[key]?.endTime ?? '18:00'}
                  onChange={(e) => handleWorkScheduleChange(key, 'endTime', e.target.value)}
                  disabled={!workSchedule[key]?.enabled}
                  className="input-touch rounded-xl border border-slate-200 px-3 py-2.5 text-base disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {needsApprovalAction ? (
            <>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="touch-target flex-1 rounded-2xl bg-emerald-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
              >
                {approveMutation.isPending ? '처리 중...' : '승인처리'}
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={approveMutation.isPending || isRejected}
                className="touch-target flex-1 rounded-2xl bg-red-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                거절처리
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="touch-target flex-1 rounded-2xl bg-brand-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                {approveMutation.isPending ? '처리 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/owner/employees')}
                className="touch-target flex-1 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
            </>
          )}
        </div>
        {!isPending && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`${employee.name}님을 퇴사 처리하시겠습니까? 해당 직원은 목록에서 사라집니다.`)) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="touch-target w-full rounded-2xl border border-red-200 bg-white px-6 py-3 text-base font-semibold text-red-600 transition active:bg-red-50 hover:bg-red-50 disabled:opacity-50"
            >
              {deleteMutation.isPending ? '처리 중...' : '퇴사 처리'}
            </button>
          </div>
        )}
      </div>

      {stats?.length > 0 && (
        <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">근무 통계</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {stats.map((s) => (
              <li key={`${s.year}-${s.month}`}>
                {s.monthLabel}: {s.totalHours}h, {s.workDays}일
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
