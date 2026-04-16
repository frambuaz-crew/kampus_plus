import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, GraduationCap, PencilLine, RefreshCw, Trash2, X } from 'lucide-react';
import {
  approveCalendarEvent,
  deleteCalendarEvent,
  getPendingCalendarEvents,
  getApprovedCalendarEvents,
  updateCalendarEvent,
  type CalendarEvent,
} from '../../services/academic';

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

interface EditFormState {
  title: string;
  event_type: CalendarEvent['event_type'];
  start_date: string;
  end_date: string;
}

export const AdminAcademicPage: React.FC = () => {
  const [pendingCalendars, setPendingCalendars] = useState<CalendarEvent[]>([]);
  const [approvedCalendars, setApprovedCalendars] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    title: '',
    event_type: 'other',
    start_date: '',
    end_date: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingData, approvedData] = await Promise.all([
        getPendingCalendarEvents(),
        getApprovedCalendarEvents(),
      ]);
      setPendingCalendars(pendingData);
      setApprovedCalendars(approvedData);
    } catch {
      setError('Akademik takvimler getirilemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const pendingCount = pendingCalendars.length;
  const approvedCount = approvedCalendars.length;
  const sortedCalendars = useMemo(
    () => [...pendingCalendars].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [pendingCalendars]
  );
  const sortedApprovedCalendars = useMemo(
    () => [...approvedCalendars].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [approvedCalendars]
  );

  const handleApprove = async (eventId: string) => {
    setProcessingId(eventId);
    try {
      await approveCalendarEvent(eventId);
      setPendingCalendars((prev) => prev.filter((item) => item.id !== eventId));
      await loadCalendarData();
    } catch {
      setError('Onaylama işlemi başarısız oldu. Lütfen tekrar deneyin.');
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

  const closeEditModal = () => {
    if (savingEdit) return;
    setEditingEvent(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || savingEdit) return;

    if (!editForm.title.trim()) {
      setError('Başlık boş bırakılamaz.');
      return;
    }

    if (!editForm.start_date) {
      setError('Başlangıç tarihi zorunludur.');
      return;
    }

    if (editForm.end_date && editForm.end_date < editForm.start_date) {
      setError('Bitiş tarihi başlangıç tarihinden önce olamaz.');
      return;
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
      await loadCalendarData();
    } catch {
      setError('Etkinlik güncellenemedi. Lütfen tekrar deneyin.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    setProcessingId(eventId);
    try {
      await deleteCalendarEvent(eventId);
      setApprovedCalendars((prev) => prev.filter((item) => item.id !== eventId));
      if (editingEvent?.id === eventId) {
        setEditingEvent(null);
      }
      await loadCalendarData();
    } catch {
      setError('Silme işlemi başarısız oldu. Lütfen tekrar deneyin.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <GraduationCap size={22} className="text-red-500" />
            <h1 className="text-2xl font-black text-white tracking-tight">Takvim Onay Paneli</h1>
          </div>
          <p className="text-sm text-gray-500">Onay bekleyen akademik takvim etkinliklerini inceleyin ve yayınlayın.</p>
        </div>

        <button
          onClick={loadCalendarData}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 text-sm font-semibold transition-colors"
        >
          <RefreshCw size={14} />
          Yenile
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            activeTab === 'pending'
              ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/20'
              : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-gray-200 hover:border-gray-700'
          }`}
        >
          Onay Bekleyenler <span className="ml-1 opacity-80">({pendingCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            activeTab === 'approved'
              ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/20'
              : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-gray-200 hover:border-gray-700'
          }`}
        >
          Onaylı Etkinlikler <span className="ml-1 opacity-80">({approvedCount})</span>
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className="text-amber-400" />
            <span className="text-sm font-semibold text-gray-300">
              {activeTab === 'pending' ? 'Onay Bekleyen Akademik Takvimler' : 'Onaylı Akademik Takvimler'}
            </span>
          </div>
          <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
            {activeTab === 'pending' ? `${pendingCount} bekliyor` : `${approvedCount} onaylı`}
          </span>
        </div>

        {loading && (
          <div className="px-6 py-12 text-center text-sm text-gray-500">Yükleniyor...</div>
        )}

        {!loading && error && (
          <div className="px-6 py-8">
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </div>
          </div>
        )}

        {!loading && !error && activeTab === 'pending' && sortedCalendars.length === 0 && (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-300">Onay bekleyen etkinlik bulunmuyor.</p>
            <p className="text-xs text-gray-500 mt-1">Tüm akademik takvim etkinlikleri güncel durumda.</p>
          </div>
        )}

        {!loading && !error && activeTab === 'approved' && sortedApprovedCalendars.length === 0 && (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-300">Onaylı etkinlik bulunmuyor.</p>
            <p className="text-xs text-gray-500 mt-1">Onaylanan takvimler burada listelenecek.</p>
          </div>
        )}

        {!loading && !error && activeTab === 'pending' && sortedCalendars.length > 0 && (
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
                {sortedCalendars.map((event) => {
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
                            type="button"
                            onClick={() => openEditModal(event)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gray-800 text-gray-200 hover:bg-gray-700 text-xs font-semibold"
                          >
                            <PencilLine size={12} />
                            Düzenle
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprove(event.id)}
                            disabled={processingId === event.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold"
                          >
                            <CheckCircle2 size={12} />
                            {processingId === event.id ? 'Onaylanıyor...' : 'Onayla'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && activeTab === 'approved' && sortedApprovedCalendars.length > 0 && (
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
                {sortedApprovedCalendars.map((event) => {
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
                            type="button"
                            onClick={() => openEditModal(event)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gray-800 text-gray-200 hover:bg-gray-700 text-xs font-semibold"
                          >
                            <PencilLine size={12} />
                            Düzenle
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(event.id)}
                            disabled={processingId === event.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 text-xs font-semibold"
                          >
                            <Trash2 size={12} />
                            {processingId === event.id ? 'Siliniyor...' : 'Sil'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-100">Takvim Etkinliği Düzenle</h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-200"
                disabled={savingEdit}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Başlık</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Etkinlik başlığı"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Tür</label>
                <select
                  value={editForm.event_type}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, event_type: e.target.value as CalendarEvent['event_type'] }))}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="exam">Sınav</option>
                  <option value="registration">Kayıt</option>
                  <option value="holiday">Tatil</option>
                  <option value="other">Diğer</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={editForm.start_date}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, start_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={editForm.end_date}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, end_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
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
