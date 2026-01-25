import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { apiClient } from '../../lib/apiClient';

const fetchScheduleDefaults = async () => {
  const { data } = await apiClient.get('/employee/work-schedule/defaults');
  return data;
};

const fetchScheduleList = async () => {
  const { data } = await apiClient.get('/employee/work-schedule');
  return data;
};

const submitSchedule = async (payload) => {
  const { data } = await apiClient.post('/work-schedule', payload);
  return data;
};

const updateSchedule = async ({ id, ...payload }) => {
  const { data } = await apiClient.put(`/work-schedule/${id}`, payload);
  return data;
};

const deleteSchedule = async (id) => {
  const { data } = await apiClient.delete(`/work-schedule/${id}`);
  return data;
};

export default function EmployeeSchedulePage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['schedule-defaults'],
    queryFn: fetchScheduleDefaults,
  });
  const {
    data: weeklySchedules,
    isLoading: listLoading,
    error: listError,
  } = useQuery({
    queryKey: ['employee-work-schedules'],
    queryFn: fetchScheduleList,
  });
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(null);

  useEffect(() => {
    if (weeklySchedules?.months?.length && !selectedMonth) {
      setSelectedMonth(weeklySchedules.months[0].id);
    }
  }, [weeklySchedules, selectedMonth]);

  useEffect(() => {
    if (!weeklySchedules?.months?.length || !selectedMonth) return;
    const month = weeklySchedules.months.find((m) => m.id === selectedMonth);
    if (!month) return;
    const hasCurrentWeek = month.weeks.some((week) => week.weekNumber === selectedWeek);
    if (!hasCurrentWeek && month.weeks.length > 0) {
      setSelectedWeek(month.weeks[0].weekNumber);
    }
  }, [weeklySchedules, selectedMonth, selectedWeek]);

  const currentMonth = useMemo(
    () => weeklySchedules?.months?.find((month) => month.id === selectedMonth),
    [weeklySchedules, selectedMonth]
  );

  const currentWeek = useMemo(() => {
    return currentMonth?.weeks?.find((week) => week.weekNumber === selectedWeek);
  }, [currentMonth, selectedWeek]);

  const [statusMessage, setStatusMessage] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      storeId: '',
      workDate: '',
      startTime: '',
      endTime: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        storeId: data.smartDefaults.storeId,
        workDate: data.smartDefaults.workDate,
        startTime: data.smartDefaults.startTime,
        endTime: data.smartDefaults.endTime,
        notes: '',
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: submitSchedule,
    onSuccess: () => {
      setStatusMessage('근무 일정이 저장되었어요.');
      queryClient.invalidateQueries({ queryKey: ['employee-work-schedules'] });
    },
    onError: () => {
      setStatusMessage('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    },
  });

  const onSubmit = (values) => {
    setStatusMessage(null);
    mutation.mutate(values);
  };

  if (isLoading || !data) {
    return (
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 text-center shadow-sm">
        스마트 초기값을 불러오는 중입니다...
      </section>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
        <header className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
            근무 일정 등록
          </p>
          <p className="text-sm text-slate-500">
            계약 정보를 기반으로 스마트 초기값이 자동으로 채워집니다.
          </p>
        </header>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Field label="근무 점포">
            <select
              {...register('storeId', { required: true })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            >
              {data.storeOptions.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="근무 날짜">
            <input
              type="date"
              {...register('workDate', { required: true })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="시작 시간">
              <input
                type="time"
                {...register('startTime', { required: true })}
                step={300}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </Field>
            <Field label="종료 시간">
              <input
                type="time"
                {...register('endTime', { required: true })}
                step={300}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </Field>
          </div>

          <Field label="메모 (선택)">
            <textarea
              rows={3}
              placeholder="특이사항이 있다면 작성해주세요."
              {...register('notes')}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </Field>

          <button
            type="submit"
            disabled={isSubmitting || mutation.isLoading}
            className="w-full rounded-2xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            {mutation.isLoading ? '저장 중...' : '근무 일정 저장'}
          </button>
        </form>

        {statusMessage && (
          <p className="mt-4 text-center text-sm text-brand-600">{statusMessage}</p>
        )}
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
        <header className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
            근무 내역 조회
          </p>
          <p className="text-sm text-slate-500">월/주차 선택 후 상세 근무를 확인하세요.</p>
        </header>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setSelectedWeek(null);
            }}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold"
          >
            {weeklySchedules?.months?.map((month) => (
              <option key={month.id} value={month.id}>
                {month.label}
              </option>
            ))}
          </select>
          <select
            value={selectedWeek ?? ''}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold"
            disabled={!currentMonth}
          >
            {currentMonth?.weeks?.map((week) => (
              <option key={week.weekNumber} value={week.weekNumber}>
                {week.label}
              </option>
            )) || <option value="">주차 없음</option>}
          </select>
        </div>

        {listLoading && (
          <p className="text-sm text-slate-500">근무 내역을 불러오는 중입니다...</p>
        )}
        {listError && (
          <p className="text-sm text-red-500">근무 내역을 불러오지 못했습니다.</p>
        )}

        {currentWeek ? (
          <>
            <p className="mb-2 text-xs font-semibold text-slate-500">{currentWeek.range}</p>
            <ul className="space-y-3">
              {currentWeek.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.dayOfWeek} {item.startTime}~{item.endTime}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.date} · {item.storeName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        item.status === 'approved'
                          ? 'text-emerald-600'
                          : item.status === 'pending'
                            ? 'text-amber-600'
                            : 'text-slate-400'
                      }`}
                    >
                      {item.status === 'approved' && '승인'}
                      {item.status === 'pending' && '대기'}
                      {item.status === 'rejected' && '반려'}
                    </span>
                    {item.status !== 'approved' && (
                      <>
                        <EditScheduleButton
                          schedule={item}
                          context={{ selectedMonth, selectedWeek }}
                          onUpdated={() =>
                            queryClient.invalidateQueries({ queryKey: ['employee-work-schedules'] })
                          }
                        />
                        <CancelScheduleButton
                          id={item.id}
                          context={{ selectedMonth, selectedWeek }}
                          onDeleted={() =>
                            queryClient.invalidateQueries({ queryKey: ['employee-work-schedules'] })
                          }
                        />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-slate-500">선택된 주차의 근무 내역이 없습니다.</p>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function EditScheduleButton({ schedule, onUpdated, context }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(schedule.startTime);
  const [end, setEnd] = useState(schedule.endTime);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      await updateSchedule({ id: schedule.id, startTime: start, endTime: end });
      // Optimistic cache update (목업 데이터이므로 서버 반영이 없어도 UI 반영)
      queryClient.setQueryData(['employee-work-schedules'], (prev) => {
        if (!prev) return prev;
        const copy = JSON.parse(JSON.stringify(prev));
        const { selectedMonth, selectedWeek } = context || {};
        const month = copy.months?.find((m) => m.id === selectedMonth);
        const week = month?.weeks?.find((w) => w.weekNumber === selectedWeek);
        const item = week?.items?.find((i) => i.id === schedule.id);
        if (item) {
          item.startTime = start;
          item.endTime = end;
        }
        return copy;
      });
      setOpen(false);
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
      >
        수정
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} />
          <div className="z-10 w-full max-w-md rounded-t-3xl bg-white p-4 shadow-lg sm:rounded-2xl">
            <h3 className="text-sm font-semibold text-slate-900">근무 시간 수정</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input
                type="time"
                step={300}
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
              <input
                type="time"
                step={300}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-2xl border border-slate-200 py-2 text-sm font-semibold text-slate-600"
              >
                닫기
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-2xl bg-brand-500 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CancelScheduleButton({ id, onDeleted, disabled, context }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try {
      await deleteSchedule(id);
      // Optimistic cache update (목업 데이터이므로 로컬 캐시에서 삭제)
      queryClient.setQueryData(['employee-work-schedules'], (prev) => {
        if (!prev) return prev;
        const copy = JSON.parse(JSON.stringify(prev));
        const { selectedMonth, selectedWeek } = context || {};
        const month = copy.months?.find((m) => m.id === selectedMonth);
        const week = month?.weeks?.find((w) => w.weekNumber === selectedWeek);
        if (week && Array.isArray(week.items)) {
          week.items = week.items.filter((i) => i.id !== id);
        }
        return copy;
      });
      onDeleted?.();
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={handle}
      disabled={disabled || loading}
      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
      title={disabled ? '승인된 근무는 취소할 수 없습니다.' : '근무 취소'}
    >
      {loading ? '취소 중...' : '취소'}
    </button>
  );
}

