import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  PencilLine,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import {
  approveCalendarEvent,
  deleteCalendarEvent,
  getPendingCalendarEvents,
  getApprovedCalendarEvents,
  updateCalendarEvent,
  type CalendarEvent,
} from '../../services/academic';

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

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export const AdminAcademicPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [calSubTab, setCalSubTab] = useState<'pending' | 'approved'>('pending');
  const [pendingCalendars, setPendingCalendars] = useState<CalendarEvent[]>([]);
  const [approvedCalendars, setApprovedCalendars] = useState<CalendarEvent[]>([]);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    title: '', event_type: 'other', start_date: '', end_date: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pc, ac] = await Promise.all([
        getPendingCalendarEvents(),
        getApprovedCalendarEvents(),
      ]);
      setPendingCalendars(pc);
      setApprovedCalendars(ac);
    } catch {
      setError('Veriler getirilemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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

  const sortedPendingCals = useMemo(
    () => [...pendingCalendars].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [pendingCalendars]
  );
  const sortedApprovedCals = useMemo(
    () => [...approvedCalendars].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [approvedCalendars]
  );

  return (
    <div>
      {/* Başlık */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <GraduationCap size={22} className="text-red-500" />
            <h1 className="text-2xl font-black text-white tracking-tight">Akademik Takvim Onay Paneli</h1>
          </div>
          <p className="text-sm text-gray-500">Onay bekleyen akademik takvim etkinliklerini inceleyin ve yayınlayın.</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 text-sm font-semibold transition-colors"
        >
          <RefreshCw size={14} />
          Yenile
        </button>
      </div>

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

      {/* Takvim Düzenleme Modal */}
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

type CalendarSortKey = 'title' | 'university' | 'event_type' | 'start_date';
type SortDirection = 'default' | 'asc' | 'desc';

const CalendarTable: React.FC<CalendarTableProps> = ({
  events, isPending, loading, error, processingId, onApprove, onDelete, onEdit,
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: CalendarSortKey; direction: SortDirection }>({
    key: 'title',
    direction: 'default',
  });

  const handleSort = (key: CalendarSortKey) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      const next: SortDirection = prev.direction === 'default' ? 'asc' : prev.direction === 'asc' ? 'desc' : 'default';
      return { key, direction: next };
    });
  };

  const renderSortIcon = (key: CalendarSortKey) => {
    if (sortConfig.key !== key || sortConfig.direction === 'default') return <ArrowUpDown size={13} className="opacity-40" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
  };

  const sortedData = useMemo(() => {
    const { key, direction } = sortConfig;
    if (direction === 'default') return events;
    return [...events].sort((a, b) => {
      let cmp = 0;
      if (key === 'title') cmp = a.title.localeCompare(b.title, 'tr');
      else if (key === 'university') cmp = a.university.localeCompare(b.university, 'tr');
      else if (key === 'event_type') cmp = a.event_type.localeCompare(b.event_type, 'tr');
      else if (key === 'start_date') cmp = a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0;
      return direction === 'asc' ? cmp : -cmp;
    });
  }, [events, sortConfig]);

  const thClass = "px-4 py-3 font-semibold cursor-pointer select-none hover:text-gray-200 transition-colors";

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
              <th className={`px-6 py-3 font-semibold cursor-pointer select-none hover:text-gray-200 transition-colors`} onClick={() => handleSort('title')}>
                <span className="inline-flex items-center gap-1.5">Etkinlik {renderSortIcon('title')}</span>
              </th>
              <th className={thClass} onClick={() => handleSort('university')}>
                <span className="inline-flex items-center gap-1.5">Üniversite {renderSortIcon('university')}</span>
              </th>
              <th className={thClass} onClick={() => handleSort('event_type')}>
                <span className="inline-flex items-center gap-1.5">Tür {renderSortIcon('event_type')}</span>
              </th>
              <th className={thClass} onClick={() => handleSort('start_date')}>
                <span className="inline-flex items-center gap-1.5">Tarih {renderSortIcon('start_date')}</span>
              </th>
              <th className="px-4 py-3 font-semibold">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((event) => {
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
