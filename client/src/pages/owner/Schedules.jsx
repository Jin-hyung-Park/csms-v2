import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

export default function OwnerSchedulesPage() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [storeFilter, setStoreFilter] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const queryClient = useQueryClient();

  // 근무일정 목록 조회
  const { data, isLoading } = useQuery({
    queryKey: ['owner-schedules', statusFilter, storeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (storeFilter) params.append('storeId', storeFilter);
      const { data } = await apiClient.get(`/owner/schedules?${params}`);
      return data;
    },
    staleTime: 10 * 1000,
  });

  // 점포 목록 조회 (필터용)
  const { data: storesData } = useQuery({
    queryKey: ['owner-stores'],
    queryFn: async () => {
      const { data } = await apiClient.get('/owner/stores');
      return data;
    },
  });

  // 승인 mutation
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

  // 거절 mutation
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">로딩 중...</p>
      </div>
    );
  }

  const { items = [], summary = {} } = data || {};

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-semibold text-slate-900">근무일정 승인</h1>
        <p className="mt-1 text-sm text-slate-500">
          직원이 등록한 근무일정을 승인하거나 거절할 수 있습니다.
        </p>
      </div>

      {/* 필터 및 통계 */}
      <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="">전체</option>
            <option value="pending">승인 대기</option>
            <option value="approved">승인됨</option>
            <option value="rejected">거절됨</option>
          </select>
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="">전체 점포</option>
            {storesData?.items?.map((store) => (
              <option key={store._id} value={store._id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-slate-500">승인 대기: </span>
            <span className="font-semibold text-amber-600">{summary.pending || 0}건</span>
          </div>
          <div>
            <span className="text-slate-500">승인됨: </span>
            <span className="font-semibold text-emerald-600">{summary.approved || 0}건</span>
          </div>
          <div>
            <span className="text-slate-500">거절됨: </span>
            <span className="font-semibold text-red-600">{summary.rejected || 0}건</span>
          </div>
        </div>
      </div>

      {/* 근무일정 목록 */}
      {items.length === 0 ? (
        <div className="rounded-3xl border border-white/60 bg-white/90 p-12 text-center shadow-sm backdrop-blur">
          <p className="text-slate-500">근무일정이 없습니다.</p>
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
                        {schedule.status === 'pending'
                          ? '승인 대기'
                          : schedule.status === 'approved'
                          ? '승인됨'
                          : '거절됨'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-900">점포:</span>{' '}
                        {schedule.storeId?.name || '알 수 없음'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">날짜:</span> {dateStr} (
                        {dayOfWeek})
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

                {/* 거절 사유 입력 모달 */}
                {rejectingId === schedule._id && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <label className="block text-sm font-semibold text-slate-900">
                      거절 사유
                    </label>
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
                        onClick={() => {
                          setRejectingId(null);
                          setRejectionReason('');
                        }}
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
    </div>
  );
}

