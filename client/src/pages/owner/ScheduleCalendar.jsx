import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { usePersistedFilter } from '../../hooks/usePersistedFilter';

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

function localDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildCalendarWeeks(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // 1일이 속한 주의 월요일로 이동
  const dow = firstDay.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const cur = new Date(firstDay);
  cur.setDate(firstDay.getDate() + offset);

  const weeks = [];

  while (cur <= lastDay) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

const STATUS_STYLE = {
  approved: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-700',
};

export default function ScheduleCalendar({ storesData }) {
  const now = new Date();
  const [year, setYear] = usePersistedFilter('csms_filter_calendar_year', now.getFullYear());
  const [month, setMonth] = usePersistedFilter('csms_filter_calendar_month', now.getMonth() + 1);
  const [storeFilter, setStoreFilter] = usePersistedFilter('csms_filter_calendar_store', '');

  const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const toDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

  const { data, isLoading } = useQuery({
    queryKey: ['owner-schedules-calendar', year, month, storeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ fromDate, toDate });
      if (storeFilter) params.append('storeId', storeFilter);
      // status 필터 없이 전체 조회
      const { data } = await apiClient.get(`/owner/schedules?${params}`);
      return data;
    },
    staleTime: 30 * 1000,
  });

  const schedulesByDate = useMemo(() => {
    const map = {};
    (data?.items || []).forEach((s) => {
      const key = localDateKey(s.workDate);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [data]);

  const weeks = useMemo(() => buildCalendarWeeks(year, month), [year, month]);

  const todayKey = localDateKey(new Date());
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 범례 통계
  const items = data?.items || [];
  const approvedCount = items.filter((s) => s.status === 'approved').length;
  const pendingCount = items.filter((s) => s.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">연도</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {years.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">월</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {months.map((m) => <option key={m} value={m}>{m}월</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">점포</label>
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="">전체 점포</option>
            {storesData?.items?.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* 범례 */}
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-200" />
            승인 {approvedCount}건
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-200" />
            대기 {pendingCount}건
          </span>
        </div>
      </div>

      {/* 달력 */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-slate-400">불러오는 중...</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="min-w-[640px]">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={label}
                  className={`py-2.5 text-center text-xs font-bold ${
                    i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : 'text-slate-500'
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* 주차 행 */}
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-slate-100 last:border-0">
                {week.map((date, di) => {
                  const key = localDateKey(date);
                  const isThisMonth = date.getMonth() + 1 === month;
                  const isToday = key === todayKey;
                  const daySchedules = schedulesByDate[key] || [];

                  return (
                    <div
                      key={di}
                      className={`min-h-[90px] border-r border-slate-100 p-1.5 last:border-0 ${
                        !isThisMonth ? 'bg-slate-50/60' : ''
                      }`}
                    >
                      {/* 날짜 숫자 */}
                      <div className="mb-1 flex items-center justify-center">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                            isToday
                              ? 'bg-brand-500 text-white'
                              : !isThisMonth
                              ? 'text-slate-300'
                              : di === 5
                              ? 'text-blue-500'
                              : di === 6
                              ? 'text-red-500'
                              : 'text-slate-700'
                          }`}
                        >
                          {date.getDate()}
                        </span>
                      </div>

                      {/* 근무 항목 */}
                      <div className="space-y-0.5">
                        {daySchedules.map((s) => (
                          <div
                            key={s._id}
                            className={`rounded px-1 py-0.5 text-[11px] leading-tight ${STATUS_STYLE[s.status] || 'bg-slate-100 text-slate-600'}`}
                          >
                            <p className="truncate font-semibold">{s.userId?.name}</p>
                            <p className="opacity-70">
                              {s.startTime}~{s.endTime}
                              {s.totalHours ? ` (${s.totalHours}h)` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
