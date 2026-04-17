import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  PencilLine,
  RefreshCw,
  Trash2,
  X,
  BookOpen,
} from 'lucide-react';
import {
  approveCalendarEvent,
  approveSchedule,
  deleteCalendarEvent,
  deleteSchedule,
  getPendingCalendarEvents,
  getApprovedCalendarEvents,
  getPendingSchedules,
  getApprovedSchedules,
  updateCalendarEvent,
  updateSchedule,
  type CalendarEvent,
  type CourseItem,
  type CourseSchedule,
} from '../../services/academic';

// ─── Sabitler ────────────────────────────────────────────────────────────────

const DAYS_TR: Record<string, string> = {
  monday: 'Pazartesi',
  tuesday: 'Salı',
  wednesday: 'Çarşamba',
  thursday: 'Perşembe',
  friday: 'Cuma',
  saturday: 'Cumartesi',
};

const DAY_OPTIONS = Object.entries(DAYS_TR).map(([value, label]) => ({ value, label }));

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function typeLabel(value: CalendarEvent['event_type']): string {
  if (value === 'exam') return 'Sınav';
  if (value === 'registration') return 'Kayıt';
  if (value === 'holiday') return 'Tatil';
  return 'Diğer';
}

function formatDate(value: string): string {
  return new Date(value + 'T00:00:00').toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ─── Takvim Düzenleme Formu ───────────────────────────────────────────────────

interface EditFormState {
  title: string;
  event_type: CalendarEvent['event_type'];
  start_date: string;
  end_date: string;
}

// ─── Ders Programı Düzenleme Modal ───────────────────────────────────────────

interface ScheduleEditModalProps {
  schedule: CourseSchedule;
  onClose: () => void;
  onSaved: () => void;
}

const ScheduleEditModal: React.FC<ScheduleEditModalProps> = ({ schedule, onClose, onSaved }) => {
  const [courses, setCourses] = useState<CourseItem[]>(
    JSON.parse(JSON.stringify(schedule.courses))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCourse = (idx: number, field: keyof CourseItem, value: string) => {
    setCourses((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value || null } as CourseItem;
      return next;
    });
  };

  const updateSlot = (
    courseIdx: number,
    slotIdx: number,
    field: 'day' | 'start_time' | 'end_time',
    value: string
  ) => {
    setCourses((prev) => {
      const next = [...prev];
      const slots = [...next[courseIdx].slots];
      slots[slotIdx] = { ...slots[slotIdx], [field]: value };
      next[courseIdx] = { ...next[courseIdx], slots };
      return next;
    });
  };

  const addSlot = (courseIdx: number) => {
    setCourses((prev) => {
      const next = [...prev];
      next[courseIdx] = {
        ...next[courseIdx],
        slots: [...next[courseIdx].slots, { day: 'monday', start_time: '09:00', end_time: '10:50' }],
      };
      return next;
    });
  };

  const removeSlot = (courseIdx: number, slotIdx: number) => {
    setCourses((prev) => {
      const next = [...prev];
      const slots = next[courseIdx].slots.filter((_, i) => i !== slotIdx);
      next[courseIdx] = { ...next[courseIdx], slots };
      return next;
    });
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateSchedule(schedule.id, courses);
      onSaved();
    } catch {
      setError('Kaydetme başarısız. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900 rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-bold text-gray-100">Ders Programı Düzenle</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {schedule.university} • {schedule.department} • {schedule.class_year} • {schedule.semester}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Courses */}
        <div className="px-6 py-5 space-y-6">
          {courses.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">Ders bulunamadı.</p>
          )}

          {courses.map((course, cIdx) => (
            <div key={course.id} className="bg-gray-800 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                Ders {cIdx + 1}
              </p>

              {/* Ders bilgileri */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Ders Adı *</label>
                  <input
                    value={course.name}
                    onChange={(e) => updateCourse(cIdx, 'name', e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Öğretmen</label>
                  <input
                    value={course.instructor ?? ''}
                    onChange={(e) => updateCourse(cIdx, 'instructor', e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Derslik</label>
                  <input
                    value={course.room ?? ''}
                    onChange={(e) => updateCourse(cIdx, 'room', e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="—"
                  />
                </div>
              </div>

              {/* Slotlar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">Ders Saatleri</p>
                  <button
                    type="button"
                    onClick={() => addSlot(cIdx)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    + Saat Ekle
                  </button>
                </div>

                {course.slots.map((slot, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-2">
                    <select
                      value={slot.day}
                      onChange={(e) => updateSlot(cIdx, sIdx, 'day', e.target.value)}
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => updateSlot(cIdx, sIdx, 'start_time', e.target.value)}
                      className="w-28 rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <span className="text-gray-500 text-xs">–</span>
                    <input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => updateSlot(cIdx, sIdx, 'end_time', e.target.value)}
                      className="w-28 rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(cIdx, sIdx)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {course.slots.length === 0 && (
                  <p className="text-xs text-gray-600 italic">Saat eklenmemiş.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between gap-3 sticky bottom-0 bg-gray-900 rounded-b-2xl">
          {error && <p className="text-xs text-red-400 flex-1">{error}</p>}
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm font-semibold"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-60 text-sm font-semibold"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export const AdminAcademicPage: React.FC = () => {
  // ── Ortak ──────────────────────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState<'calendar' | 'schedules'>('calendar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // ── Takvim ─────────────────────────────────────────────────────────────────
  const [calSubTab, setCalSubTab] = useState<'pending' | 'approved'>('pending');
  const [pendingCalendars, setPendingCalendars] = useState<CalendarEvent[]>([]);
  const [approvedCalendars, setApprovedCalendars] = useState<CalendarEvent[]>([]);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    title: '', event_type: 'other', start_date: '', end_date: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // ── Ders Programları ───────────────────────────────────────────────────────
  const [schSubTab, setSchSubTab] = useState<'pending' | 'approved'>('pending');
  const [pendingSchedules, setPendingSchedules] = useState<CourseSchedule[]>([]);
  const [approvedSchedules, setApprovedSchedules] = useState<CourseSchedule[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<CourseSchedule | null>(null);

  // ── Veri yükleme ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pc, ac, ps, as_] = await Promise.all([
        getPendingCalendarEvents(),
        getApprovedCalendarEvents(),
        getPendingSchedules(),
        getApprovedSchedules(),
      ]);
      setPendingCalendars(pc);
      setApprovedCalendars(ac);
      setPendingSchedules(ps);
      setApprovedSchedules(as_);
    } catch {
      setError('Veriler getirilemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Takvim işlemleri ───────────────────────────────────────────────────────
  const handleApproveCalendar = async (id: string) => {
    setProcessingId(id);
    try {
      await approveCalendarEvent(id);
      await loadData();
    } catch {
      setError('Onaylama başarısız.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteCalendar = async (id: string) => {
    setProcessingId(id);
    try {
      await deleteCalendarEvent(id);
      setPendingCalendars((p) => p.filter((e) => e.id !== id));
      setApprovedCalendars((p) => p.filter((e) => e.id !== id));
      if (editingEvent?.id === id) setEditingEvent(null);
      await loadData();
    } catch {
      setError('Silme başarısız.');
    } finally {
      setProcessingId(null);
    }
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEditForm({
      title: event.title,
      event_type: event.event_type,
      start_date: event.start_date,
      end_date: event.end_date ?? event.start_date,
    });
  };

  const handleCalendarEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || savingEdit) return;
    if (!editForm.title.trim()) { setError('Başlık boş bırakılamaz.'); return; }
    if (!editForm.start_date) { setError('Başlangıç tarihi zorunludur.'); return; }
    if (editForm.end_date && editForm.end_date < editForm.start_date) {
      setError('Bitiş tarihi başlangıç tarihinden önce olamaz.'); return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      await updateCalendarEvent(editingEvent.id, {
        title: editForm.title.trim(),
        event_type: editForm.event_type,
        start_date: editForm.start_date,
        end_date: editForm.end_date || null,
      });
      setEditingEvent(null);
      await loadData();
    } catch {
      setError('Güncelleme başarısız.');
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Schedule işlemleri ─────────────────────────────────────────────────────
  const handleApproveSchedule = async (id: string) => {
    setProcessingId(id);
    try {
      await approveSchedule(id);
      await loadData();
    } catch {
      setError('Onaylama başarısız.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    setProcessingId(id);
    try {
      await deleteSchedule(id);
      setPendingSchedules((p) => p.filter((s) => s.id !== id));
      setApprovedSchedules((p) => p.filter((s) => s.id !== id));
      if (editingSchedule?.id === id) setEditingSchedule(null);
    } catch {
      setError('Silme başarısız.');
    } finally {
      setProcessingId(null);
    }
  };

  // ── Türetilmiş değerler ────────────────────────────────────────────────────
  const sortedPendingCals = useMemo(
    () => [...pendingCalendars].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [pendingCalendars]
  );
  const sortedApprovedCals = useMemo(
    () => [...approvedCalendars].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [approvedCalendars]
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Başlık */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <GraduationCap size={22} className="text-red-500" />
            <h1 className="text-2xl font-black text-white tracking-tight">Akademik Onay Paneli</h1>
          </div>
          <p className="text-sm text-gray-500">Onay bekleyen akademik takvim ve ders programlarını yönetin.</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 text-sm font-semibold transition-colors"
        >
          <RefreshCw size={14} />
          Yenile
        </button>
      </div>

      {/* Ana sekmeler */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMainTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            mainTab === 'calendar'
              ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/20'
              : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-gray-200 hover:border-gray-700'
          }`}
        >
          <CalendarClock size={15} />
          Akademik Takvimler
          <span className="opacity-70">({pendingCalendars.length + approvedCalendars.length})</span>
        </button>
        <button
          onClick={() => setMainTab('schedules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            mainTab === 'schedules'
              ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/20'
              : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-gray-200 hover:border-gray-700'
          }`}
        >
          <BookOpen size={15} />
          Ders Programları
          <span className="opacity-70">({pendingSchedules.length + approvedSchedules.length})</span>
        </button>
      </div>

      {/* ── AKADEMİK TAKVİMLER ───────────────────────────────────────────────── */}
      {mainTab === 'calendar' && (
        <>
          {/* Alt sekmeler */}
          <div className="flex gap-2 mb-4">
            {(['pending', 'approved'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setCalSubTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  calSubTab === tab
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300'
                }`}
              >
                {tab === 'pending' ? `Onay Bekleyenler (${pendingCalendars.length})` : `Onaylılar (${approvedCalendars.length})`}
              </button>
            ))}
          </div>

          <CalendarTable
            events={calSubTab === 'pending' ? sortedPendingCals : sortedApprovedCals}
            isPending={calSubTab === 'pending'}
            loading={loading}
            error={error}
            processingId={processingId}
            onApprove={handleApproveCalendar}
            onDelete={handleDeleteCalendar}
            onEdit={openEditModal}
          />
        </>
      )}

      {/* ── DERS PROGRAMLARI ──────────────────────────────────────────────────── */}
      {mainTab === 'schedules' && (
        <>
          {/* Alt sekmeler */}
          <div className="flex gap-2 mb-4">
            {(['pending', 'approved'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSchSubTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  schSubTab === tab
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300'
                }`}
              >
                {tab === 'pending' ? `Onay Bekleyenler (${pendingSchedules.length})` : `Onaylılar (${approvedSchedules.length})`}
              </button>
            ))}
          </div>

          <ScheduleTable
            schedules={schSubTab === 'pending' ? pendingSchedules : approvedSchedules}
            isPending={schSubTab === 'pending'}
            loading={loading}
            error={error}
            processingId={processingId}
            onApprove={handleApproveSchedule}
            onDelete={handleDeleteSchedule}
            onEdit={setEditingSchedule}
          />
        </>
      )}

      {/* ── Takvim Düzenleme Modal ────────────────────────────────────────────── */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-100">Takvim Etkinliği Düzenle</h2>
              <button
                type="button"
                onClick={() => { if (!savingEdit) setEditingEvent(null); }}
                className="text-gray-400 hover:text-gray-200"
                disabled={savingEdit}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCalendarEditSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Başlık</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Tür</label>
                <select
                  value={editForm.event_type}
                  onChange={(e) => setEditForm((p) => ({ ...p, event_type: e.target.value as CalendarEvent['event_type'] }))}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="exam">Sınav</option>
                  <option value="registration">Kayıt</option>
                  <option value="holiday">Tatil</option>
                  <option value="other">Diğer</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Başlangıç</label>
                  <input
                    type="date"
                    value={editForm.start_date}
                    onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Bitiş</label>
                  <input
                    type="date"
                    value={editForm.end_date}
                    onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-60 text-sm font-semibold"
                >
                  {savingEdit ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Ders Programı Düzenleme Modal ─────────────────────────────────────── */}
      {editingSchedule && (
        <ScheduleEditModal
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSaved={() => {
            setEditingSchedule(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

// ─── Takvim Tablosu ───────────────────────────────────────────────────────────

interface CalendarTableProps {
  events: CalendarEvent[];
  isPending: boolean;
  loading: boolean;
  error: string | null;
  processingId: string | null;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (event: CalendarEvent) => void;
}

const CalendarTable: React.FC<CalendarTableProps> = ({
  events, isPending, loading, error, processingId, onApprove, onDelete, onEdit,
}) => {
  if (loading) return <div className="px-6 py-12 text-center text-sm text-gray-500">Yükleniyor...</div>;
  if (error) return (
    <div className="px-6 py-8">
      <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
    </div>
  );
  if (events.length === 0) return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 px-6 py-12 text-center">
      <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-3" />
      <p className="text-sm font-semibold text-gray-300">
        {isPending ? 'Onay bekleyen etkinlik yok.' : 'Onaylı etkinlik yok.'}
      </p>
    </div>
  );

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-800">
              <th className="px-6 py-3 font-semibold">Etkinlik</th>
              <th className="px-4 py-3 font-semibold">Üniversite</th>
              <th className="px-4 py-3 font-semibold">Tür</th>
              <th className="px-4 py-3 font-semibold">Tarih</th>
              <th className="px-4 py-3 font-semibold">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const rangeText = event.end_date && event.end_date !== event.start_date
                ? `${formatDate(event.start_date)} - ${formatDate(event.end_date)}`
                : formatDate(event.start_date);
              return (
                <tr key={event.id} className="border-b border-gray-800/70">
                  <td className="px-6 py-4 align-top">
                    <p className="font-semibold text-gray-200 leading-snug">{event.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{event.academic_year}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-300 align-top">{event.university}</td>
                  <td className="px-4 py-4 text-gray-300 align-top">{typeLabel(event.event_type)}</td>
                  <td className="px-4 py-4 text-gray-300 align-top">{rangeText}</td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onEdit(event)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gray-800 text-gray-200 hover:bg-gray-700 text-xs font-semibold"
                      >
                        <PencilLine size={12} /> Düzenle
                      </button>
                      {isPending && (
                        <button
                          onClick={() => onApprove(event.id)}
                          disabled={processingId === event.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold"
                        >
                          <CheckCircle2 size={12} />
                          {processingId === event.id ? 'Onaylanıyor...' : 'Onayla'}
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(event.id)}
                        disabled={processingId === event.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 text-xs font-semibold"
                      >
                        <Trash2 size={12} />
                        {processingId === event.id ? 'Siliniyor...' : isPending ? 'Reddet' : 'Sil'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Ders Programı Tablosu ────────────────────────────────────────────────────

interface ScheduleTableProps {
  schedules: CourseSchedule[];
  isPending: boolean;
  loading: boolean;
  error: string | null;
  processingId: string | null;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (schedule: CourseSchedule) => void;
}

const ScheduleTable: React.FC<ScheduleTableProps> = ({
  schedules, isPending, loading, error, processingId, onApprove, onDelete, onEdit,
}) => {
  if (loading) return <div className="px-6 py-12 text-center text-sm text-gray-500">Yükleniyor...</div>;
  if (error) return (
    <div className="px-6 py-8">
      <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
    </div>
  );
  if (schedules.length === 0) return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 px-6 py-12 text-center">
      <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-3" />
      <p className="text-sm font-semibold text-gray-300">
        {isPending ? 'Onay bekleyen ders programı yok.' : 'Onaylı ders programı yok.'}
      </p>
    </div>
  );

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-800">
              <th className="px-6 py-3 font-semibold">Üniversite / Bölüm</th>
              <th className="px-4 py-3 font-semibold">Sınıf</th>
              <th className="px-4 py-3 font-semibold">Dönem</th>
              <th className="px-4 py-3 font-semibold">Yıl</th>
              <th className="px-4 py-3 font-semibold">Dersler</th>
              <th className="px-4 py-3 font-semibold">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((sch) => (
              <tr key={sch.id} className="border-b border-gray-800/70">
                <td className="px-6 py-4 align-top">
                  <p className="font-semibold text-gray-200 leading-snug">{sch.university}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{sch.department}</p>
                </td>
                <td className="px-4 py-4 text-gray-300 align-top">{sch.class_year}</td>
                <td className="px-4 py-4 text-gray-300 align-top">{sch.semester}</td>
                <td className="px-4 py-4 text-gray-300 align-top">{sch.academic_year}</td>
                <td className="px-4 py-4 align-top">
                  <span className="bg-indigo-500/10 text-indigo-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {sch.courses.length} ders
                  </span>
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onEdit(sch)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gray-800 text-gray-200 hover:bg-gray-700 text-xs font-semibold"
                    >
                      <PencilLine size={12} /> Düzenle
                    </button>
                    {isPending && (
                      <button
                        onClick={() => onApprove(sch.id)}
                        disabled={processingId === sch.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold"
                      >
                        <CheckCircle2 size={12} />
                        {processingId === sch.id ? 'Onaylanıyor...' : 'Onayla'}
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(sch.id)}
                      disabled={processingId === sch.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 text-xs font-semibold"
                    >
                      <Trash2 size={12} />
                      {processingId === sch.id ? 'Siliniyor...' : isPending ? 'Reddet' : 'Sil'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
