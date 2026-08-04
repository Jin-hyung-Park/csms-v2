import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat('ko-KR');

const fetchDashboard = async () => {
  const { data } = await apiClient.get('/employee/dashboard');
  return data;
};

export default function EmployeeDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-dashboard'],
    queryFn: fetchDashboard,
  });

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 text-center shadow-sm backdrop-blur">
        <p className="text-sm text-slate-500">대시보드 데이터를 불러오는 중입니다...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-100 bg-red-50 p-6 text-center text-red-700">
        데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </section>
    );
  }

  const workInfo = data.workInfo ?? {};
  const contractInfo = workInfo.contractInfo ?? {};
  const thisWeekWork = data.thisWeekWork ?? {};
  const lastMonthSalary = data.lastMonthSalary ?? {};

  return (
    <div className="space-y-5 pb-8">
      <DashboardCard
        title="근무 점포 및 계약 정보"
        description={`${workInfo.storeName ?? ''} · ${contractInfo.workDays ?? ''}`}
        onClick={() => navigate(workInfo.link ?? '/employee/schedule')}
      >
        <div className="space-y-2 text-sm text-slate-600">
          <InfoRow label="근무 점포" value={workInfo.storeName ?? '-'} />
          <InfoRow label="주소" value={workInfo.storeAddress ?? '-'} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
          <InfoRow label="근무 요일" value={contractInfo.workDays ?? '-'} />
          <InfoRow label="근무 시간" value={contractInfo.workTime ?? '-'} />
          <InfoRow label="주간 계약" value={`${contractInfo.weeklyHours ?? 0}시간`} />
          <InfoRow
            label="시급"
            value={currency.format(contractInfo.hourlyWage ?? 0)}
            highlight
          />
          <InfoRow label="세금" value={contractInfo.taxType ?? '-'} />
        </div>
      </DashboardCard>

      <DashboardCard
        title={`이번 주 근무 현황 (${thisWeekWork.weekNumber ?? '-'}주차)`}
        description={thisWeekWork.weekRange ?? ''}
        onClick={() => navigate(thisWeekWork.link ?? '/employee/schedule')}
      >
        <div className="grid grid-cols-3 gap-3 text-center text-slate-600">
          <Metric label="총 근무시간" value={`${thisWeekWork.totalHours ?? 0}h`} />
          <Metric label="근무일수" value={`${thisWeekWork.workDays ?? 0}일`} />
          <Metric label="예상 급여" value={currency.format(thisWeekWork.estimatedPay ?? 0)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <StatusPill label="승인 완료" value={`${thisWeekWork.approvedCount ?? 0}건`} />
          {(thisWeekWork.pendingCount ?? 0) > 0 && (
            <StatusPill
              label="승인 대기"
              value={`${thisWeekWork.pendingCount}건`}
              variant="warning"
            />
          )}
        </div>
      </DashboardCard>

      <DashboardCard
        title={`직전월 급여 (${lastMonthSalary.monthLabel ?? '-'})`}
        description="주휴수당 포함 금액"
        onClick={() => navigate(lastMonthSalary.link ?? '/employee/salary')}
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-600">
          <InfoRow label="총 근무시간" value={`${lastMonthSalary.totalHours ?? 0}시간`} />
          <InfoRow label="기본급" value={currency.format(lastMonthSalary.basePay ?? 0)} />
          <InfoRow label="주휴수당" value={currency.format(lastMonthSalary.holidayPay ?? 0)} />
          <InfoRow
            label="총 지급액"
            value={currency.format(lastMonthSalary.grossPay ?? 0)}
            highlight
          />
        </div>
        {lastMonthSalary.isConfirmed && (
          <p className="mt-3 text-center text-xs font-medium text-emerald-600">
            ✅ 점주 확정 완료
          </p>
        )}
      </DashboardCard>

      <DashboardCard title="읽지 않은 알림" description="승인 결과를 확인하세요">
        <p className="text-center text-2xl font-semibold text-brand-600">
          {number.format(data.unreadNotifications ?? 0)}건
        </p>
      </DashboardCard>
    </div>
  );
}

function DashboardCard({ title, description, children, onClick }) {
  return (
    <section
      onClick={onClick}
      className={`rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur ${
        onClick ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md' : ''
      }`}
    >
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
          {title}
        </p>
        <p className="text-sm text-slate-500">{description}</p>
      </header>
      {children}
    </section>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500">{label}</span>
      <span
        className={`text-sm font-semibold ${
          highlight ? 'text-brand-600' : 'text-slate-900'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusPill({ label, value, variant = 'success' }) {
  const styles =
    variant === 'warning'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-emerald-50 text-emerald-700';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${styles}`}>
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-xs">{value}</span>
    </span>
  );
}

