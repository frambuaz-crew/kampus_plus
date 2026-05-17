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
import { 
  Plus, 
  Trash2, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Settings2, 
  Layout, 
  List, 
  Info,
  Calendar as CalendarIcon,
  Search,
  Clock,
  MapPin,
  User as UserIcon
} from 'lucide-react';

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

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 08:00–23:00

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

function minutesToTopPercent(minutes: number, startHour = 8, totalHours = HOURS.length): number {
  return ((minutes - startHour * 60) / (totalHours * 60)) * 100;
}

function minutesToHeightPercent(start: string, end: string, totalHours = HOURS.length): number {
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

/**
 * Normalizes grade value from "3. Sınıf" or "3" to "3"
 */
function normalizeGrade(grade: string | null | undefined): string {
  if (!grade) return '';
  const match = grade.match(/\d+/);
  return match ? match[0] : '';
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
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-fade-in">
    <div className="glass-card rounded-[2.5rem] w-full max-w-md overflow-hidden animate-slide-up">
      <div className="px-8 py-6 border-b border-white/20 bg-white/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/10" 
            style={{ backgroundColor: course.color || '#6366f1' }}
          >
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">{course.name}</h3>
            {course.code && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{course.code}</p>}
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="w-8 h-8 rounded-full bg-slate-100/50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {course.instructor && (
            <div className="p-4 bg-white/40 rounded-2xl border border-white/40">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Eğitmen</p>
              <div className="flex items-center gap-2 text-slate-700">
                <UserIcon className="w-3 h-3 text-sky-500" />
                <span className="text-sm font-bold">{course.instructor}</span>
              </div>
            </div>
          )}
          {course.room && (
            <div className="p-4 bg-white/40 rounded-2xl border border-white/40">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Derslik</p>
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="w-3 h-3 text-indigo-500" />
                <span className="text-sm font-bold">{course.room}</span>
              </div>
            </div>
          )}
        </div>

        {course.slots.length > 0 && (
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Ders Saatleri</p>
            <div className="space-y-2">
              {course.slots.map((slot, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-white/60 group hover:border-sky-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-sky-600" />
                    </div>
                    <span className="text-sm font-black text-slate-700">{DAYS_TR[slot.day] || slot.day}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-500">{slot.start_time} – {slot.end_time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="px-8 py-4 bg-slate-50/50 border-t border-white/20 flex justify-end">
        <button 
          onClick={onClose}
          className="px-6 py-2 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
        >
          Kapat
        </button>
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
    <div className="overflow-x-auto no-scrollbar">
      {/* Mobile scroll hint */}
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-4 pt-3 md:hidden flex items-center gap-1">
        <span>←→</span> Kaydırarak görüntüle
      </p>
      <div className="min-w-[640px] p-4 sm:p-6">
        <div className="grid mb-4" style={{ gridTemplateColumns: `80px repeat(${displayDays.length}, 1fr)` }}>
          <div className="py-3" />
          {displayDays.map((day) => (
            <div key={day} className="py-3 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{DAYS_TR[day].substring(0, 3)}</p>
              <p className="text-sm font-black text-slate-900">{DAYS_TR[day]}</p>
            </div>
          ))}
        </div>
        
        <div className="relative grid rounded-3xl overflow-hidden border border-slate-200/60 bg-white/30 backdrop-blur-sm" style={{ gridTemplateColumns: `80px repeat(${displayDays.length}, 1fr)`, height: `${HOURS.length * 80}px` }}>
          {/* Time Column */}
          <div className="bg-slate-50/50 border-r border-slate-200/60 relative">
            {HOURS.map((hour) => (
              <div 
                key={hour} 
                className="absolute w-full border-b border-slate-100/50 flex items-center justify-center" 
                style={{ top: `${((hour - 8) / HOURS.length) * 100}%`, height: `${100 / HOURS.length}%` }}
              >
                <span className="text-[10px] font-black text-slate-400 tracking-tighter">{`${hour}:00`}</span>
              </div>
            ))}
          </div>

          {/* Days Columns */}
          {displayDays.map((day) => (
            <div key={day} className="relative border-r border-slate-100/50 last:border-0">
              {HOURS.map((hour) => (
                <div 
                  key={hour} 
                  className="absolute w-full border-b border-slate-100/50" 
                  style={{ top: `${((hour - 8) / HOURS.length) * 100}%`, height: `${100 / HOURS.length}%` }} 
                />
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
                      className="absolute left-1.5 right-1.5 rounded-2xl p-3 text-left text-white shadow-xl hover:brightness-110 transition-all group animate-fade-in z-20"
                      style={{ 
                        top: `calc(${top}% + 4px)`, 
                        height: `calc(${height}% - 8px)`, 
                        backgroundColor: color,
                        boxShadow: `0 10px 25px -5px ${color}40`
                      }}
                    >
                      <div className="h-full flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-0.5 truncate">
                            {course.code || 'DERS'}
                          </p>
                          <p className="text-xs font-black leading-tight line-clamp-2">
                            {course.name}
                          </p>
                        </div>
                        {course.room && (
                          <div className="flex items-center gap-1 opacity-80">
                            <MapPin className="w-2.5 h-2.5" />
                            <span className="text-[9px] font-bold truncate">{course.room}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Hover Effect Light */}
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
  if (orderedDays.length === 0) return (
    <div className="flex flex-col items-center py-12 text-slate-400">
      <Info className="w-8 h-8 mb-2 opacity-20" />
      <p className="text-sm font-bold uppercase tracking-widest">Ders bulunamadı.</p>
    </div>
  );

  return (
    <div className="space-y-12">
      {orderedDays.map((day) => (
        <div key={day} className="animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none mb-1">
                {DAYS_TR[day]}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Haftalık Program</p>
            </div>
          </div>
          <div className="grid gap-3">
            {byDay[day].map(({ course, slot, color }, i) => (
              <button
                key={i}
                onClick={() => onCourseClick(course)}
                className="group relative flex items-center gap-3 sm:gap-6 bg-white/40 hover:bg-white/60 border border-white/60 rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-5 transition-all text-left overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1"
              >
                <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: color }} />
                
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white flex flex-col items-center justify-center border border-slate-100 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <span className="text-xs font-black text-slate-900">{slot.start_time.split(':')[0]}</span>
                  <div className="w-4 h-0.5 bg-slate-200 my-1" />
                  <span className="text-[10px] font-bold text-slate-400">{slot.end_time.split(':')[0]}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    {course.code || 'AKADEMİK DERS'}
                  </p>
                  <p className="text-base font-black text-slate-900 tracking-tight truncate group-hover:text-sky-600 transition-colors">
                    {course.name}
                  </p>
                  {course.instructor && (
                    <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                      <UserIcon className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-tight">{course.instructor}</span>
                    </div>
                  )}
                </div>

                <div className="text-right flex-shrink-0 pr-1 sm:pr-2">
                  <div className="flex items-center justify-end gap-1 sm:gap-2 text-slate-700 mb-1">
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-500" />
                    <span className="text-xs sm:text-sm font-black tracking-tight">{slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}</span>
                  </div>
                  {course.room && (
                    <div className="flex items-center justify-end gap-1 sm:gap-1.5 text-slate-400">
                      <MapPin className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{course.room}</span>
                    </div>
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

const EmptyState: React.FC<{ 
  university: string; 
  department: string; 
  classYear: string; 
  semesterLabel: string;
  onShowFilters: () => void;
  onManualCreate: () => void;
  showManualButton: boolean;
}> = ({
  university, department, classYear, semesterLabel, onShowFilters, onManualCreate, showManualButton
}) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
    <div className="w-24 h-24 rounded-[2rem] bg-slate-100 flex items-center justify-center mb-6 relative">
      <Sparkles className="w-10 h-10 text-slate-300" />
      <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
        <Info className="w-4 h-4 text-sky-500" />
      </div>
    </div>
    <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Ders Programı Bulunamadı</h2>
    <div className="max-w-sm mx-auto space-y-1 mb-8">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
        {university}
      </p>
      <p className="text-sm font-bold text-slate-600">
        {department} • {classYear && `${classYear}. Sınıf • `} {semesterLabel}
      </p>
    </div>
    
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <button 
        onClick={onShowFilters}
        className="flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-sm font-black hover:bg-slate-50 transition-all shadow-sm group"
      >
        <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
        Filtreleri Düzenle
      </button>

      {showManualButton && (
        <button 
          onClick={onManualCreate}
          className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          Sıfırdan Program Oluştur
        </button>
      )}
    </div>
    
    {showManualButton && (
      <p className="mt-8 text-[10px] font-bold text-slate-400 max-w-xs leading-relaxed uppercase tracking-widest">
        Resmi program henüz sisteme yüklenmemiş olabilir. Kendi programını manuel oluşturarak takip edebilirsin.
      </p>
    )}
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

  const inputCls = 'w-full rounded-2xl border border-slate-200 bg-white/50 text-slate-900 px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all placeholder:text-slate-300';

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto no-scrollbar animate-fade-in">
      <div className="w-full max-w-3xl glass-card rounded-[2rem] sm:rounded-[3rem] border-white/40 overflow-hidden my-4 sm:my-8 animate-slide-up shadow-2xl">
        {/* Header */}
        <div className="px-5 sm:px-10 py-5 sm:py-8 border-b border-white/20 bg-white/30 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[1rem] sm:rounded-[1.25rem] bg-slate-900 flex items-center justify-center shadow-lg">
              <Settings2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">Programımı Düzenle</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Derslerini özelleştir</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={saving} 
            className="w-10 h-10 rounded-full bg-slate-100/50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Courses */}
        <div className="p-4 sm:p-10 space-y-6 sm:space-y-8">
          {courses.length === 0 && (
            <div className="flex flex-col items-center py-20 text-slate-400">
              <Sparkles className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm font-black uppercase tracking-widest">Henüz ders eklenmemiş.</p>
            </div>
          )}

          {courses.map((course, cIdx) => (
            <div key={course.id} className="relative group">
              <div className="glass-card rounded-[2.5rem] p-8 border-white/60 bg-white/40 space-y-6 transition-all hover:bg-white/50 hover:border-sky-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-[10px] font-black text-white flex items-center justify-center">
                      {cIdx + 1}
                    </span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ders Bilgileri</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCourse(cIdx)}
                    className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                    title="Dersi Sil"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ders Adı *</label>
                    <input 
                      value={course.name} 
                      onChange={(e) => updateCourse(cIdx, 'name', e.target.value)} 
                      className={inputCls} 
                      placeholder="Örn: Veri Yapıları"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Öğretmen</label>
                    <input 
                      value={course.instructor ?? ''} 
                      onChange={(e) => updateCourse(cIdx, 'instructor', e.target.value)} 
                      className={inputCls} 
                      placeholder="Örn: Dr. Ahmet Yılmaz" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Derslik</label>
                    <input 
                      value={course.room ?? ''} 
                      onChange={(e) => updateCourse(cIdx, 'room', e.target.value)} 
                      className={inputCls} 
                      placeholder="Örn: Amfi-1" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ders Kodu</label>
                    <input 
                      value={course.code ?? ''} 
                      onChange={(e) => updateCourse(cIdx, 'code', e.target.value)} 
                      className={inputCls} 
                      placeholder="Örn: COMP201" 
                    />
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-sky-500" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ders Saatleri</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => addSlot(cIdx)} 
                      className="text-[10px] font-black text-sky-600 hover:text-sky-700 uppercase tracking-widest flex items-center gap-1 bg-sky-50 px-3 py-1 rounded-full transition-all"
                    >
                      <Plus size={10} /> Saat Ekle
                    </button>
                  </div>

                  <div className="grid gap-2">
                    {course.slots.map((slot, sIdx) => (
                      <div key={sIdx} className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-white/40 border border-white/60">
                        <div className="flex-1 min-w-[120px] relative">
                          <select
                            value={slot.day}
                            onChange={(e) => updateSlot(cIdx, sIdx, 'day', e.target.value)}
                            className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer"
                          >
                            {DAY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={slot.start_time}
                            onChange={(e) => updateSlot(cIdx, sIdx, 'start_time', e.target.value)}
                            className="bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                          />
                          <span className="text-slate-300 font-bold">—</span>
                          <input
                            type="time"
                            value={slot.end_time}
                            onChange={(e) => updateSlot(cIdx, sIdx, 'end_time', e.target.value)}
                            className="bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                          />
                        </div>

                        <button 
                          type="button" 
                          onClick={() => removeSlot(cIdx, sIdx)} 
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addCourse}
            className="w-full flex items-center justify-center gap-3 py-6 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 hover:border-sky-400 hover:text-sky-500 hover:bg-sky-50 transition-all group"
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:bg-sky-100 group-hover:scale-110 transition-all">
              <Plus size={20} />
            </div>
            <span className="text-sm font-black uppercase tracking-widest">Yeni Ders Ekle</span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-10 py-4 sm:py-6 border-t border-white/20 bg-white/30 flex items-center justify-between gap-4 sticky bottom-0 z-10 backdrop-blur-md">
          {error && (
            <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 animate-fade-in">
              <Info size={14} />
              <p className="text-[10px] font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-8 py-3 rounded-2xl bg-white/50 text-slate-600 hover:bg-white text-sm font-black transition-all border border-white/60"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-10 py-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 text-sm font-black shadow-xl shadow-slate-200 transition-all flex items-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Kaydediliyor' : 'Değişiklikleri Kaydet'}
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

  // ── İlk yükleme (Kişisel program & Dönem bilgisi) ──────────────────────────
  useEffect(() => {
    // Kişisel programı çek
    getMySchedule()
      .then((ps) => setPersonalSchedule(ps))
      .catch(() => setPersonalSchedule(null))
      .finally(() => setPersonalLoading(false));

    // Dönem bilgisini çek (Resmi program için şart)
    getSemesterInfo()
      .then((info) => setSemesterInfo(info))
      .catch((err) => console.error("Dönem bilgisi alınamadı:", err));
  }, []);

  // ── Filtreleri profil bilgileriyle eşitle (Akıllı Senkronizasyon) ──────────────────
  useEffect(() => {
    if (!user) return;
    
    // Eğer kullanıcı daha önce manuel bir değişiklik yapmadıysa (veya resetlendiğinde)
    // profil bilgilerini filtrelerle eşitle
    setSelectedUniversityId(user.university_id || '');
    setFilterUniversity(user.university || '');
    setSelectedFacultyId(user.faculty_id || '');
    setFilterDepartment(user.department || '');
    
    // Sınıf bilgisini normalize et ("3. Sınıf" -> "3")
    const normalized = normalizeGrade(user.grade);
    if (normalized) setClassYear(normalized);
    
    // Dönem ve Yıl her zaman güncel dönemden başlasın
    if (semesterInfo) {
      setFilterSemester(semesterInfo.semester);
      setAcademicYear(semesterInfo.academic_year);
    }
  }, [user, semesterInfo?.semester, semesterInfo?.academic_year]);

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
      setOfficialSchedule(data || null);
    } catch (err) {
      console.error("Ders programı yüklenemedi:", err);
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

  // ── Manuel program oluştur ───────────────────────────────────────────────
  const handleCreateManual = async () => {
    // Backend'de boş bir program oluşturmak için updateMySchedule([]) kullanabiliriz
    // veya basitçe modalı açıp ilk dersi ekletebiliriz.
    // Ancak veri tutarlılığı için önce null olan personalSchedule'ı boş array'li bir yapıya sokalım.
    try {
      setPersonalLoading(true);
      const ps = await updateMySchedule([]);
      setPersonalSchedule(ps);
      setIsEditModalOpen(true); // Hemen düzenleme modunu aç
    } catch (err) {
      console.error("Manuel program başlatılamadı:", err);
    } finally {
      setPersonalLoading(false);
    }
  };

  const departmentName = filterDepartment || user?.department || '';
  const universityName = filterUniversity || user?.university || '';

  const isFiltersMatchingProfile = 
    (selectedUniversityId === user?.university_id) &&
    (filterDepartment === user?.department) &&
    (normalizeGrade(classYear) === normalizeGrade(user?.grade));

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
  const displayCourses: CourseItem[] = (isFiltersMatchingProfile && personalSchedule && !showDropdowns) 
    ? personalSchedule.courses 
    : (officialSchedule?.courses ?? []);
    
  const hasOfficialData = officialSchedule !== null && (officialSchedule?.courses?.length || 0) > 0;
  const shouldShowContent = (isFiltersMatchingProfile && personalSchedule) || hasOfficialData;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="w-full min-h-full bg-mesh relative overflow-x-hidden pb-24">
        {/* Background Decorative Blurs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-sky-500/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-1 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Akademik Araçlar</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">Ders Programım</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 line-clamp-1">
                {universityName} • {departmentName} {classYear && `• ${classYear}. SINIF`}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap animate-fade-in delay-100">
              {semesterInfo && (
                <div className="glass-card px-5 py-3 rounded-2xl flex items-center gap-4 bg-white/40 border-white/40">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 leading-none">{semesterInfo.semester_label}</p>
                    <p className="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-tight">{semesterInfo.academic_year}</p>
                  </div>
                </div>
              )}

              {personalSchedule && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 group"
                  >
                    <Settings2 className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                    Düzenle
                  </button>
                  <button
                    onClick={() => setShowDropdowns((v) => !v)}
                    className={`
                      flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all border
                      ${showDropdowns 
                        ? 'bg-rose-50 border-rose-200 text-rose-600' 
                        : 'bg-white/50 border-white/50 text-slate-600 hover:bg-white'}
                    `}
                  >
                    {showDropdowns ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                    {showDropdowns ? 'Kapat' : 'Program Değiştir'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Search/Filter Section */}
          {(personalSchedule === null || showDropdowns) && (
            <div className="glass-card rounded-[2.5rem] border-white/60 bg-white/40 overflow-hidden mb-8 animate-slide-up">
              <div className="px-8 py-5 border-b border-white/20 bg-white/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4 text-sky-500" />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Resmi Program Arama</span>
                </div>
                {personalSchedule && (
                  <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 uppercase tracking-widest">
                    Yeni Program Seçiliyor
                  </span>
                )}
              </div>
              
              <div className="p-8">
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
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 pt-6 border-t border-white/20">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sınıf</label>
                    <div className="relative">
                      <select 
                        value={classYear} 
                        onChange={(e) => setClassYear(e.target.value)} 
                        className="w-full bg-white/50 border border-white/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 appearance-none cursor-pointer transition-all"
                      >
                        <option value="">— Seç —</option>
                        {CLASS_YEARS.map((cy) => <option key={cy.value} value={cy.value}>{cy.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dönem</label>
                    <div className="relative">
                      <select 
                        value={filterSemester} 
                        onChange={(e) => setFilterSemester(e.target.value)} 
                        className="w-full bg-white/50 border border-white/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 appearance-none cursor-pointer transition-all"
                      >
                        <option value="">— Otomatik —</option>
                        {SEMESTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Akademik Yıl</label>
                    <div className="relative">
                      <select 
                        value={academicYear} 
                        onChange={(e) => setAcademicYear(e.target.value)} 
                        className="w-full bg-white/50 border border-white/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 appearance-none cursor-pointer transition-all"
                      >
                        {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Bar for Cloning - Sadece kullanıcının kendi profilindeyse göster */}
          {isFiltersMatchingProfile && (personalSchedule === null || showDropdowns) && officialSchedule && !loading && (
            <div className="glass-card rounded-3xl border-sky-200/60 bg-sky-500/5 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-slide-up">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <h4 className="text-base font-black text-sky-900 tracking-tight">Program Hazır!</h4>
                  <p className="text-xs font-bold text-sky-600/80 uppercase tracking-widest mt-1">
                    {officialSchedule.university} • {officialSchedule.courses.length} Ders
                  </p>
                </div>
              </div>
              <button
                onClick={handleClone}
                disabled={cloning}
                className="px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white text-sm font-black rounded-xl shadow-xl shadow-sky-200 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {cloning ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : <Sparkles className="w-4 h-4" />}
                {cloning ? 'Kopyalanıyor...' : 'Bu Programı Baz Al ve Özelleştir'}
              </button>
            </div>
          )}

          {/* Content Area */}
          {shouldShowContent ? (
            <div className="space-y-6 animate-slide-up">
              {/* Controls Bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {personalSchedule && !showDropdowns && (
                    <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Kişisel Program</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-sm">
                  <button
                    onClick={() => setViewMode('weekly')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'weekly' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Layout className="w-3.5 h-3.5" />
                    Haftalık
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <List className="w-3.5 h-3.5" />
                    Liste
                  </button>
                </div>
              </div>

              {/* Main Grid/List */}
              <div className="glass-card rounded-[2.5rem] border-white/60 bg-white/30 overflow-hidden min-h-[500px]">
                {loading && !personalSchedule ? (
                  <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
                    <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Program Yükleniyor...</p>
                  </div>
                ) : viewMode === 'weekly' ? (
                  <WeeklyGrid courses={displayCourses} onCourseClick={setSelectedCourse} />
                ) : (
                  <div className="p-8">
                    <ListView courses={displayCourses} onCourseClick={setSelectedCourse} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-[2.5rem] border-white/60 bg-white/30">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
                  <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Dersler Aranıyor...</p>
                </div>
              ) : (
                <EmptyState 
                  university={universityName}
                  department={departmentName}
                  classYear={classYear || '?'}
                  semesterLabel={semesterInfo?.semester_label || '?'}
                  onShowFilters={() => setShowDropdowns(true)}
                  onManualCreate={handleCreateManual}
                  showManualButton={isFiltersMatchingProfile}
                />
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {selectedCourse && (
          <CourseDetailModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
        )}

        {isEditModalOpen && personalSchedule && (
          <PersonalEditModal
            initialCourses={personalSchedule.courses}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleSavePersonal}
          />
        )}
      </div>
    </MainLayout>
  );
};
