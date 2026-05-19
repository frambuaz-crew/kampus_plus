import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  PencilLine,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  deleteSchedule,
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

  const addCourse = () => {
    setCourses((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: '',
        code: null,
        instructor: null,
        room: null,
        color: null,
        slots: [{ day: 'monday', start_time: '09:00', end_time: '10:50' }],
      },
    ]);
  };

  const removeCourse = (courseIdx: number) => {
    setCourses((prev) => prev.filter((_, i) => i !== courseIdx));
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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white border border-slate-100 rounded-[2rem] shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900">Ders Programı Düzenle</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {schedule.university} • {schedule.department} • {schedule.class_year} • {schedule.semester}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Courses */}
        <div className="px-6 py-5 space-y-6">
          {courses.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">Ders bulunamadı.</p>
          )}

          {courses.map((course, cIdx) => (
            <div key={course.id} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Ders {cIdx + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeCourse(cIdx)}
                  title="Dersi Sil"
                  className="text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1">Ders Adı *</label>
                  <input
                    value={course.name}
                    onChange={(e) => updateCourse(cIdx, 'name', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white text-slate-800 px-3 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1">Öğretmen</label>
                  <input
                    value={course.instructor ?? ''}
                    onChange={(e) => updateCourse(cIdx, 'instructor', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white text-slate-800 px-3 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1">Derslik</label>
                  <input
                    value={course.room ?? ''}
                    onChange={(e) => updateCourse(cIdx, 'room', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white text-slate-800 px-3 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                    placeholder="—"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-450">Ders Saatleri</p>
                  <button
                    type="button"
                    onClick={() => addSlot(cIdx)}
                    className="text-xs text-sky-600 hover:text-sky-500 font-bold transition-colors"
                  >
                    + Saat Ekle
                  </button>
                </div>

                {course.slots.map((slot, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-2">
                    <select
                      value={slot.day}
                      onChange={(e) => updateSlot(cIdx, sIdx, 'day', e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white text-slate-800 px-2 py-1.5 text-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => updateSlot(cIdx, sIdx, 'start_time', e.target.value)}
                      className="w-28 rounded-lg border border-slate-200 bg-white text-slate-800 px-2 py-1.5 text-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                    />
                    <span className="text-slate-400 text-xs">–</span>
                    <input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => updateSlot(cIdx, sIdx, 'end_time', e.target.value)}
                      className="w-28 rounded-lg border border-slate-200 bg-white text-slate-800 px-2 py-1.5 text-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(cIdx, sIdx)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {course.slots.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Saat eklenmemiş.</p>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addCourse}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-200 text-slate-400 hover:border-sky-500 hover:text-sky-600 text-sm font-semibold transition-colors bg-slate-50/30 hover:bg-slate-50"
          >
            <Plus size={15} />
            Yeni Ders Ekle
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 sticky bottom-0 bg-white">
          {error && <p className="text-xs text-red-650 flex-1">{error}</p>}
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 text-sm font-semibold transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-60 text-sm font-semibold shadow-md shadow-sky-500/10 transition-colors"
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

  const [approvedSchedules, setApprovedSchedules] = useState<CourseSchedule[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<CourseSchedule | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const as_ = await getApprovedSchedules();
      setApprovedSchedules(as_);
    } catch {
      setError('Veriler getirilemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteSchedule = async (id: string) => {
    setProcessingId(id);
    try {
      await deleteSchedule(id);
      setApprovedSchedules((p) => p.filter((s) => s.id !== id));
      if (editingSchedule?.id === id) setEditingSchedule(null);
      await loadData();
    } catch {
      setError('Silme başarısız.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div>
      {/* Başlık */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BookOpen size={22} className="text-sky-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ders Programı Yönetimi</h1>
          </div>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest text-[10px]">Ders programlarını inceleyin, ekleyin ve güncelleyin.</p>
          {user?.role === 'university_admin' && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-55 text-amber-600 border border-amber-200 text-xs font-medium">
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

      <ScheduleTable
        schedules={approvedSchedules}
        loading={loading}
        error={error}
        processingId={processingId}
        onDelete={handleDeleteSchedule}
        onEdit={setEditingSchedule}
        onReload={loadData}
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
  loading: boolean;
  error: string | null;
  processingId: string | null;
  onDelete: (id: string) => void;
  onEdit: (schedule: CourseSchedule) => void;
  onReload: () => Promise<void>;
}

type ScheduleSortKey = 'university' | 'class_year' | 'semester' | 'academic_year' | 'courses';
type SortDirection = 'default' | 'asc' | 'desc';

const ScheduleTable: React.FC<ScheduleTableProps> = ({
  schedules, loading, error, processingId, onDelete, onEdit, onReload,
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: ScheduleSortKey; direction: SortDirection }>({
    key: 'university', direction: 'default',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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
          deleteSchedule(id)
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
            placeholder="Üniversite, bölüm, sınıf, dönem ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650">
              <X size={13} />
            </button>
          )}
        </div>

        <button
          onClick={handleBulkDelete}
          disabled={isBulkDeleting || filteredData.length === 0}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-55 text-red-600 hover:bg-red-100/70 border border-red-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold whitespace-nowrap"
        >
          <Trash2 size={14} />
          {isBulkDeleting ? 'Siliniyor...' : 'Sayfadaki Tümünü Sil'}
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100/50 shadow-xl shadow-slate-200/40 px-6 py-12 text-center">
          <CheckCircle2 size={28} className="text-green-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">
            Onaylı ders programı yok.
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
                  <th className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleSort('university')}>
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
                  <th className="px-4 py-3 font-semibold text-slate-400">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((sch) => (
                  <tr key={sch.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <p className="font-semibold text-slate-800 leading-snug">{sch.university}</p>
                      <p className="text-xs text-slate-450 mt-0.5">{sch.department}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-650 align-top">{sch.class_year}</td>
                    <td className="px-4 py-4 text-slate-650 align-top">{sch.semester}</td>
                    <td className="px-4 py-4 text-slate-650 align-top">{sch.academic_year}</td>
                    <td className="px-4 py-4 align-top">
                      <span className="bg-sky-50 text-sky-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {sch.courses.length} ders
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => onEdit(sch)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200/80 text-xs font-semibold transition-colors"
                        >
                          <PencilLine size={12} /> Düzenle
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(sch.id)}
                          disabled={processingId === sch.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-55 text-red-655 hover:bg-red-100/70 border border-red-100 disabled:opacity-50 text-xs font-semibold transition-colors"
                        >
                          <Trash2 size={12} />
                          {processingId === sch.id ? 'Siliniyor...' : 'Sil'}
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
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-slate-400">
                {(currentPage - 1) * SCH_ITEMS_PER_PAGE + 1}–{Math.min(currentPage * SCH_ITEMS_PER_PAGE, filteredData.length)} / {filteredData.length} kayıt
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 text-xs font-semibold transition-colors"
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
                  className="px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 text-xs font-semibold transition-colors"
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
              Bu ders programını{' '}
              <span className="text-red-650 font-semibold">
                kalıcı olarak silmek
              </span>{' '}
              istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 text-sm font-semibold transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={() => { onDelete(deleteConfirmId); setDeleteConfirmId(null); }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-semibold transition-colors"
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
