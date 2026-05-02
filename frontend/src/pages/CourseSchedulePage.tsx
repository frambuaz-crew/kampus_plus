/**
 * Course Schedule Page — Ders Programım
 *
 * Spec: 006-academic-features/spec.md
 *
 * State 1 (kişisel program yok): resmi programı bul, "Baz Al" butonu göster.
 * State 2 (kişisel program var): kişisel programı göster, düzenle, kaydet.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';
import {
  cloneToMySchedule,
  getCourseSchedule,
  getMySchedule,
  getSemesterInfo,
  updateMySchedule,
  type CourseItem,
  type CourseSchedule,
  type PersonalSchedule,
  type SemesterInfo,
} from '../api/academic';
import {
  CascadingInstitutionSelect,
} from '../components/institution/CascadingInstitutionSelect';
import { Plus, Trash2, X } from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================

const CLASS_YEARS = [
  { value: '1', label: '1. Sınıf' },
  { value: '2', label: '2. Sınıf' },
  { value: '3', label: '3. Sınıf' },
  { value: '4', label: '4. Sınıf' },
  { value: '5', label: '5. Sınıf' },
];

const DAYS_TR: Record<string, string> = {
  monday: 'Pazartesi',
  tuesday: 'Salı',
  wednesday: 'Çarşamba',
  thursday: 'Perşembe',
  friday: 'Cuma',
  saturday: 'Cumartesi',
};

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_OPTIONS = DAY_ORDER.map((v) => ({ value: v, label: DAYS_TR[v] }));

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00–20:00

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
];

const SEMESTERS = [
  { value: 'guz', label: 'Güz' },
  { value: 'bahar', label: 'Bahar' },
];

// ============================================================================
// HELPERS
// ============================================================================

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTopPercent(minutes: number, startHour = 8, totalHours = 13): number {
  return ((minutes - startHour * 60) / (totalHours * 60)) * 100;
}

function minutesToHeightPercent(start: string, end: string, totalHours = 13): number {
  const duration = timeToMinutes(end) - timeToMinutes(start);
  return (duration / (totalHours * 60)) * 100;
}

function getCourseColor(course: CourseItem, index: number): string {
  return course.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

function getCurrentAcademicTerm(): { semester: 'guz' | 'bahar'; year: string } {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  if (month >= 9) return { semester: 'guz', year: `${year}-${year + 1}` };
  if (month === 1) return { semester: 'guz', year: `${year - 1}-${year}` };
  if (month >= 2 && month <= 6) return { semester: 'bahar', year: `${year - 1}-${year}` };
  return { semester: 'guz', year: `${year}-${year + 1}` };
}

function buildAcademicYears(): string[] {
  const base = getCurrentAcademicTerm().year;
  const [startStr] = base.split('-');
  const start = parseInt(startStr, 10);
  return [`${start - 1}-${start}`, `${start}-${start + 1}`, `${start + 1}-${start + 2}`];
}

const ACADEMIC_YEARS = buildAcademicYears();

// ============================================================================
// COURSE DETAIL MODAL
// ============================================================================

interface CourseDetailModalProps {
  course: CourseItem;
  onClose: () => void;
}

const CourseDetailModal: React.FC<CourseDetailModalProps> = ({ course, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: course.color || '#6366f1' }} />
          <div>
            <h3 className="text-lg font-bold text-gray-900">{course.name}</h3>
            {course.code && <p className="text-sm text-gray-500">{course.code}</p>}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
      </div>
      <div className="space-y-3 text-sm">
        {course.instructor && (
          <div className="flex items-center gap-2 text-gray-700"><span>👨‍🏫</span><span>{course.instructor}</span></div>
        )}
        {course.room && (
          <div className="flex items-center gap-2 text-gray-700"><span>📍</span><span>{course.room}</span></div>
        )}
        {course.slots.length > 0 && (
          <div className="mt-4">
            <p className="font-semibold text-gray-800 mb-2">Ders Saatleri</p>
            <div className="space-y-2">
              {course.slots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  <span>📅</span>
                  <span className="font-medium">{DAYS_TR[slot.day] || slot.day}</span>
                  <span className="text-gray-400">•</span>
                  <span>⏰ {slot.start_time} – {slot.end_time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

// ============================================================================
// WEEKLY GRID VIEW
// ============================================================================

interface WeeklyGridProps {
  courses: CourseItem[];
  onCourseClick: (course: CourseItem) => void;
}

const WeeklyGrid: React.FC<WeeklyGridProps> = ({ courses, onCourseClick }) => {
  const activeDays = DAY_ORDER.filter((day) => courses.some((c) => c.slots.some((s) => s.day === day)));
  const displayDays = activeDays.length > 0 ? activeDays : DAY_ORDER.slice(0, 5);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: `64px repeat(${displayDays.length}, 1fr)` }}>
          <div className="py-3" />
          {displayDays.map((day) => (
            <div key={day} className="py-3 text-center text-sm font-semibold text-gray-700">{DAYS_TR[day]}</div>
          ))}
        </div>
        <div className="relative grid" style={{ gridTemplateColumns: `64px repeat(${displayDays.length}, 1fr)`, height: `${HOURS.length * 60}px` }}>
          <div className="relative">
            {HOURS.map((hour) => (
              <div key={hour} className="absolute w-full border-t border-gray-100 flex items-start justify-end pr-3" style={{ top: `${((hour - 8) / HOURS.length) * 100}%`, height: `${100 / HOURS.length}%` }}>
                <span className="text-xs text-gray-400 -mt-2">{`${hour}:00`}</span>
              </div>
            ))}
          </div>
          {displayDays.map((day) => (
            <div key={day} className="relative border-l border-gray-100">
              {HOURS.map((hour) => (
                <div key={hour} className="absolute w-full border-t border-gray-100" style={{ top: `${((hour - 8) / HOURS.length) * 100}%` }} />
              ))}
              {courses.map((course, courseIdx) =>
                course.slots.filter((slot) => slot.day === day).map((slot, slotIdx) => {
                  const top = minutesToTopPercent(timeToMinutes(slot.start_time));
                  const height = minutesToHeightPercent(slot.start_time, slot.end_time);
                  const color = getCourseColor(course, courseIdx);
                  return (
                    <button
                      key={`${courseIdx}-${slotIdx}`}
                      onClick={() => onCourseClick(course)}
                      className="absolute left-1 right-1 rounded-lg px-2 py-1 text-left text-white text-xs shadow-sm hover:shadow-md hover:brightness-110 transition-all overflow-hidden"
                      style={{ top: `${top}%`, height: `${height}%`, backgroundColor: color, minHeight: '24px' }}
                    >
                      <p className="font-semibold truncate leading-tight">{course.name}</p>
                      {course.room && <p className="opacity-80 truncate text-[10px]">{course.room}</p>}
                    </button>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// LIST VIEW
// ============================================================================

interface ListViewProps {
  courses: CourseItem[];
  onCourseClick: (course: CourseItem) => void;
}

const ListView: React.FC<ListViewProps> = ({ courses, onCourseClick }) => {
  const byDay: Record<string, Array<{ course: CourseItem; slot: CourseItem['slots'][number]; color: string }>> = {};

  courses.forEach((course, idx) => {
    const color = getCourseColor(course, idx);
    course.slots.forEach((slot) => {
      if (!byDay[slot.day]) byDay[slot.day] = [];
      byDay[slot.day].push({ course, slot, color });
    });
  });

  Object.values(byDay).forEach((items) =>
    items.sort((a, b) => timeToMinutes(a.slot.start_time) - timeToMinutes(b.slot.start_time))
  );

  const orderedDays = DAY_ORDER.filter((d) => byDay[d]?.length > 0);
  if (orderedDays.length === 0) return <p className="text-gray-500 text-center py-8">Ders bulunamadı.</p>;

  return (
    <div className="space-y-6">
      {orderedDays.map((day) => (
        <div key={day}>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span>📅</span> {DAYS_TR[day]}
          </h3>
          <div className="space-y-2">
            {byDay[day].map(({ course, slot, color }, i) => (
              <button
                key={i}
                onClick={() => onCourseClick(course)}
                className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-indigo-300 hover:shadow-sm transition-all text-left"
              >
                <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{course.name}</p>
                  {course.code && <p className="text-xs text-gray-400">{course.code}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-gray-700">{slot.start_time} – {slot.end_time}</p>
                  {course.room && <p className="text-xs text-gray-400">📍 {course.room}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// EMPTY STATE
// ============================================================================

const EmptyState: React.FC<{ university: string; department: string; classYear: string; semesterLabel: string }> = ({
  university, department, classYear, semesterLabel,
}) => (
  <div className="text-center py-16 px-4">
    <div className="text-6xl mb-4">📭</div>
    <h2 className="text-xl font-bold text-gray-800 mb-2">Henüz Veri Yok</h2>
    <p className="text-gray-500 mb-1"><span className="font-medium">{university}</span></p>
    <p className="text-gray-500">{department} • {classYear} • {semesterLabel}</p>
  </div>
);

// ============================================================================
// PERSONAL SCHEDULE EDIT MODAL
// ============================================================================

interface PersonalEditModalProps {
  initialCourses: CourseItem[];
  onClose: () => void;
  onSave: (courses: CourseItem[]) => Promise<void>;
}

const PersonalEditModal: React.FC<PersonalEditModalProps> = ({ initialCourses, onClose, onSave }) => {
  const [courses, setCourses] = useState<CourseItem[]>(JSON.parse(JSON.stringify(initialCourses)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCourse = (idx: number, field: keyof CourseItem, value: string) => {
    setCourses((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value || null } as CourseItem;
      return next;
    });
  };

  const updateSlot = (courseIdx: number, slotIdx: number, field: 'day' | 'start_time' | 'end_time', value: string) => {
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
      next[courseIdx] = { ...next[courseIdx], slots: next[courseIdx].slots.filter((_, i) => i !== slotIdx) };
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
      await onSave(courses);
    } catch {
      setError('Kaydetme başarısız. Lütfen tekrar deneyin.');
      setSaving(false);
    }
  };

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-900 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-2xl shadow-2xl my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900">Programımı Düzenle</h2>
            <p className="text-xs text-gray-400 mt-0.5">Dersleri ekleyin, düzenleyin veya silin</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Courses */}
        <div className="px-6 py-5 space-y-5">
          {courses.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Henüz ders eklenmemiş.</p>
          )}

          {courses.map((course, cIdx) => (
            <div key={course.id} className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ders {cIdx + 1}</p>
                <button
                  type="button"
                  onClick={() => removeCourse(cIdx)}
                  title="Dersi Sil"
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ders Adı *</label>
                  <input value={course.name} onChange={(e) => updateCourse(cIdx, 'name', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Öğretmen</label>
                  <input value={course.instructor ?? ''} onChange={(e) => updateCourse(cIdx, 'instructor', e.target.value)} className={inputCls} placeholder="—" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Derslik</label>
                  <input value={course.room ?? ''} onChange={(e) => updateCourse(cIdx, 'room', e.target.value)} className={inputCls} placeholder="—" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">Ders Saatleri</p>
                  <button type="button" onClick={() => addSlot(cIdx)} className="text-xs text-indigo-600 hover:text-indigo-500 font-semibold">
                    + Saat Ekle
                  </button>
                </div>

                {course.slots.map((slot, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-2">
                    <select
                      value={slot.day}
                      onChange={(e) => updateSlot(cIdx, sIdx, 'day', e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 bg-white text-gray-900 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                    >
                      {DAY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                    <input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => updateSlot(cIdx, sIdx, 'start_time', e.target.value)}
                      className="w-28 rounded-lg border border-gray-200 bg-white text-gray-900 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-gray-400 text-xs">–</span>
                    <input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => updateSlot(cIdx, sIdx, 'end_time', e.target.value)}
                      className="w-28 rounded-lg border border-gray-200 bg-white text-gray-900 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button type="button" onClick={() => removeSlot(cIdx, sIdx)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {course.slots.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Saat eklenmemiş.</p>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addCourse}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-200 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 text-sm font-semibold transition-colors"
          >
            <Plus size={15} />
            Yeni Ders Ekle
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 sticky bottom-0 bg-white rounded-b-2xl">
          {error && <p className="text-xs text-red-500 flex-1">{error}</p>}
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-semibold"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 text-sm font-semibold"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PAGE
// ============================================================================

export const CourseSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const currentTerm = getCurrentAcademicTerm();

  // ── Kişisel program state ─────────────────────────────────────────────────
  // undefined = yükleniyor, null = yok, object = mevcut
  const [personalSchedule, setPersonalSchedule] = useState<PersonalSchedule | null | undefined>(undefined);
  const [personalLoading, setPersonalLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);
  // State 2'de dropdownları göster/gizle
  const [showDropdowns, setShowDropdowns] = useState(false);

  // ── Resmi program arama state ─────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'weekly' | 'list'>('weekly');
  const [semesterInfo, setSemesterInfo] = useState<SemesterInfo | null>(null);
  const [officialSchedule, setOfficialSchedule] = useState<CourseSchedule | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);

  const [filterUniversity, setFilterUniversity] = useState(user?.university ?? '');
  const [selectedUniversityId, setSelectedUniversityId] = useState(user?.university_id ?? '');
  const [filterDepartment, setFilterDepartment] = useState(user?.department ?? '');
  const [selectedFacultyId, setSelectedFacultyId] = useState(user?.faculty_id ?? '');
  const [classYear, setClassYear] = useState(user?.grade || '');
  const [filterSemester, setFilterSemester] = useState(currentTerm.semester);
  const [academicYear, setAcademicYear] = useState(currentTerm.year);

  // ── Kişisel programı yükle ────────────────────────────────────────────────
  useEffect(() => {
    getMySchedule()
      .then((ps) => setPersonalSchedule(ps))
      .catch(() => setPersonalSchedule(null))
      .finally(() => setPersonalLoading(false));
  }, []);

  // ── Kullanıcı profili async dolduğunda eksikleri tamamla ──────────────────
  useEffect(() => {
    if (!user) return;
    if (user.grade) setClassYear(user.grade);
    if (user.department) setFilterDepartment((p) => p || user.department || '');
    if (user.faculty_id) setSelectedFacultyId((p) => p || user.faculty_id || '');
    if (user.university) setFilterUniversity((p) => p || user.university || '');
    if (user.university_id) setSelectedUniversityId((p) => p || user.university_id || '');
    if (semesterInfo?.semester) setFilterSemester(semesterInfo.semester);
    if (semesterInfo?.academic_year) setAcademicYear(semesterInfo.academic_year);
  }, [user, semesterInfo?.semester, semesterInfo?.academic_year]);

  // ── Dönem bilgisini yükle ─────────────────────────────────────────────────
  useEffect(() => {
    getSemesterInfo()
      .then(setSemesterInfo)
      .catch(() => {
        const month = new Date().getMonth() + 1;
        const year = new Date().getFullYear();
        const semester = month >= 9 || month === 1 ? 'guz' : month >= 2 && month <= 6 ? 'bahar' : 'guz';
        const acYear = month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
        setSemesterInfo({ semester, semester_label: semester === 'guz' ? 'Güz Dönemi' : 'Bahar Dönemi', academic_year: acYear });
      });
  }, []);

  // ── Resmi ders programını yükle ───────────────────────────────────────────
  const loadOfficialSchedule = useCallback(async () => {
    if (!semesterInfo) return;
    if (!filterDepartment) { setOfficialSchedule(null); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await getCourseSchedule({
        class_year: classYear,
        semester: filterSemester || semesterInfo.semester,
        academic_year: academicYear,
        department: filterDepartment,
        university_id: selectedUniversityId || undefined,
      });
      setOfficialSchedule(data);
    } catch {
      setError('Ders programı yüklenirken hata oluştu.');
      setOfficialSchedule(null);
    } finally {
      setLoading(false);
    }
  }, [classYear, filterSemester, academicYear, filterDepartment, selectedUniversityId, semesterInfo]);

  // Dropdownlar açıkken veya kişisel program yokken resmi programı yükle
  useEffect(() => {
    if (personalSchedule === null || showDropdowns) {
      loadOfficialSchedule();
    }
  }, [loadOfficialSchedule, personalSchedule, showDropdowns]);

  // ── Baz al & kişisel program oluştur ─────────────────────────────────────
  const handleClone = async () => {
    if (!officialSchedule || cloning) return;
    setCloning(true);
    setCloneError(null);
    try {
      const ps = await cloneToMySchedule(officialSchedule.id);
      setPersonalSchedule(ps);
      setShowDropdowns(false);
    } catch {
      setCloneError('Program kopyalanamadı. Lütfen tekrar deneyin.');
    } finally {
      setCloning(false);
    }
  };

  // ── Kişisel program kaydet ────────────────────────────────────────────────
  const handleSavePersonal = async (courses: CourseItem[]) => {
    const updated = await updateMySchedule(courses);
    setPersonalSchedule(updated);
    setIsEditModalOpen(false);
  };

  const departmentName = filterDepartment || user?.department || '';
  const universityName = filterUniversity || user?.university || '';

  // ── Hâlâ yükleniyor ───────────────────────────────────────────────────────
  if (personalLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Yükleniyor...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ── Görüntülenecek dersler ────────────────────────────────────────────────
  const displayCourses: CourseItem[] = personalSchedule ? personalSchedule.courses : (officialSchedule?.courses ?? []);
  const hasDisplayData = displayCourses.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="w-full px-4 md:px-8 xl:px-16 py-8">
        <div className="max-w-[1400px] mx-auto">

          {/* Başlık */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span>📅</span> Ders Programım
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {universityName && `${universityName} • `}{departmentName}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {semesterInfo && (
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">
                  <span className="text-indigo-600">🗓️</span>
                  <div className="text-sm">
                    <p className="font-semibold text-indigo-800">{semesterInfo.semester_label}</p>
                    <p className="text-indigo-500 text-xs">{semesterInfo.academic_year}</p>
                  </div>
                </div>
              )}

              {/* State 2: kişisel program butonları */}
              {personalSchedule && (
                <>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors shadow-sm"
                  >
                    ✏️ Programımı Düzenle
                  </button>
                  <button
                    onClick={() => setShowDropdowns((v) => !v)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    🔄 {showDropdowns ? 'Kapat' : 'Programı Değiştir'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* State 1 veya "Programı Değiştir" açıkken: Filtre çubuğu */}
          {(personalSchedule === null || showDropdowns) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
              {showDropdowns && personalSchedule && (
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Yeni bir resmi programı baz almak için aşağıdan seçin:
                </p>
              )}
              <CascadingInstitutionSelect
                showDepartment
                initialUniversityId={selectedUniversityId}
                initialFacultyId={selectedFacultyId}
                initialDepartmentId={user?.department_id ?? ''}
                onChange={(sel) => {
                  if (sel.universityId !== undefined) setSelectedUniversityId(sel.universityId);
                  if (sel.universityName !== undefined) setFilterUniversity(sel.universityName);
                  if (sel.facultyId !== undefined) setSelectedFacultyId(sel.facultyId);
                  if (sel.departmentName !== undefined) setFilterDepartment(sel.departmentName);
                }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Sınıf</label>
                  <select value={classYear} onChange={(e) => setClassYear(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white appearance-none cursor-pointer">
                    <option value="">— Seç —</option>
                    {CLASS_YEARS.map((cy) => <option key={cy.value} value={cy.value}>{cy.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Dönem</label>
                  <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white appearance-none cursor-pointer">
                    <option value="">— Otomatik —</option>
                    {SEMESTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Akademik Yıl</label>
                  <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white appearance-none cursor-pointer">
                    {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* "Baz Al" aksiyonu — resmi program bulununca göster */}
          {(personalSchedule === null || showDropdowns) && officialSchedule && !loading && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-indigo-900">
                  {officialSchedule.university} — {officialSchedule.department} {officialSchedule.class_year} ({officialSchedule.semester})
                </p>
                <p className="text-xs text-indigo-600 mt-0.5">
                  {officialSchedule.courses.length} ders bulundu. Bu programı kişisel programın olarak al ve özelleştir.
                </p>
                {cloneError && <p className="text-xs text-red-500 mt-1">{cloneError}</p>}
              </div>
              <button
                onClick={handleClone}
                disabled={cloning}
                className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 disabled:opacity-60 transition-colors shadow-sm"
              >
                {cloning ? 'Kopyalanıyor...' : '✨ Bu Programı Baz Al ve Özelleştir'}
              </button>
            </div>
          )}

          {/* Görünüm toggle — sadece veri varsa */}
          {(hasDisplayData || personalSchedule) && (
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {personalSchedule && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                  <span>✅</span>
                  <span className="font-medium">Kişisel programınız aktif</span>
                </div>
              )}
              <div className="flex items-center bg-gray-100 rounded-lg p-1 ml-auto">
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'weekly' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  📅 Haftalık
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  📋 Liste
                </button>
              </div>
            </div>
          )}

          {/* İçerik */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {(loading && !personalSchedule) && (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500 text-sm">Ders programı yükleniyor...</p>
                </div>
              </div>
            )}

            {error && !loading && !personalSchedule && (
              <div className="flex flex-col items-center py-16 gap-3">
                <span className="text-4xl">⚠️</span>
                <p className="text-red-600 font-medium">{error}</p>
                <button onClick={loadOfficialSchedule} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
                  Tekrar Dene
                </button>
              </div>
            )}

            {/* Kişisel program yok + resmi bulunamadı */}
            {!personalSchedule && !loading && !error && officialSchedule === null && semesterInfo && (
              <EmptyState
                university={universityName}
                department={departmentName}
                classYear={classYear}
                semesterLabel={semesterInfo.semester_label}
              />
            )}

            {/* İlk yükleme bekleniyor */}
            {!personalSchedule && officialSchedule === undefined && !loading && (
              <div className="py-16 text-center">
                <p className="text-gray-400 text-sm">Ders programı aramak için yukarıdan sınıf ve dönem seçin.</p>
              </div>
            )}

            {/* Program göster */}
            {hasDisplayData && !(loading && !personalSchedule) && (
              <div className="p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                  <span className="bg-indigo-100 text-indigo-700 rounded-full px-3 py-0.5 font-medium">
                    {displayCourses.length} ders
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>{displayCourses.reduce((acc, c) => acc + c.slots.length, 0)} ders saati / hafta</span>
                </div>

                {viewMode === 'weekly' ? (
                  <WeeklyGrid courses={displayCourses} onCourseClick={setSelectedCourse} />
                ) : (
                  <ListView courses={displayCourses} onCourseClick={setSelectedCourse} />
                )}
              </div>
            )}

            {/* Kişisel program var ama boş */}
            {personalSchedule && displayCourses.length === 0 && (
              <div className="py-16 text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-gray-500 font-medium mb-2">Kişisel programınızda henüz ders yok.</p>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500"
                >
                  <Plus size={15} /> Ders Ekle
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Ders detay modal */}
      {selectedCourse && (
        <CourseDetailModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
      )}

      {/* Kişisel program düzenleme modal */}
      {isEditModalOpen && personalSchedule && (
        <PersonalEditModal
          initialCourses={personalSchedule.courses}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSavePersonal}
        />
      )}
    </MainLayout>
  );
};
