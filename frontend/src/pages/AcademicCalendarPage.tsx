/**
 * Academic Calendar Page — Akademik Takvim
 * Spec: 006-academic-features/spec.md
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';
import {
  getCalendarEvents,
  getSemesterInfo,
  type CalendarEvent,
  type SemesterInfo,
} from '../api/academic';
import { CascadingInstitutionSelect } from '../components/institution/CascadingInstitutionSelect';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Info, 
  Layout, 
  List, 
  Search, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';

// ─── Sabitler ────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all',          label: 'Tümü' },
  { key: 'exam',         label: 'Sınav' },
  { key: 'registration', label: 'Kayıt' },
  { key: 'holiday',      label: 'Tatil' },
  { key: 'other',        label: 'Diğer' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];
type CanonicalEventType = Exclude<FilterKey, 'all'>;
type CalendarViewMode = 'list' | 'calendar';

const EVENT_TYPE_ALIASES: Record<string, CanonicalEventType> = {
  exam: 'exam',
  sinav: 'exam',
  'sınav': 'exam',

  registration: 'registration',
  kayit: 'registration',
  'kayıt': 'registration',

  holiday: 'holiday',
  tatil: 'holiday',

  other: 'other',
  etkinlik: 'other',
  ders: 'other',
};

const TYPE_META: Record<string, { icon: React.ReactNode; leftBar: string; badge: string; label: string }> = {
  exam:         { icon: <CheckCircle2 className="w-3 h-3" />, leftBar: 'bg-rose-500',   badge: 'bg-rose-50 text-rose-600 ring-rose-200',   label: 'Sınav' },
  registration: { icon: <CalendarIcon className="w-3 h-3" />, leftBar: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-600 ring-blue-200',   label: 'Kayıt' },
  holiday:      { icon: <Sparkles className="w-3 h-3" />, leftBar: 'bg-emerald-500',badge: 'bg-emerald-50 text-emerald-600 ring-emerald-200', label: 'Tatil' },
  other:        { icon: <Info className="w-3 h-3" />, leftBar: 'bg-slate-400',  badge: 'bg-slate-50 text-slate-600 ring-slate-200', label: 'Diğer' },
};

function normalizeEventType(eventType?: string | null): CanonicalEventType {
  const key = (eventType ?? '').trim().toLocaleLowerCase('tr-TR');
  return EVENT_TYPE_ALIASES[key] ?? 'other';
}

function normalizeCalendarEvents(items: CalendarEvent[]): CalendarEvent[] {
  return items.map((item) => ({
    ...item,
    event_type: normalizeEventType(item.event_type),
  }));
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function urgencyInfo(daysUntil?: number | null): { text: string; cls: string; pulse: boolean } {
  if (daysUntil == null)     return { text: 'Geçti',            cls: 'text-slate-400',              pulse: false };
  if (daysUntil === 0)       return { text: 'Bugün!',           cls: 'text-rose-600 font-bold',     pulse: true  };
  if (daysUntil <= 7)        return { text: `${daysUntil} gün`, cls: 'text-rose-500 font-semibold', pulse: true  };
  if (daysUntil <= 30)       return { text: `${daysUntil} gün`, cls: 'text-amber-500 font-medium',  pulse: false };
  return                            { text: `${daysUntil} gün`, cls: 'text-emerald-600',            pulse: false };
}

function fmtDate(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}
function fmtDateLong(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtRange(start: string, end?: string | null): string {
  if (!end || end === start) return fmtDateLong(start);
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end   + 'T00:00:00');
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}–${e.getDate()} ${s.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`;
  }
  return `${fmtDateLong(start)} – ${fmtDateLong(end)}`;
}

function monthKey(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
}

function groupByMonth(events: CalendarEvent[]): [string, CalendarEvent[]][] {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const k = monthKey(ev.start_date);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(ev);
  }
  return Array.from(map.entries());
}

function toDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calendarGrid(monthCursor: Date): Date[] {
  const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const monthEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);

  const startOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - startOffset);

  const endOffset = 6 - ((monthEnd.getDay() + 6) % 7);
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(monthEnd.getDate() + endOffset);

  const dates: Date[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  while (dates.length < 35) {
    const next = new Date(dates[dates.length - 1]);
    next.setDate(next.getDate() + 1);
    dates.push(next);
  }

  return dates;
}

function dayContainsEvent(dayKey: string, event: CalendarEvent): boolean {
  const endDate = event.end_date ?? event.start_date;
  return event.start_date <= dayKey && dayKey <= endDate;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="flex gap-4 p-4 rounded-2xl bg-white/30 animate-pulse border border-white/50">
    <div className="w-1.5 rounded-full bg-slate-200 self-stretch" />
    <div className="flex-1 space-y-3 py-1">
      <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
      <div className="h-3 bg-slate-100 rounded-md w-1/2" />
    </div>
    <div className="h-8 w-20 bg-slate-100 rounded-full self-start" />
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-8 p-4">
    {[0, 1].map(g => (
      <div key={g} className="space-y-4">
        <div className="h-4 bg-slate-200/50 rounded-lg w-32 mb-6 ml-2" />
        <div className="space-y-4">
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    ))}
  </div>
);

// ─── Event Card ───────────────────────────────────────────────────────────────

const EventCard: React.FC<{ event: CalendarEvent }> = ({ event }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const eventType = normalizeEventType(event.event_type);
  const meta    = TYPE_META[eventType] ?? TYPE_META.other;
  const urgency = urgencyInfo(event.days_until);
  const isPast  = event.days_until == null;

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      className={`group flex items-start gap-6 rounded-[2rem] px-6 py-5 transition-all border cursor-pointer relative overflow-hidden
      ${isPast
        ? 'opacity-60 bg-white/10 border-transparent'
        : 'bg-white/40 hover:bg-white/60 border-white/80 hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1'
      } ${isExpanded ? 'bg-white/80 border-indigo-200/50 shadow-xl' : ''}`}
    >
      {/* Decorative Gradient for expanded state */}
      {isExpanded && !isPast && (
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
      )}

      {/* Date Indicator */}
      <div className="flex flex-col items-center flex-shrink-0 w-14">
        <div className={`w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex flex-col items-center justify-center transition-transform group-hover:scale-105 ${isExpanded ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}>
          <span className={`text-[10px] font-black uppercase tracking-tighter leading-none mb-0.5 ${isPast ? 'text-slate-400' : 'text-indigo-600'}`}>
            {new Date(event.start_date + 'T00:00:00').toLocaleDateString('tr-TR', { month: 'short' })}
          </span>
          <span className={`text-xl font-black leading-none ${isPast ? 'text-slate-500' : 'text-slate-900'}`}>
            {new Date(event.start_date + 'T00:00:00').getDate()}
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${meta.badge}`}>
            {meta.icon}
            {meta.label}
          </span>
          {isExpanded && (
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-fade-in">
              • Detayları Kapat
            </span>
          )}
        </div>
        
        <p className={`text-lg font-black text-slate-900 tracking-tight leading-tight mb-2 ${isPast ? 'line-through decoration-slate-300 text-slate-500' : ''}`}>
          {event.title}
        </p>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 tracking-tight">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {fmtRange(event.start_date, event.end_date)}
          </div>
          
          {event.description && !isExpanded && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-500/70">
              <Info className="w-3.5 h-3.5" />
              <span>Detay Gör</span>
            </div>
          )}
        </div>

        {/* Expanded Content */}
        {isExpanded && event.description && (
          <div className="mt-4 pt-4 border-t border-slate-100 animate-slide-up">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium text-slate-600 leading-relaxed">
                {event.description}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Urgency/Status */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {!isPast ? (
          <div className={`px-3 py-1.5 rounded-xl flex items-center gap-2 ${urgency.cls} bg-white shadow-sm border border-slate-100`}>
            <div className={`w-1.5 h-1.5 rounded-full ${meta.leftBar} ${urgency.pulse ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-black tracking-tighter">{urgency.text} kaldı</span>
          </div>
        ) : (
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 rounded-lg">Geçti</span>
        )}
        
        <div className={`mt-2 p-1.5 rounded-full transition-transform ${isExpanded ? 'rotate-180 bg-indigo-50 text-indigo-600' : 'text-slate-300'}`}>
          <ChevronRight className="w-4 h-4 rotate-90" />
        </div>
      </div>
    </div>
  );
};

// ─── Boş Durum ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ university: string }> = ({ university }) => (
  <div className="flex flex-col items-center justify-center py-24 px-6 text-center animate-fade-in">
    <div className="w-24 h-24 rounded-[2.5rem] bg-white/50 border border-white/80 shadow-xl flex items-center justify-center mb-8 relative group">
      <div className="absolute inset-0 bg-indigo-500/5 rounded-[2.5rem] scale-110 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <CalendarIcon className="w-10 h-10 text-slate-300 group-hover:text-indigo-400 transition-colors" />
      <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center border border-slate-100">
        <Info className="w-4 h-4 text-sky-500" />
      </div>
    </div>

    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Takvim Henüz Yüklenmemiş</h3>
    <div className="max-w-xs mx-auto space-y-3">
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
        {university}
      </p>
      <p className="text-xs font-medium text-slate-500 leading-relaxed">
        Üniversitenizin akademik takvim verileri henüz yönetici tarafından sisteme yüklenmemiş. Önemli tarihler yakında burada listelenecek.
      </p>
    </div>
  </div>
);

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

export const AcademicCalendarPage: React.FC = () => {
  const { user } = useAuth();

  const [semesterInfo, setSemesterInfo] = useState<SemesterInfo | null>(null);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [showPast, setShowPast] = useState(false);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('list');
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>(user?.university_id ?? '');
  const [selectedUniversityName, setSelectedUniversityName] = useState<string>(user?.university ?? '');
  const [showUniSelector, setShowUniSelector] = useState(false);

  // Synchronize with profile on mount/update
  useEffect(() => {
    if (user) {
      if (user.university_id) setSelectedUniversityId(user.university_id);
      if (user.university) setSelectedUniversityName(user.university);
    }
  }, [user]);

  // Fetch Semester Info
  useEffect(() => {
    getSemesterInfo()
      .then(setSemesterInfo)
      .catch(() => {
        const m = new Date().getMonth() + 1;
        const y = new Date().getFullYear();
        const sem = (m >= 9 || m === 1) ? 'guz' : 'bahar';
        setSemesterInfo({
          semester: sem,
          semester_label: sem === 'guz' ? 'Güz Dönemi' : 'Bahar Dönemi',
          academic_year: m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`,
        });
      });
  }, []);

  // Fetch Events
  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = selectedUniversityId ? { university_id: selectedUniversityId } : undefined;
      const data = await getCalendarEvents(params);
      setAllEvents(normalizeCalendarEvents(data));
    } catch (err) {
      console.error("Takvim yüklenemedi:", err);
      setError('Etkinlikler yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [selectedUniversityId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Derived values
  const filteredEvents = activeFilter === 'all'
    ? allEvents
    : allEvents.filter((e) => normalizeEventType(e.event_type) === activeFilter);
  
  const today = new Date().toISOString().split('T')[0];
  const upcomingAllEvents = allEvents.filter((e) => e.start_date >= today);
  const upcomingEvents = filteredEvents.filter(e => e.start_date >= today);
  const pastEvents = filteredEvents.filter(e => e.start_date < today);
  const displayEvents = showPast ? filteredEvents : upcomingEvents;
  const grouped = groupByMonth(displayEvents);
  const calendarDays = useMemo(() => calendarGrid(calendarMonth), [calendarMonth]);
  
  const monthEventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const day of calendarDays) {
      const dayKey = toDateKey(day);
      map.set(dayKey, filteredEvents.filter((event) => dayContainsEvent(dayKey, event)));
    }
    return map;
  }, [calendarDays, filteredEvents]);

  const urgentCount = upcomingEvents.filter(e => (e.days_until ?? 99) <= 7).length;
  const university = selectedUniversityName || user?.university || 'Üniversite';
  const activeViewHasNoEvents = viewMode === 'list' ? displayEvents.length === 0 : filteredEvents.length === 0;

  const getFilterCount = (filterKey: FilterKey) => {
    if (filterKey === 'all') return upcomingAllEvents.length;
    return upcomingAllEvents.filter((e) => normalizeEventType(e.event_type) === filterKey).length;
  };

  return (
    <MainLayout>
      <div className="w-full min-h-full bg-mesh relative overflow-x-hidden pb-20">
        {/* Background Decorative Blurs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-500/10 blur-[120px]" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 relative z-[70]">
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-sky-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Akademik Araçlar</span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Akademik Takvim</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                {university}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap animate-fade-in delay-100">
              <div className="flex items-center bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-sm">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <List className="w-3.5 h-3.5" />
                  Liste
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'calendar' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Layout className="w-3.5 h-3.5" />
                  Takvim
                </button>
              </div>

              {semesterInfo && (
                <div className="flex items-center gap-3">
                  <div className="glass-card px-5 py-3 rounded-2xl flex items-center gap-4 bg-white/40 border-white/40">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <CalendarIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-none">{semesterInfo.semester_label}</p>
                      <p className="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-tight">{semesterInfo.academic_year}</p>
                    </div>
                  </div>

                  {/* Compact University Switcher */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUniSelector(!showUniSelector)}
                      className={`
                        glass-card p-3.5 rounded-2xl flex items-center justify-center transition-all border shadow-sm
                        ${showUniSelector 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200 scale-105' 
                          : 'bg-white/40 border-white/40 text-slate-500 hover:bg-white/60 hover:text-indigo-600'}
                      `}
                      title="Üniversite Değiştir"
                    >
                      <Search className="w-5 h-5" />
                    </button>

                    {showUniSelector && (
                      <>
                        {/* Backdrop to ensure layering and allow closing */}
                        <div 
                          className="fixed inset-0 z-[90]" 
                          onClick={() => setShowUniSelector(false)}
                        />
                        <div className="absolute right-0 top-full mt-4 w-80 bg-white p-6 rounded-[2.5rem] shadow-2xl z-[100] border border-slate-100 animate-fade-in origin-top-right">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Üniversite Seçimi</span>
                            </div>
                            <button 
                              onClick={() => setShowUniSelector(false)}
                              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                          <CascadingInstitutionSelect
                            showDepartment={false}
                            initialUniversityId={selectedUniversityId}
                            onChange={(sel) => {
                              if (sel.universityId !== undefined) setSelectedUniversityId(sel.universityId);
                              if (sel.universityName !== undefined) setSelectedUniversityName(sel.universityName);
                            }}
                          />
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-4 text-center tracking-widest leading-relaxed">
                            Diğer üniversitelerin akademik takvimlerini incelemek için seçim yapabilirsiniz.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Urgent Alert */}
          {urgentCount > 0 && !loading && (
            <div className="glass-card rounded-2xl border-rose-200/60 bg-rose-500/5 px-6 py-4 mb-8 flex items-center gap-4 animate-slide-up">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-sm font-black text-rose-900 tracking-tight">
                  {urgentCount === 1 ? 'Bu hafta 1 önemli etkinlik var!' : `Bu hafta ${urgentCount} önemli etkinlik var!`}
                </p>
                <p className="text-[10px] font-bold text-rose-600/80 uppercase tracking-widest mt-0.5">Akademik takvimi kontrol etmeyi unutma.</p>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="space-y-6 animate-slide-up">
            {/* Filters Bar */}
            {!loading && allEvents.length > 0 && (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {FILTERS.map(f => (
                    <button
                      key={f.key}
                      onClick={() => setActiveFilter(f.key)}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border whitespace-nowrap
                        ${activeFilter === f.key
                          ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200'
                          : 'bg-white/40 border-white/60 text-slate-400 hover:bg-white/60 hover:text-slate-600'}
                      `}
                    >
                      {f.label}
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${activeFilter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {getFilterCount(f.key)}
                      </span>
                    </button>
                  ))}
                </div>

                {viewMode === 'list' && pastEvents.length > 0 && (
                  <button
                    onClick={() => setShowPast(p => !p)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showPast ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {showPast ? 'Geçmişi Gizle' : `Geçmiş (${pastEvents.length})`}
                  </button>
                )}
              </div>
            )}

            {/* Main Display Glass Card */}
            <div className="glass-card rounded-[2.5rem] border-white/60 bg-white/30 overflow-hidden min-h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Takvim Yükleniyor...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-32 animate-fade-in px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mb-6">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                  </div>
                  <p className="text-base font-black text-slate-900 mb-2">{error}</p>
                  <button
                    onClick={loadEvents}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                  >
                    Tekrar Dene
                  </button>
                </div>
              ) : allEvents.length === 0 ? (
                <EmptyState university={university} />
              ) : activeViewHasNoEvents ? (
                <div className="flex flex-col items-center justify-center py-32 opacity-40">
                  <Search className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Bu filtrede etkinlik bulunamadı</p>
                </div>
              ) : viewMode === 'list' ? (
                <div className="p-4 sm:p-8 space-y-12">
                  {grouped.map(([month, monthEvents]) => (
                    <div key={month} className="relative">
                      {/* Month Header with Line */}
                      <div className="flex items-center gap-4 mb-6 sticky top-0 z-10 py-2 bg-transparent backdrop-blur-sm">
                        <div className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                          {month}
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
                      </div>

                      {/* Events for Month */}
                      <div className="grid gap-4">
                        {monthEvents.map(ev => (
                          <EventCard key={ev.id} event={ev} />
                        ))}
                      </div>
                    </div>
                  ))}

                  {!showPast && pastEvents.length > 0 && (
                    <div className="pt-8">
                      <button
                        onClick={() => setShowPast(true)}
                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-xs font-black text-slate-400 uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-400 transition-all group"
                      >
                        <span className="flex items-center justify-center gap-2 group-hover:scale-105 transition-transform">
                          <Clock className="w-4 h-4" />
                          {pastEvents.length} Geçmiş Etkinliği Göster
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Calendar View */
                <div className="p-4 sm:p-8">
                  {/* Calendar Navigation */}
                  <div className="flex items-center justify-between mb-8">
                    <button
                      onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                      className="p-3 rounded-2xl bg-white/50 border border-white/80 text-slate-600 hover:bg-white hover:shadow-lg hover:shadow-indigo-500/5 transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight capitalize">
                        {calendarMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                      </h2>
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-1">Akademik Takvim</p>
                    </div>
                    <button
                      onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                      className="p-3 rounded-2xl bg-white/50 border border-white/80 text-slate-600 hover:bg-white hover:shadow-lg hover:shadow-indigo-500/5 transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'].map((label) => (
                      <div key={label} className="text-[10px] font-black text-slate-400 text-center py-2 tracking-widest">
                        {label}
                      </div>
                    ))}

                    {calendarDays.map((day) => {
                      const dayKey = toDateKey(day);
                      const dayEvents = monthEventsMap.get(dayKey) ?? [];
                      const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                      const isToday = dayKey === today;

                      return (
                        <div
                          key={dayKey}
                          className={`
                            min-h-[120px] rounded-2xl p-2 transition-all border flex flex-col
                            ${isCurrentMonth
                              ? 'bg-white/40 border-white/60 hover:bg-white/60 hover:shadow-xl hover:shadow-indigo-500/5'
                              : 'bg-slate-50/20 border-transparent text-slate-300'}
                            ${isToday ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
                          `}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-black ${isCurrentMonth ? 'text-slate-700' : 'text-slate-300'} ${isToday ? 'text-indigo-600' : ''}`}>
                              {day.getDate()}
                            </span>
                            {isToday && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                          </div>

                          <div className="flex-1 space-y-1.5 overflow-hidden">
                            {dayEvents.slice(0, 3).map((event) => {
                              const eventType = normalizeEventType(event.event_type);
                              const meta = TYPE_META[eventType] ?? TYPE_META.other;
                              return (
                                <div
                                  key={`${event.id}-${dayKey}`}
                                  title={event.title}
                                  className={`w-full px-2 py-1 rounded-lg text-[9px] font-black text-white truncate ${meta.leftBar} shadow-sm`}
                                >
                                  {event.title}
                                </div>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center mt-1">
                                +{dayEvents.length - 3} Diğer
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
