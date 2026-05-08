import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import ScheduleCalendar from './ScheduleCalendar';

const now = new Date();
const THIS_YEAR = now.getFullYear();

const STATUS_OPTIONS = [
  { value: '', label: '전체', color: 'bg-slate-100 text-slate-700', active: 'bg-slate-700 text-white' },
  { value: 'pending', label: '승인 대기', color: 'bg-amber-100 text-amber-700', active: 'bg-amber-500 text-white' },
  { value: 'approved', label: '승인됨', color: 'bg-emerald-100 text-emerald-700', active: 'bg-emerald-500 text-white' },
  { value: 'rejected', label: '거절됨', color: 'bg-red-100 text-red-700', active: 'bg-red-500 text-white' },
];

const YEARS = Array.from({ length: 3 }, (_, i) => THIS_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function FilterLabel({ children }) {
  return <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">{children}</p>;
}

export default function OwnerSchedulesPage() {
  const [tab, setTab] = useState('list');

  // 서버 필터 (API 쿼리에 사용)
  const [statusFilter, setStatusFilter] = useState('pending');
  const [storeFilter, setStoreFilter] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');

  // 클라이언트 필터
  const [employeeFilter, setEmployeeFilter] = useState('');

  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const queryClient = useQueryClient();

  const monthParam = year && month ? `${year}-${String(month).padStart(2, '0')}` : '';

  // 근무일정 조회
  const { data, isLoading } = useQuery({
    queryKey: ['owner-schedules', statusFilter, storeFilter, monthParam],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (storeFilter) params.append('storeId', storeFilter);
      if (monthParam) params.append('month', monthParam);
      const { data } = await apiClient.get(`/owner/schedules?${params}`);
      return data;
    },
    staleTime: 10 * 1000,
  });

  // 점포 목록
  const { data: storesData } = useQuery({
    queryKey: ['owner-stores'],
    queryFn: async () => {
      const { data } = await apiClient.get('/owner/stores');
      return data;
    },
  });

  // 직원 목록
  const { data: employeesData } = useQuery({
    queryKey: ['owner-employees'],
    queryFn: async () => {
      const { data } = await apiClient.get('/owner/employees');
      return data;
    },
  });

  // 승인
  const approveMutation = useMutation({
    mutationFn: async (scheduleId) => {
      const { data } = await apiClient.put(`/owner/schedules/${scheduleId}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['owner-schedules']);
      queryClient.invalidateQueries(['owner-dashboard']);
    },
  });

  // 거절
  const rejectMutation = useMutation({
    mutationFn: async ({ scheduleId, reason }) => {
      const { data } = await apiClient.put(`/owner/schedules/${scheduleId}/reject`, {
        rejectionReason: reason,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['owner-schedules']);
      queryClient.invalidateQueries(['owner-dashboard']);
      setRejectingId(null);
      setRejectionReason('');
    },
  });

  const handleApprove = (scheduleId) => {
    if (window.confirm('이 근무일정을 승인하시겠습니까?')) {
      approveMutation.mutate(scheduleId);
    }
  };

  const handleReject = (scheduleId) => {
    if (rejectionReason.trim()) {
      rejectMutation.mutate({ scheduleId, reason: rejectionReason });
    } else {
      alert('거절 사유를 입력해주세요.');
    }
  };

  const handleReset = () => {
    setStatusFilter('pending');
    setStoreFilter('');
    setYear('');
    setMonth('');
    setEmployeeFilter('');
  };

  const { items: rawItems = [], summary = {} } = data || {};

  // 직원 클라이언트 필터 적용
  const items = employeeFilter
    ? rawItems.filter((s) => s.userId?._id === employeeFilter)
    : rawItems;

  const hasActiveFilter = storeFilter || year || month || employeeFilter || statusFilter !== 'pending';

  return (
    <div className="space-y-5">
      {/* 헤더 + 탭 */}
      <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-semibold text-slate-900">근무일정 승인</h1>
        <p className="mt-1 text-sm text-slate-500">직원이 등록한 근무일정을 승인하거나 거절할 수 있습니다.</p>
        <div className="mt-4 flex gap-2">
          {['list', 'calendar'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                tab === t ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'list' ? '목록' : '월간 달력'}
            </button>
          ))}
        </div>
      </div>

      {/* 달력 뷰 */}
      {tab === 'calendar' && (
        <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
          <ScheduleCalendar storesData={storesData} />
        </div>
      )}

      {/* 목록 뷰 */}
      {tab === 'list' && (
        <>
          {/* 필터 패널 */}
          <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700">필터</p>
              {hasActiveFilter && (
                <button
                  onClick={handleReset}
                  className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200"
                >
                  초기화
                </button>
              )}
            </div>

            <div className="space-y-5">
              {/* 점포 / 인원 */}
              <div>
                <FilterLabel>점포 / 인원</FilterLabel>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={storeFilter}
                    onChange={(e) => { setStoreFilter(e.target.value); setEmployeeFilter(''); }}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    <option value="">전체 점포</option>
                    {storesData?.items?.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                  <select
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    <option value="">전체 인원</option>
                    {(employeesData?.items || []).map((e) => (
                      <option key={e._id} value={e._id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 기간 */}
              <div>
                <FilterLabel>기간</FilterLabel>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    <option value="">전체 연도</option>
                    {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
                  </select>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    disabled={!year}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-40"
                  >
                    <option value="">전체 월</option>
                    {MONTHS.map((m) => <option key={m} value={m}>{m}월</option>)}
                  </select>
                </div>
              </div>

              {/* 상태 */}
              <div>
                <FilterLabel>상태</FilterLabel>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStatusFilter(opt.value)}
                      className={`rounded-2xl px-4 py-1.5 text-sm font-semibold transition ${
                        statusFilter === opt.value ? opt.active : opt.color
                      }`}
                    >
                      {opt.label}
                      {opt.value === 'pending' && summary.pending > 0 && (
                        <span className="ml-1.5 rounded-full bg-white/30 px-1.5 text-xs">
                          {summary.pending}
                        </span>
                      )}
                      {opt.value === 'approved' && summary.approved > 0 && (
                        <span className="ml-1.5 rounded-full bg-white/30 px-1.5 text-xs">
                          {summary.approved}
                        </span>
                      )}
                      {opt.value === 'rejected' && summary.rejected > 0 && (
                        <span className="ml-1.5 rounded-full bg-white/30 px-1.5 text-xs">
                          {summary.rejected}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 결과 요약 */}
            <div className="mt-5 flex items-center gap-1.5 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span>총</span>
              <span className="font-bold text-slate-800">{items.length}건</span>
              {employeeFilter && (
                <span className="ml-1 text-brand-600 font-semibold">
                  · {employeesData?.items?.find((e) => e._id === employeeFilter)?.name}
                </span>
              )}
            </div>
          </div>

          {/* 목록 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-400">로딩 중...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-white/60 bg-white/90 p-12 text-center shadow-sm backdrop-blur">
              <p className="text-slate-400">조건에 맞는 근무일정이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((schedule) => {
                const workDate = new Date(schedule.workDate);
                const dateStr = `${workDate.getFullYear()}-${String(workDate.getMonth() + 1).padStart(2, '0')}-${String(workDate.getDate()).padStart(2, '0')}`;
                const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][workDate.getDay()];

                return (
                  <div
                    key={schedule._id}
                    className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-3 flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {schedule.userId?.name || '알 수 없음'}
                          </h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              schedule.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : schedule.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {schedule.status === 'pending' ? '승인 대기'
                              : schedule.status === 'approved' ? '승인됨' : '거절됨'}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600">
                          <p>
                            <span className="font-semibold text-slate-900">점포:</span>{' '}
                            {schedule.storeId?.name || '알 수 없음'}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">날짜:</span>{' '}
                            {dateStr} ({dayOfWeek})
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">시간:</span>{' '}
                            {schedule.startTime} ~ {schedule.endTime} ({schedule.totalHours}시간)
                          </p>
                          {schedule.notes && (
                            <p>
                              <span className="font-semibold text-slate-900">메모:</span>{' '}
                              {schedule.notes}
                            </p>
                          )}
                          {schedule.rejectionReason && (
                            <p className="text-red-600">
                              <span className="font-semibold">거절 사유:</span>{' '}
                              {schedule.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>
                      {schedule.status === 'pending' && (
                        <div className="ml-4 flex flex-col gap-2">
                          <button
                            onClick={() => handleApprove(schedule._id)}
                            disabled={approveMutation.isLoading}
                            className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => setRejectingId(schedule._id)}
                            className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                          >
                            거절
                          </button>
                        </div>
                      )}
                    </div>

                    {rejectingId === schedule._id && (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                        <label className="block text-sm font-semibold text-slate-900">거절 사유</label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="거절 사유를 입력해주세요..."
                          className="mt-2 w-full rounded-xl border border-red-200 bg-white p-3 text-sm"
                          rows={3}
                        />
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleReject(schedule._id)}
                            disabled={rejectMutation.isLoading || !rejectionReason.trim()}
                            className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                          >
                            거절하기
                          </button>
                          <button
                            onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
