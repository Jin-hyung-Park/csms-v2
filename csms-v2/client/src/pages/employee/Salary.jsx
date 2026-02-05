import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

// 월을 YYYY-MM 형식으로 정규화 (1월 등 한 자리 월 → "01")
const normalizeMonthId = (id) => {
  if (!id || typeof id !== 'string') return id;
  const parts = id.split('-');
  if (parts.length !== 2) return id;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(y) || Number.isNaN(m) || m < 1 || m > 12) return id;
  return `${y}-${String(m).padStart(2, '0')}`;
};

const fetchSalarySummary = async (month) => {
  const normalized = month ? normalizeMonthId(month) : undefined;
  const { data } = await apiClient.get('/employee/salary/summary', {
    params: normalized ? { month: normalized } : {},
  });
  return data;
};

export default function EmployeeSalaryPage() {
  const navigate = useNavigate();
  const [exportingExcel, setExportingExcel] = useState(false);
  const [selectedMonthId, setSelectedMonthId] = useState(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-salary-summary', selectedMonthId || ''],
    queryFn: () => fetchSalarySummary(selectedMonthId || undefined),
  });

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 text-center">
        급여 정보를 불러오는 중입니다...
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-3xl border border-red-100 bg-red-50 p-6 text-center text-red-700">
        급여 정보를 불러오지 못했습니다.
      </section>
    );
  }

  const { months, current } = data;

  if (!months?.length || !current) {
    return (
      <div className="space-y-5 pb-8">
        <section className="rounded-3xl border border-white/60 bg-white/90 p-8 text-center shadow-sm">
          <p className="text-slate-500">근무 데이터가 있는 월이 없습니다.</p>
          <p className="mt-2 text-sm text-slate-400">승인된 근무일정이 있는 달부터 급여를 조회할 수 있습니다.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
        <header className="mb-4 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              월별 급여
            </p>
            <select
              className="input-touch rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold text-slate-700"
              value={current.id}
              onChange={(e) => setSelectedMonthId(e.target.value)}
            >
              {months.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.monthLabel}
                </option>
              ))}
            </select>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">
            {current.monthLabel} 급여 요약
          </h2>
          <p className="text-sm text-slate-500">주휴수당과 주차별 급여를 한눈에 확인</p>
        </header>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
          <p className="text-xs text-slate-500">예상 실수령액</p>
          <p className="text-3xl font-bold text-slate-900">{currency.format(current.netPay)}</p>
          <p className="text-xs text-slate-500">
            기본급 {currency.format(current.basePay)} · 주휴수당 {currency.format(current.holidayPay)}
          </p>
          {current.welfarePoints != null && current.welfarePoints > 0 && (
            <p className="mt-2 text-xs font-semibold text-violet-600">
              복지포인트 {currency.format(current.welfarePoints)}
            </p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(
                `/employee/salary/${current.year}/${String(current.month).padStart(2, '0')}`
              )
            }
            className="touch-target flex-1 min-w-0 rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold text-brand-600 active:bg-slate-50"
          >
            월별 상세 보기
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                setExportingExcel(true);
                const { data: blob } = await apiClient.get(
                  `/employee/export/payroll/${current.year}/${String(current.month).padStart(2, '0')}`,
                  { responseType: 'blob' }
                );
                const url = window.URL.createObjectURL(new Blob([blob]));
                const a = document.createElement('a');
                a.href = url;
                a.download = `급여명세서_${current.year}${String(current.month).padStart(2, '0')}.xlsx`;
                a.click();
                window.URL.revokeObjectURL(url);
              } catch (err) {
                const msg =
                  err.response?.status === 404
                    ? '해당 월의 급여 데이터가 없습니다. 급여가 산정된 후 다운로드할 수 있습니다.'
                    : err.response?.data?.message || 'Excel 다운로드에 실패했습니다.';
                alert(msg);
              } finally {
                setExportingExcel(false);
              }
            }}
            disabled={exportingExcel}
            className="touch-target rounded-2xl border border-emerald-500 bg-white px-4 py-3 text-base font-semibold text-emerald-700 active:bg-emerald-50 disabled:opacity-50"
          >
            {exportingExcel ? '다운로드 중...' : '📥 Excel'}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              주별 급여
            </p>
            <p className="text-sm text-slate-500">월요일 ~ 일요일 기준 주차</p>
          </div>
        </header>

        <div className="space-y-3">
          {current.weeks.map((week) => (
            <WeekCard
              key={week.weekNumber}
              week={week}
              onClick={() =>
                navigate(
                  `/employee/salary/${current.year}/${String(current.month).padStart(
                    2,
                    '0'
                  )}?week=${week.weekNumber}`
                )
              }
            />
          ))}
        </div>
      </section>

    </div>
  );
}

function WeekCard({ week, onClick }) {
  return (
    <article
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`rounded-2xl border border-slate-100 p-4 ${
        onClick ? 'cursor-pointer transition active:scale-[0.99] hover:-translate-y-0.5 hover:shadow' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {week.weekNumber}주차 · {week.range}
          </p>
          <p className="text-xs text-slate-500">근무 {week.totalHours}시간</p>
        </div>
        <span className="text-lg font-bold text-slate-900">{currency.format(week.basePay)}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
        <Info label="주휴수당" value={currency.format(week.holidayPay)} />
        {week.welfarePoints != null && (
          <Info label="복지포인트" value={currency.format(week.welfarePoints)} />
        )}
        <Info label="상태" value={week.holidayPayStatus} />
      </div>
    </article>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p>{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

