import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  GraduationCap,
  PencilLine,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  deleteCalendarEvent,
  getApprovedCalendarEvents,
  updateCalendarEvent,
  type CalendarEvent,
} from '../../services/academic';
import { CalendarPDFUploadModal } from '../../components/academic/CalendarPDFUploadModal';

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
  description: string;
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export const AdminAcademicPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [approvedCalendars, setApprovedCalendars] = useState<CalendarEvent[]>([]);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    title: '', event_type: 'other', start_date: '', end_date: '', description: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ac = await getApprovedCalendarEvents();
      setApprovedCalendars(ac);
    } catch {
      setError('Veriler getirilemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteCalendar = async (id: string) => {
    setProcessingId(id);
    try {
      await deleteCalendarEvent(id);
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
      description: event.description ?? '',
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
        description: editForm.description.trim() || null,
      });
      setEditingEvent(null);
      await loadData();
    } catch {
      setError('Güncelleme başarısız.');
    } finally {
      setSavingEdit(false);
    }
  };

  const sortedApprovedCals = useMemo(
    () => [...approvedCalendars].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [approvedCalendars]
  );

  return (
    <div>
      {/* Başlık */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <GraduationCap size={22} className="text-sky-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Akademik Takvim Yönetimi</h1>
          </div>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest text-[10px]">Akademik takvim etkinliklerini inceleyin, ekleyin ve güncelleyin.</p>
          {user?.role === 'university_admin' && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              Sadece <span className="font-bold mx-0.5">{user.university}</span> verilerini görüntülüyorsunuz
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors shadow-md shadow-sky-500/20"
          >
            <Upload size={14} />
            PDF Yükle
          </button>
        </div>
      </div>

      <CalendarTable
        events={sortedApprovedCals}
        loading={loading}
        error={error}
        processingId={processingId}
        onDelete={handleDeleteCalendar}
        onEdit={openEditModal}
        onReload={loadData}
      />

      {/* PDF Yükleme Modal */}
      {isUploadModalOpen && (
        <CalendarPDFUploadModal
          onClose={() => setIsUploadModalOpen(false)}
          onComplete={() => {
            setIsUploadModalOpen(false);
            loadData();
          }}
        />
      )}

      {/* Takvim Düzenleme Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-100 rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Takvim Etkinliği Düzenle</h2>
              <button
                type="button"
                onClick={() => { if (!savingEdit) setEditingEvent(null); }}
                className="text-slate-400 hover:text-slate-700"
                disabled={savingEdit}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCalendarEditSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Başlık</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Tür</label>
                <select
                  value={editForm.event_type}
                  onChange={(e) => setEditForm((p) => ({ ...p, event_type: e.target.value as CalendarEvent['event_type'] }))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                >
                  <option value="exam">Sınav</option>
                  <option value="registration">Kayıt</option>
                  <option value="holiday">Tatil</option>
                  <option value="other">Diğer</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Başlangıç</label>
                  <input
                    type="date"
                    value={editForm.start_date}
                    onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Bitiş</label>
                  <input
                    type="date"
                    value={editForm.end_date}
                    onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Açıklama (opsiyonel)</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 text-sm font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-60 text-sm font-semibold"
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

const CAL_ITEMS_PER_PAGE = 10;

interface CalendarTableProps {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  processingId: string | null;
  onDelete: (id: string) => void;
  onEdit: (event: CalendarEvent) => void;
  onReload: () => Promise<void>;
}

type CalendarSortKey = 'title' | 'university' | 'event_type' | 'start_date';
type SortDirection = 'default' | 'asc' | 'desc';

const CalendarTable: React.FC<CalendarTableProps> = ({
  events, loading, error, processingId, onDelete, onEdit, onReload,
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: CalendarSortKey; direction: SortDirection }>({
    key: 'title', direction: 'default',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => { setCurrentPage(1); }, [events, searchQuery]);

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

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sortedData;
    return sortedData.filter((e) =>
      e.title.toLowerCase().includes(q) ||
      e.university.toLowerCase().includes(q) ||
      typeLabel(e.event_type).toLowerCase().includes(q) ||
      e.event_type.toLowerCase().includes(q)
    );
  }, [sortedData, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / CAL_ITEMS_PER_PAGE));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * CAL_ITEMS_PER_PAGE,
    currentPage * CAL_ITEMS_PER_PAGE
  );

  const handleBulkDelete = async () => {
    if (isBulkDeleting) return;
    const ids = filteredData.map((item) => item.id);
    if (ids.length === 0) return;

    const confirmed = window.confirm(
      `Şu an listelenen ${ids.length} kaydın TÜMÜNÜ silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
    );
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      const results = await Promise.all(
        ids.map((id) =>
          deleteCalendarEvent(id)
            .then(() => ({ ok: true }))
            .catch(() => ({ ok: false }))
        )
      );

      const successCount = results.filter((r) => r.ok).length;
      const failCount = ids.length - successCount;

      if (failCount === 0) {
        window.alert(`${successCount} kayıt başarıyla silindi.`);
      } else {
        window.alert(`${successCount} kayıt silindi, ${failCount} kayıt silinemedi.`);
      }

      await onReload();
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
      acc.push(p);
      return acc;
    }, []);

  const thClass = "px-4 py-3 font-semibold cursor-pointer select-none hover:text-slate-700 transition-colors";

  if (loading) return <div className="px-6 py-12 text-center text-sm text-slate-400">Yükleniyor...</div>;
  if (error) return (
    <div className="px-6 py-8">
      <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>
    </div>
  );

  return (
    <>
      {/* Arama Çubuğu */}
      <div className="mb-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Başlık, üniversite veya tür ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>

        <button
          onClick={handleBulkDelete}
          disabled={isBulkDeleting || filteredData.length === 0}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100/70 border border-red-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold whitespace-nowrap"
        >
          <Trash2 size={14} />
          {isBulkDeleting ? 'Siliniyor...' : 'Sayfadaki Tümünü Sil'}
        </button>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100/50 shadow-xl shadow-slate-200/40 px-6 py-12 text-center">
          <CheckCircle2 size={28} className="text-green-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">
            Onaylı etkinlik yok.
          </p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100/50 shadow-xl shadow-slate-200/40 px-6 py-12 text-center">
          <p className="text-sm text-slate-400">"{searchQuery}" için sonuç bulunamadı.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100/50 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleSort('title')}>
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
                  <th className="px-4 py-3 font-semibold text-slate-400">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((event) => {
                  const rangeText = event.end_date && event.end_date !== event.start_date
                     ? `${formatDate(event.start_date)} - ${formatDate(event.end_date)}`
                    : formatDate(event.start_date);
                  return (
                    <tr key={event.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <p className="font-semibold text-slate-800 leading-snug">{event.title}</p>
                        <p className="text-xs text-slate-400 mt-1">{event.academic_year}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-600 align-top">{event.university}</td>
                      <td className="px-4 py-4 text-slate-600 align-top">{typeLabel(event.event_type)}</td>
                      <td className="px-4 py-4 text-slate-600 align-top">{rangeText}</td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => onEdit(event)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200/80 text-xs font-semibold"
                          >
                            <PencilLine size={12} /> Düzenle
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(event.id)}
                            disabled={processingId === event.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100/70 border border-red-100 disabled:opacity-50 text-xs font-semibold"
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

          {/* Sayfalama */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-slate-400">
                {(currentPage - 1) * CAL_ITEMS_PER_PAGE + 1}–{Math.min(currentPage * CAL_ITEMS_PER_PAGE, filteredData.length)} / {filteredData.length} kayıt
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 text-xs font-semibold"
                >
                  Önceki
                </button>
                {pageNumbers.map((item, idx) =>
                  item === '...' ? (
                    <span key={`e-${idx}`} className="px-1.5 text-xs text-slate-400">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item as number)}
                      className={`w-7 h-7 rounded-md text-xs font-semibold transition-colors ${
                        currentPage === item ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 text-xs font-semibold"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Silme Onay Modalı */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-slate-100 rounded-[2rem] shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Kaydı Sil
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Bu etkinliği{' '}
              <span className="text-red-600 font-semibold">
                kalıcı olarak silmek
              </span>{' '}
              istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 text-sm font-semibold"
              >
                Vazgeç
              </button>
              <button
                onClick={() => { onDelete(deleteConfirmId); setDeleteConfirmId(null); }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 text-sm font-semibold"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
