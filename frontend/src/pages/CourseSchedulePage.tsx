/**
 * Course Schedule Page — Ders Programım
 *
 * Spec: 006-academic-features/spec.md
 *
 * Kullanıcının üniversitesi + bölümü otomatik kullanılır.
 * Sınıf (class_year) dropdown ile seçilir.
 * Dönem (semester) mevcut tarihe göre otomatik belirlenir.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';
import {
  getCourseSchedule,
  getSemesterInfo,
  type CourseItem,
  type CourseSchedule,
  type SemesterInfo,
} from '../api/academic';
import {
  CascadingInstitutionSelect,
  type InstitutionSelection,
} from '../components/institution/CascadingInstitutionSelect';
// institution API is handled by CascadingInstitutionSelect internally

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

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 - 20:00

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
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
  if (month >= 9) {
    return { semester: 'guz', year: `${year}-${year + 1}` };
  }
  if (month === 1) {
    return { semester: 'guz', year: `${year - 1}-${year}` };
  }
  if (month >= 2 && month <= 6) {
    return { semester: 'bahar', year: `${year - 1}-${year}` };
  }
  // Temmuz–Ağustos: bir sonraki Güz (backend ile aynı davranış)
  return { semester: 'guz', year: `${year}-${year + 1}` };
}

// ============================================================================
// COURSE DETAIL MODAL
// ============================================================================

interface CourseDetailModalProps {
  course: CourseItem;
  onClose: () => void;
}

const CourseDetailModal: React.FC<CourseDetailModalProps> = ({ course, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
            style={{ backgroundColor: course.color || '#6366f1' }}
          />
          <div>
            <h3 className="text-lg font-bold text-gray-900">{course.name}</h3>
            {course.code && <p className="text-sm text-gray-500">{course.code}</p>}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="space-y-3 text-sm">
        {course.instructor && (
          <div className="flex items-center gap-2 text-gray-700">
            <span>👨‍🏫</span>
            <span>{course.instructor}</span>
          </div>
        )}
        {course.room && (
          <div className="flex items-center gap-2 text-gray-700">
            <span>📍</span>
            <span>{course.room}</span>
          </div>
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
  schedule: CourseSchedule;
  onCourseClick: (course: CourseItem) => void;
}

const WeeklyGrid: React.FC<WeeklyGridProps> = ({ schedule, onCourseClick }) => {
  const activeDays = DAY_ORDER.filter((day) =>
    schedule.courses.some((c) => c.slots.some((s) => s.day === day))
  );
  const displayDays = activeDays.length > 0 ? activeDays : DAY_ORDER.slice(0, 5);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Header row */}
        <div
          className="grid border-b border-gray-200"
          style={{ gridTemplateColumns: `64px repeat(${displayDays.length}, 1fr)` }}
        >
          <div className="py-3" />
          {displayDays.map((day) => (
            <div key={day} className="py-3 text-center text-sm font-semibold text-gray-700">
              {DAYS_TR[day]}
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `64px repeat(${displayDays.length}, 1fr)`,
            height: `${HOURS.length * 60}px`,
          }}
        >
          {/* Time column */}
          <div className="relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full border-t border-gray-100 flex items-start justify-end pr-3"
                style={{ top: `${((hour - 8) / HOURS.length) * 100}%`, height: `${100 / HOURS.length}%` }}
              >
                <span className="text-xs text-gray-400 -mt-2">{`${hour}:00`}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {displayDays.map((day) => (
            <div key={day} className="relative border-l border-gray-100">
              {/* Hour lines */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full border-t border-gray-100"
                  style={{ top: `${((hour - 8) / HOURS.length) * 100}%` }}
                />
              ))}

              {/* Course blocks */}
              {schedule.courses.map((course, courseIdx) =>
                course.slots
                  .filter((slot) => slot.day === day)
                  .map((slot, slotIdx) => {
                    const top = minutesToTopPercent(timeToMinutes(slot.start_time));
                    const height = minutesToHeightPercent(slot.start_time, slot.end_time);
                    const color = getCourseColor(course, courseIdx);
                    return (
                      <button
                        key={`${courseIdx}-${slotIdx}`}
                        onClick={() => onCourseClick(course)}
                        className="absolute left-1 right-1 rounded-lg px-2 py-1 text-left text-white text-xs shadow-sm hover:shadow-md hover:brightness-110 transition-all overflow-hidden"
                        style={{
                          top: `${top}%`,
                          height: `${height}%`,
                          backgroundColor: color,
                          minHeight: '24px',
                        }}
                      >
                        <p className="font-semibold truncate leading-tight">{course.name}</p>
                        {course.room && (
                          <p className="opacity-80 truncate text-[10px]">{course.room}</p>
                        )}
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
  schedule: CourseSchedule;
  onCourseClick: (course: CourseItem) => void;
}

const ListView: React.FC<ListViewProps> = ({ schedule, onCourseClick }) => {
  const byDay: Record<string, Array<{ course: CourseItem; slot: CourseItem['slots'][number]; color: string }>> = {};

  schedule.courses.forEach((course, idx) => {
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

  if (orderedDays.length === 0) {
    return <p className="text-gray-500 text-center py-8">Ders bulunamadı.</p>;
  }

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
                  <p className="text-sm font-medium text-gray-700">
                    {slot.start_time} – {slot.end_time}
                  </p>
                  {course.room && (
                    <p className="text-xs text-gray-400">📍 {course.room}</p>
                  )}
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

interface EmptyStateProps {
  university: string;
  department: string;
  classYear: string;
  semesterLabel: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  university,
  department,
  classYear,
  semesterLabel,
}) => (
  <div className="text-center py-16 px-4">
    <div className="text-6xl mb-4">📭</div>
    <h2 className="text-xl font-bold text-gray-800 mb-2">Henüz Veri Yok</h2>
    <p className="text-gray-500 mb-1">
      <span className="font-medium">{university}</span>
    </p>
    <p className="text-gray-500">
      {department} • {classYear} • {semesterLabel}
    </p>
  </div>
);

// ============================================================================
// MAIN PAGE
// ============================================================================

const SEMESTERS = [
  { value: 'guz',   label: 'Güz' },
  { value: 'bahar', label: 'Bahar' },
];

function buildAcademicYears(): string[] {
  const base = getCurrentAcademicTerm().year;
  const [startStr] = base.split('-');
  const start = parseInt(startStr, 10);
  return [
    `${start - 1}-${start}`,
    `${start}-${start + 1}`,
    `${start + 1}-${start + 2}`,
  ];
}

const ACADEMIC_YEARS = buildAcademicYears();

export const CourseSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const currentTerm = getCurrentAcademicTerm();

  const [viewMode, setViewMode] = useState<'weekly' | 'list'>('weekly');
  const [semesterInfo, setSemesterInfo] = useState<SemesterInfo | null>(null);
  const [schedule, setSchedule] = useState<CourseSchedule | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);

  const [filterUniversity,   setFilterUniversity]   = useState(user?.university ?? '');
  const [selectedUniversityId, setSelectedUniversityId] = useState(user?.university_id ?? '');
  const [filterDepartment,  setFilterDepartment]  = useState(user?.department ?? '');
  const [selectedFacultyId, setSelectedFacultyId] = useState(user?.faculty_id ?? '');
  const [classYear,         setClassYear]         = useState(user?.grade || '');
  const [filterSemester,    setFilterSemester]    = useState(currentTerm.semester);
  const [academicYear,      setAcademicYear]      = useState(currentTerm.year);

  // Kullanıcı profili async yüklendiğinde eksik alanları doldur
  useEffect(() => {
    if (!user) return;
    if (user.grade) setClassYear(user.grade);
    if (user.department) setFilterDepartment((prev) => prev || user.department || '');
    if (user.faculty_id) setSelectedFacultyId((prev) => prev || user.faculty_id || '');
    if (user.university) setFilterUniversity((prev) => prev || user.university || '');
    if (user.university_id) setSelectedUniversityId((prev) => prev || user.university_id || '');
    if (semesterInfo?.semester) setFilterSemester(semesterInfo.semester);
    if (semesterInfo?.academic_year) setAcademicYear(semesterInfo.academic_year);
  }, [user, semesterInfo?.semester, semesterInfo?.academic_year]);

  // Dönem bilgisini yükle
  useEffect(() => {
    getSemesterInfo()
      .then(setSemesterInfo)
      .catch(() => {
        // Hata durumunda localStorage'dan tarih bazlı hesapla
        const month = new Date().getMonth() + 1;
        const year = new Date().getFullYear();
        const semester = month >= 9 || month === 1 ? 'guz' : month >= 2 && month <= 6 ? 'bahar' : 'guz';
        const acYear = month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
        setSemesterInfo({
          semester,
          semester_label: semester === 'guz' ? 'Güz Dönemi' : 'Bahar Dönemi',
          academic_year: acYear,
        });
      });
  }, []);

  // Ders programını yükle
  const loadSchedule = useCallback(async () => {
    if (!semesterInfo) return;
    if (!filterDepartment) {
      setSchedule(null);
      return;
    }
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
      setSchedule(data);
    } catch {
      setError('Ders programı yüklenirken hata oluştu.');
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  }, [classYear, filterSemester, academicYear, filterDepartment, filterUniversity, selectedUniversityId, semesterInfo]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const departmentName = filterDepartment || user?.department || `Bölüm #${user?.department_id}`;
  const universityName = filterUniversity || user?.university || '';

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
                {universityName} • {departmentName}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Dönem bilgisi */}
              {semesterInfo && (
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">
                  <span className="text-indigo-600">🗓️</span>
                  <div className="text-sm">
                    <p className="font-semibold text-indigo-800">{semesterInfo.semester_label}</p>
                    <p className="text-indigo-500 text-xs">{semesterInfo.academic_year}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filtre çubuğu */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            {/* Üniversite + Fakülte + Bölüm */}
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

            {/* Sınıf + Dönem + Akademik Yıl yan yana */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sınıf</label>
                <select
                  value={classYear}
                  onChange={(e) => setClassYear(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-gray-50 focus:bg-white transition-colors appearance-none cursor-pointer"
                >
                  <option value="">— Seç —</option>
                  {CLASS_YEARS.map((cy) => (
                    <option key={cy.value} value={cy.value}>{cy.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Dönem</label>
                <select
                  value={filterSemester}
                  onChange={(e) => setFilterSemester(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-gray-50 focus:bg-white transition-colors appearance-none cursor-pointer"
                >
                  <option value="">— Otomatik —</option>
                  {SEMESTERS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Akademik Yıl</label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-gray-50 focus:bg-white transition-colors appearance-none cursor-pointer"
                >
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Kontroller */}
          <div className="flex flex-wrap items-center gap-3 mb-6">

            {/* Görünüm toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 ml-auto">
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'weekly'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📅 Haftalık
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 Liste
              </button>
            </div>
          </div>

          {/* İçerik */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading && (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500 text-sm">Ders programı yükleniyor...</p>
                </div>
              </div>
            )}

            {error && !loading && (
              <div className="flex flex-col items-center py-16 gap-3">
                <span className="text-4xl">⚠️</span>
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={loadSchedule}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                >
                  Tekrar Dene
                </button>
              </div>
            )}

            {!loading && !error && schedule === null && semesterInfo && (
              <EmptyState
                university={universityName}
                department={departmentName}
                classYear={classYear}
                semesterLabel={semesterInfo.semester_label}
              />
            )}

            {!loading && !error && schedule && (
              <div className="p-4 md:p-6">
                {/* Özet bilgi */}
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                  <span className="bg-indigo-100 text-indigo-700 rounded-full px-3 py-0.5 font-medium">
                    {schedule.courses.length} ders
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>
                    {schedule.courses.reduce((acc, c) => acc + c.slots.length, 0)} ders saati / hafta
                  </span>
                </div>

                {viewMode === 'weekly' ? (
                  <WeeklyGrid schedule={schedule} onCourseClick={setSelectedCourse} />
                ) : (
                  <ListView schedule={schedule} onCourseClick={setSelectedCourse} />
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Ders detay modal */}
      {selectedCourse && (
        <CourseDetailModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
      )}

    </MainLayout>
  );
};
