import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  PencilLine,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  approveSchedule,
  deleteSchedule,
  getPendingSchedules,
  getApprovedSchedules,
  updateSchedule,
  type CourseItem,
  type CourseSchedule,
} from '../../services/academic';
import { SchedulePDFUploadModal } from '../../components/academic/SchedulePDFUploadModal';

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

export const AdminSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [schSubTab, setSchSubTab] = useState<'pending' | 'approved'>('pending');
  const [pendingSchedules, setPendingSchedules] = useState<CourseSchedule[]>([]);
  const [approvedSchedules, setApprovedSchedules] = useState<CourseSchedule[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<CourseSchedule | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ps, as_] = await Promise.all([
        getPendingSchedules(),
        getApprovedSchedules(),
      ]);
      setPendingSchedules(ps);
      setApprovedSchedules(as_);
    } catch {
      setError('Veriler getirilemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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

  return (
    <div>
      {/* Başlık */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BookOpen size={22} className="text-red-500" />
            <h1 className="text-2xl font-black text-white tracking-tight">Ders Programı Onay Paneli</h1>
          </div>
          <p className="text-sm text-gray-500">Onay bekleyen ders programlarını inceleyin ve yayınlayın.</p>
          {user?.role === 'university_admin' && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              Sadece <span className="font-bold mx-0.5">{user.university}</span> verilerini görüntülüyorsunuz
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <Upload size={14} />
            PDF Yükle
          </button>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 text-sm font-semibold transition-colors"
          >
            <RefreshCw size={14} />
            Yenile
          </button>
        </div>
      </div>

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

      {/* PDF Yükleme Modal */}
      {isUploadModalOpen && (
        <SchedulePDFUploadModal
          onClose={() => setIsUploadModalOpen(false)}
          onComplete={() => {
            setIsUploadModalOpen(false);
            loadData();
          }}
        />
      )}

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

// ─── Ders Programı Tablosu ────────────────────────────────────────────────────

const SCH_ITEMS_PER_PAGE = 10;

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

type ScheduleSortKey = 'university' | 'class_year' | 'semester' | 'academic_year' | 'courses';
type SortDirection = 'default' | 'asc' | 'desc';

const ScheduleTable: React.FC<ScheduleTableProps> = ({
  schedules, isPending, loading, error, processingId, onApprove, onDelete, onEdit,
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: ScheduleSortKey; direction: SortDirection }>({
    key: 'university', direction: 'default',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => { setCurrentPage(1); }, [schedules, searchQuery]);

  const handleSort = (key: ScheduleSortKey) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      const next: SortDirection = prev.direction === 'default' ? 'asc' : prev.direction === 'asc' ? 'desc' : 'default';
      return { key, direction: next };
    });
  };

  const renderSortIcon = (key: ScheduleSortKey) => {
    if (sortConfig.key !== key || sortConfig.direction === 'default') return <ArrowUpDown size={13} className="opacity-40" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
  };

  const sortedData = useMemo(() => {
    const { key, direction } = sortConfig;
    if (direction === 'default') return schedules;
    return [...schedules].sort((a, b) => {
      let cmp = 0;
      if (key === 'university') cmp = a.university.localeCompare(b.university, 'tr');
      else if (key === 'class_year') cmp = a.class_year.localeCompare(b.class_year, 'tr');
      else if (key === 'semester') cmp = a.semester.localeCompare(b.semester, 'tr');
      else if (key === 'academic_year') cmp = a.academic_year.localeCompare(b.academic_year, 'tr');
      else if (key === 'courses') cmp = a.courses.length - b.courses.length;
      return direction === 'asc' ? cmp : -cmp;
    });
  }, [schedules, sortConfig]);

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sortedData;
    return sortedData.filter((s) =>
      s.university.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q) ||
      s.class_year.toLowerCase().includes(q) ||
      s.semester.toLowerCase().includes(q) ||
      s.academic_year.toLowerCase().includes(q)
    );
  }, [sortedData, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / SCH_ITEMS_PER_PAGE));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * SCH_ITEMS_PER_PAGE,
    currentPage * SCH_ITEMS_PER_PAGE
  );

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
      acc.push(p);
      return acc;
    }, []);

  const thClass = "px-4 py-3 font-semibold cursor-pointer select-none hover:text-gray-200 transition-colors";

  if (loading) return <div className="px-6 py-12 text-center text-sm text-gray-500">Yükleniyor...</div>;
  if (error) return (
    <div className="px-6 py-8">
      <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
    </div>
  );

  return (
    <>
      {/* Arama Çubuğu */}
      <div className="mb-3 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Üniversite, bölüm, sınıf, dönem ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-8 py-2 rounded-lg border border-gray-700 bg-gray-900 text-sm text-gray-200 placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            <X size={13} />
          </button>
        )}
      </div>

      {schedules.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 px-6 py-12 text-center">
          <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-300">
            {isPending ? 'Onay bekleyen ders programı yok.' : 'Onaylı ders programı yok.'}
          </p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 px-6 py-12 text-center">
          <p className="text-sm text-gray-500">"{searchQuery}" için sonuç bulunamadı.</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-gray-200 transition-colors" onClick={() => handleSort('university')}>
                    <span className="inline-flex items-center gap-1.5">Üniversite / Bölüm {renderSortIcon('university')}</span>
                  </th>
                  <th className={thClass} onClick={() => handleSort('class_year')}>
                    <span className="inline-flex items-center gap-1.5">Sınıf {renderSortIcon('class_year')}</span>
                  </th>
                  <th className={thClass} onClick={() => handleSort('semester')}>
                    <span className="inline-flex items-center gap-1.5">Dönem {renderSortIcon('semester')}</span>
                  </th>
                  <th className={thClass} onClick={() => handleSort('academic_year')}>
                    <span className="inline-flex items-center gap-1.5">Yıl {renderSortIcon('academic_year')}</span>
                  </th>
                  <th className={thClass} onClick={() => handleSort('courses')}>
                    <span className="inline-flex items-center gap-1.5">Dersler {renderSortIcon('courses')}</span>
                  </th>
                  <th className="px-4 py-3 font-semibold">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((sch) => (
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
                          onClick={() => setDeleteConfirmId(sch.id)}
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

          {/* Sayfalama */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-gray-500">
                {(currentPage - 1) * SCH_ITEMS_PER_PAGE + 1}–{Math.min(currentPage * SCH_ITEMS_PER_PAGE, filteredData.length)} / {filteredData.length} kayıt
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 text-xs font-semibold"
                >
                  Önceki
                </button>
                {pageNumbers.map((item, idx) =>
                  item === '...' ? (
                    <span key={`e-${idx}`} className="px-1.5 text-xs text-gray-500">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item as number)}
                      className={`w-7 h-7 rounded-md text-xs font-semibold transition-colors ${
                        currentPage === item ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 text-xs font-semibold"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6">
            <h3 className="text-base font-bold text-gray-100 mb-2">
              {isPending ? 'Reddet ve Sil' : 'Kaydı Sil'}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Bu ders programını{' '}
              <span className="text-red-400 font-semibold">
                {isPending ? 'reddetmek ve kalıcı olarak silmek' : 'kalıcı olarak silmek'}
              </span>{' '}
              istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm font-semibold"
              >
                Vazgeç
              </button>
              <button
                onClick={() => { onDelete(deleteConfirmId); setDeleteConfirmId(null); }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 text-sm font-semibold"
              >
                {isPending ? 'Reddet ve Sil' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
