import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

export default function OwnerSchedulesPage() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [storeFilter, setStoreFilter] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ workDate: '', startTime: '', endTime: '', notes: '' });
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportingSchedules, setExportingSchedules] = useState(false);
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

  // 수정 mutation (점주 전용)
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ scheduleId, body }) => {
      const { data } = await apiClient.put(`/owner/schedules/${scheduleId}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['owner-schedules']);
      queryClient.invalidateQueries(['owner-dashboard']);
      setEditingId(null);
      setEditForm({ workDate: '', startTime: '', endTime: '', notes: '' });
    },
    onError: (err) => {
      alert(err.response?.data?.message || '수정에 실패했습니다.');
    },
  });

  // 삭제 mutation (점주 전용)
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId) => {
      const { data } = await apiClient.delete(`/owner/schedules/${scheduleId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['owner-schedules']);
      queryClient.invalidateQueries(['owner-dashboard']);
    },
    onError: (err) => {
      alert(err.response?.data?.message || '삭제에 실패했습니다.');
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

  const openEditForm = (schedule) => {
    const workDate = new Date(schedule.workDate);
    setEditForm({
      workDate: `${workDate.getFullYear()}-${String(workDate.getMonth() + 1).padStart(2, '0')}-${String(workDate.getDate()).padStart(2, '0')}`,
      startTime: schedule.startTime || '09:00',
      endTime: schedule.endTime || '18:00',
      notes: schedule.notes || '',
    });
    setEditingId(schedule._id);
  };

  const handleUpdateSchedule = () => {
    if (!editingId) return;
    if (!editForm.startTime || !editForm.endTime) {
      alert('시작·종료 시간을 입력해주세요.');
      return;
    }
    updateScheduleMutation.mutate({
      scheduleId: editingId,
      body: {
        workDate: editForm.workDate,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        notes: editForm.notes,
      },
    });
  };

  const handleDeleteSchedule = (scheduleId) => {
    if (window.confirm('이 근무일정을 삭제하시겠습니까?')) {
      deleteScheduleMutation.mutate(scheduleId);
    }
  };

  const handleExportSchedulesExcel = async () => {
    try {
      setExportingSchedules(true);
      const params = new URLSearchParams();
      params.append('year', exportYear);
      params.append('month', exportMonth);
      if (storeFilter) params.append('storeId', storeFilter);
      const { data } = await apiClient.get(`/owner/export/schedules?${params}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `근무일정_${exportYear}${String(exportMonth).padStart(2, '0')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err.response?.data?.message || 'Excel 다운로드에 실패했습니다.';
      alert(msg);
    } finally {
      setExportingSchedules(false);
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
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-touch rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700"
          >
            <option value="">전체</option>
            <option value="pending">승인 대기</option>
            <option value="approved">승인됨</option>
            <option value="rejected">거절됨</option>
          </select>
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="input-touch rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700"
          >
            <option value="">전체 점포</option>
            {storesData?.items?.map((store) => (
              <option key={store._id} value={store._id}>
                {store.name}
              </option>
            ))}
          </select>
          <span className="hidden text-sm text-slate-500 sm:inline">|</span>
          <select
            value={exportYear}
            onChange={(e) => setExportYear(Number(e.target.value))}
            className="input-touch rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700"
          >
            {[0, 1, 2].map((i) => (
              <option key={i} value={new Date().getFullYear() - i}>
                {new Date().getFullYear() - i}년
              </option>
            ))}
          </select>
          <select
            value={exportMonth}
            onChange={(e) => setExportMonth(Number(e.target.value))}
            className="input-touch rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportSchedulesExcel}
            disabled={exportingSchedules}
            className="touch-target rounded-2xl border border-emerald-500 bg-white px-4 py-3 text-base font-semibold text-emerald-700 transition active:bg-emerald-50 hover:bg-emerald-50 disabled:opacity-50"
          >
            {exportingSchedules ? '다운로드 중...' : '📥 Excel'}
          </button>
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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
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
                      <p>
                        <span className="font-semibold text-slate-900">메모:</span>{' '}
                        {schedule.notes?.trim() || '(없음)'}
                      </p>
                      {schedule.rejectionReason && (
                        <p className="text-red-600">
                          <span className="font-semibold">거절 사유:</span>{' '}
                          {schedule.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                  {schedule.status === 'pending' && (
                    <div className="flex w-full flex-row gap-2 sm:ml-4 sm:w-auto sm:flex-col">
                      <button
                        type="button"
                        onClick={() => handleApprove(schedule._id)}
                        disabled={approveMutation.isLoading}
                        className="touch-target flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-base font-semibold text-white transition active:bg-emerald-600 hover:bg-emerald-600 disabled:opacity-50 sm:flex-initial"
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectingId(schedule._id)}
                        className="touch-target flex-1 rounded-2xl bg-red-500 px-4 py-3 text-base font-semibold text-white transition active:bg-red-600 hover:bg-red-600 sm:flex-initial"
                      >
                        거절
                      </button>
                    </div>
                  )}
                  {schedule.status === 'approved' && (
                    <div className="flex w-full flex-row gap-2 sm:ml-4 sm:w-auto sm:flex-col">
                      <button
                        type="button"
                        onClick={() => openEditForm(schedule)}
                        className="touch-target flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition active:bg-slate-50 hover:bg-slate-50 sm:flex-initial"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSchedule(schedule._id)}
                        disabled={deleteScheduleMutation.isPending}
                        className="touch-target flex-1 rounded-2xl bg-red-500 px-4 py-3 text-base font-semibold text-white transition active:bg-red-600 hover:bg-red-600 disabled:opacity-50 sm:flex-initial"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>

                {/* 수정 폼 (승인된 일정) */}
                {editingId === schedule._id && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-700">근무일정 수정</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">날짜</label>
                        <input
                          type="date"
                          value={editForm.workDate}
                          onChange={(e) => setEditForm((f) => ({ ...f, workDate: e.target.value }))}
                          className="input-touch w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">시작</label>
                        <input
                          type="time"
                          value={editForm.startTime}
                          onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                          className="input-touch w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">종료</label>
                        <input
                          type="time"
                          value={editForm.endTime}
                          onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                          className="input-touch w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-slate-600">메모</label>
                        <input
                          type="text"
                          value={editForm.notes}
                          onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                          placeholder="선택"
                          className="input-touch w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={handleUpdateSchedule}
                        disabled={updateScheduleMutation.isPending}
                        className="touch-target rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition active:bg-brand-600 hover:bg-brand-600 disabled:opacity-50"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingId(null); setEditForm({ workDate: '', startTime: '', endTime: '', notes: '' }); }}
                        className="touch-target rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition active:bg-slate-50 hover:bg-slate-50"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

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
                      className="input-touch mt-2 min-h-[80px] w-full rounded-xl border border-red-200 bg-white p-3 text-base"
                      rows={3}
                    />
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleReject(schedule._id)}
                        disabled={rejectMutation.isLoading || !rejectionReason.trim()}
                        className="touch-target flex-1 rounded-xl bg-red-500 px-4 py-3 text-base font-semibold text-white transition active:bg-red-600 hover:bg-red-600 disabled:opacity-50"
                      >
                        거절하기
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectionReason('');
                        }}
                        className="touch-target flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition active:bg-slate-50 hover:bg-slate-50"
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

