/**
 * Academic Calendar Page — Akademik Takvim
 * Spec: 006-academic-features/spec.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';
import {
  getCalendarEvents,
  getSemesterInfo,
  uploadCalendarPDF,
  type CalendarEvent,
  type CalendarUploadResult,
  type SemesterInfo,
} from '../api/academic';
import { CascadingInstitutionSelect } from '../components/institution/CascadingInstitutionSelect';

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

const TYPE_META: Record<string, { icon: string; leftBar: string; badge: string; label: string }> = {
  exam:         { icon: '📝', leftBar: 'bg-rose-500',   badge: 'bg-rose-50 text-rose-600 ring-rose-200',   label: 'Sınav' },
  registration: { icon: '📋', leftBar: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-600 ring-blue-200',   label: 'Kayıt' },
  holiday:      { icon: '🎉', leftBar: 'bg-emerald-500',badge: 'bg-emerald-50 text-emerald-600 ring-emerald-200', label: 'Tatil' },
  other:        { icon: '📌', leftBar: 'bg-slate-400',  badge: 'bg-slate-50 text-slate-600 ring-slate-200', label: 'Diğer' },
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
  <div className="flex gap-4 animate-pulse">
    <div className="w-1 rounded-full bg-slate-200 self-stretch" />
    <div className="flex-1 space-y-2 py-1">
      <div className="h-4 bg-slate-200 rounded w-3/4" />
      <div className="h-3 bg-slate-100 rounded w-1/2" />
    </div>
    <div className="h-6 w-16 bg-slate-100 rounded-full self-start mt-1" />
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-8">
    {[0, 1].map(g => (
      <div key={g}>
        <div className="h-3 bg-slate-100 rounded w-24 mb-4 animate-pulse" />
        <div className="space-y-4">
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    ))}
  </div>
);

// ─── Event Card ───────────────────────────────────────────────────────────────

const EventCard: React.FC<{ event: CalendarEvent }> = ({ event }) => {
  const eventType = normalizeEventType(event.event_type);
  const meta    = TYPE_META[eventType] ?? TYPE_META.other;
  const urgency = urgencyInfo(event.days_until);
  const isPast  = event.days_until == null;

  return (
    <div className={`group flex items-start gap-4 rounded-xl px-4 py-3.5 transition-all
      ${isPast
        ? 'opacity-50'
        : 'hover:bg-slate-50'
      }`}
    >
      {/* Sol renk çubuğu + tarih */}
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-12 text-center">
        <div className={`w-1.5 h-1.5 rounded-full ${meta.leftBar} ${urgency.pulse ? 'animate-pulse' : ''}`} />
        <span className="text-[11px] font-semibold text-slate-400 leading-tight">
          {fmtDate(event.start_date)}
        </span>
      </div>

      {/* İçerik */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ${meta.badge}`}>
            {meta.icon} {meta.label}
          </span>
        </div>
        <p className={`font-semibold text-slate-800 leading-snug ${isPast ? 'line-through decoration-slate-400' : ''}`}>
          {event.title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {fmtRange(event.start_date, event.end_date)}
        </p>
        {event.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{event.description}</p>
        )}
      </div>

      {/* Geri sayım */}
      {!isPast && (
        <div className={`flex-shrink-0 text-right text-xs ${urgency.cls}`}>
          <p className="leading-tight">{urgency.text}</p>
          <p className="text-[10px] text-slate-400 font-normal">kaldı</p>
        </div>
      )}
    </div>
  );
};

// ─── Boş Durum ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ university: string; onContribute: () => void }> = ({
  university,
  onContribute,
}) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
    {/* Görsel */}
    <div className="relative mb-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center shadow-inner">
        <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </div>
      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-sm">
        ?
      </div>
    </div>

    <h3 className="text-lg font-bold text-slate-800 mb-1">Takvim henüz eklenmemiş</h3>
    <p className="text-sm text-slate-500 max-w-xs mb-8">
      <span className="font-medium text-slate-700">{university}</span> için
      henüz akademik takvim verisi yok. İlk ekleyen sen ol!
    </p>

    {/* Katkı kartı */}
    <div className="w-full max-w-sm bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-5 border border-indigo-100 text-left">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-indigo-900">Katkıda Bulun</p>
          <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">
            Üniversitenden aldığın resmi takvimi paylaş, tüm öğrenciler görsün.
            Admin onayından sonra yayınlanır.
          </p>
        </div>
      </div>
      <button
        onClick={onContribute}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        Takvim Ekle
      </button>
    </div>
  </div>
);

// ─── Calendar Upload Modal ────────────────────────────────────────────────────

interface CalendarUploadModalProps {
  defaultUniversity: string;
  defaultAcademicYear: string;
  onClose: () => void;
  onSuccess: (result: CalendarUploadResult) => void;
}

const ACADEMIC_YEAR_OPTIONS = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'] as const;

const CalendarUploadModal: React.FC<CalendarUploadModalProps> = ({
  defaultUniversity,
  defaultAcademicYear,
  onClose,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [universityName, setUniversityName] = useState(defaultUniversity);
  const [academicYear, setAcademicYear] = useState(
    ACADEMIC_YEAR_OPTIONS.includes(defaultAcademicYear as (typeof ACADEMIC_YEAR_OPTIONS)[number])
      ? defaultAcademicYear
      : ''
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalendarUploadResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Yalnızca PDF dosyası seçebilirsin.');
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    if (!file) { setError('Lütfen bir PDF dosyası seç.'); return; }
    if (!universityName.trim() || !academicYear) {
      setError('Lütfen üniversite seçin ve akademik yıl seçin.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const res = await uploadCalendarPDF({
        file,
        university: universityName.trim(),
        academic_year: academicYear,
      });
      setResult(res);
      onSuccess(res);
    } catch {
      setError('Yükleme sırasında hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in-up">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">📅 PDF'den Akademik Takvim Yükle</h2>
            <p className="text-sm text-gray-500 mt-0.5">Gemini AI ile otomatik ayrıştırılır</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors">×</button>
        </div>

        {result ? (
          /* Başarı durumu */
          <div className="p-6">
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">✅</div>
              <h3 className="text-lg font-bold text-gray-900">Başarıyla Yüklendi!</h3>
              <p className="text-gray-600 text-sm">{result.message}</p>
              <div className="text-center mt-2">
                <p className="text-3xl font-black text-indigo-600">{result.events_parsed}</p>
                <p className="text-xs text-gray-500 font-medium">Etkinlik eklendi</p>
              </div>
              <p className="text-xs text-gray-400 mt-1">Sayfa otomatik yenilenecek.</p>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Kapat
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* PDF Dosya Seçimi */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">PDF Dosyası *</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  file ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-indigo-700">
                    <span className="text-xl">📄</span>
                    <span className="text-sm font-semibold truncate max-w-[240px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                    >×</button>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <p className="text-2xl mb-1">⬆️</p>
                    <p className="text-sm font-medium">PDF seç veya buraya sürükle</p>
                    <p className="text-xs mt-0.5">Metin içeren PDF, maks. 10 sayfa</p>
                  </div>
                )}
              </div>
            </div>

            {/* Üniversite (cascade dropdown — fakülte/bölüm gerekmez) */}
            <CascadingInstitutionSelect
              showDepartment={false}
              initialUniversityName={defaultUniversity}
              onChange={(sel) => {
                if (sel.universityName !== undefined) setUniversityName(sel.universityName);
              }}
            />

            {/* Akademik Yıl */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Akademik Yıl *</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-gray-50 focus:bg-white transition-colors appearance-none cursor-pointer"
              >
                <option value="">— Akademik yıl seçin —</option>
                {ACADEMIC_YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <span className="flex-shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-gray-600 font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={uploading || !file}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    AI analiz ediyor...
                  </>
                ) : (
                  '📤 Yükle ve Analiz Et'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

export const AcademicCalendarPage: React.FC = () => {
  const { user } = useAuth();

  const [semesterInfo,       setSemesterInfo]       = useState<SemesterInfo | null>(null);
  const [allEvents,          setAllEvents]          = useState<CalendarEvent[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);
  const [activeFilter,       setActiveFilter]       = useState<FilterKey>('all');
  const [showPast,           setShowPast]           = useState(false);
  const [viewMode,           setViewMode]           = useState<CalendarViewMode>('list');
  const [calendarMonth,      setCalendarMonth]      = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  // Dönem bilgisi
  useEffect(() => {
    getSemesterInfo().then(setSemesterInfo).catch(() => {
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

  // Etkinlikler
  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCalendarEvents();
      setAllEvents(normalizeCalendarEvents(data));
    } catch {
      setError('Etkinlikler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Türetilmiş değerler
  const filteredEvents = activeFilter === 'all'
    ? allEvents
    : allEvents.filter((e) => normalizeEventType(e.event_type) === activeFilter);
  const today          = new Date().toISOString().split('T')[0];
  const upcomingAllEvents = allEvents.filter((e) => e.start_date >= today);
  const upcomingEvents = filteredEvents.filter(e => e.start_date >= today);
  const pastEvents     = filteredEvents.filter(e => e.start_date <  today);
  const displayEvents  = showPast ? filteredEvents : upcomingEvents;
  const grouped        = groupByMonth(displayEvents);
  const calendarDays   = useMemo(() => calendarGrid(calendarMonth), [calendarMonth]);
  const monthEventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const day of calendarDays) {
      const dayKey = toDateKey(day);
      map.set(dayKey, filteredEvents.filter((event) => dayContainsEvent(dayKey, event)));
    }
    return map;
  }, [calendarDays, filteredEvents]);
  const urgentCount    = upcomingEvents.filter(e => (e.days_until ?? 99) <= 7).length;
  const university     = user?.university ?? '';
  const activeViewHasNoEvents = viewMode === 'list' ? displayEvents.length === 0 : filteredEvents.length === 0;
  const getFilterCount = (filterKey: FilterKey) => {
    if (filterKey === 'all') return upcomingAllEvents.length;
    return upcomingAllEvents.filter((e) => normalizeEventType(e.event_type) === filterKey).length;
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-8">

          {/* ── Başlık ───────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Akademik Takvim
              </h1>
              {university && (
                <p className="text-sm text-slate-500 mt-0.5">{university}</p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 bg-white rounded-xl p-1 shadow-sm border border-slate-200 flex gap-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    viewMode === 'list'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Liste
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Takvim
                </button>
              </div>

              {semesterInfo && (
                <div className="flex-shrink-0 bg-white rounded-xl px-3.5 py-2 shadow-sm border border-slate-200 text-right">
                  <p className="text-xs font-semibold text-slate-700">{semesterInfo.semester_label}</p>
                  <p className="text-[11px] text-slate-400">{semesterInfo.academic_year}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Acil uyarı ───────────────────────────────── */}
          {urgentCount > 0 && !loading && (
            <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
              <p className="text-sm text-rose-700 font-medium">
                {urgentCount === 1
                  ? '1 etkinlik bu hafta içinde'
                  : `${urgentCount} etkinlik bu hafta içinde`}
              </p>
            </div>
          )}

          {/* ── Ana kart ─────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

            {/* Filtreler — sadece veri varsa göster */}
            {!loading && allEvents.length > 0 && (
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 flex-wrap">
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      activeFilter === f.key
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                    {f.key !== 'all' && (
                      <span className={`ml-1 ${activeFilter === f.key ? 'text-slate-300' : 'text-slate-400'}`}>
                        {getFilterCount(f.key)}
                      </span>
                    )}
                  </button>
                ))}

                {viewMode === 'list' && pastEvents.length > 0 && (
                  <button
                    onClick={() => setShowPast(p => !p)}
                    className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPast ? 'Geçmişi gizle' : `Geçmiş (${pastEvents.length})`}
                  </button>
                )}
              </div>
            )}

            {/* ── İçerik ─────────────────────────────────── */}
            <div className="px-2 py-2">

              {/* Yükleniyor */}
              {loading && (
                <div className="px-4 py-6">
                  <LoadingSkeleton />
                </div>
              )}

              {/* Hata */}
              {!loading && error && (
                <div className="flex flex-col items-center py-16 gap-3 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-600 font-medium">{error}</p>
                  <button
                    onClick={loadEvents}
                    className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors"
                  >
                    Tekrar dene
                  </button>
                </div>
              )}

              {/* Boş durum */}
              {!loading && !error && allEvents.length === 0 && (
                <EmptyState
                  university={university}
                  onContribute={() => setIsCalendarModalOpen(true)}
                />
              )}

              {/* Filtreli boş durum */}
              {!loading && !error && allEvents.length > 0 && activeViewHasNoEvents && (
                <div className="py-16 text-center">
                  <p className="text-sm text-slate-400">Bu filtrede etkinlik yok.</p>
                </div>
              )}

              {/* Etkinlik listesi */}
              {!loading && !error && viewMode === 'list' && grouped.length > 0 && (
                <div className="divide-y divide-slate-50">
                  {grouped.map(([month, monthEvents]) => (
                    <div key={month} className="py-2">
                      {/* Ay başlığı */}
                      <div className="px-4 py-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          {month}
                        </span>
                      </div>
                      {/* Etkinlikler */}
                      <div className="space-y-0.5">
                        {monthEvents.map(ev => (
                          <EventCard key={ev.id} event={ev} />
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Geçmiş gösterilmiyorsa buton */}
                  {!showPast && pastEvents.length > 0 && (
                    <div className="px-4 py-4">
                      <button
                        onClick={() => setShowPast(true)}
                        className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 border border-dashed border-slate-200 hover:border-slate-300 rounded-xl transition-all"
                      >
                        {pastEvents.length} geçmiş etkinliği göster
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Aylık takvim görünümü */}
              {!loading && !error && viewMode === 'calendar' && filteredEvents.length > 0 && (
                <div className="px-2 pb-3">
                  <div className="flex items-center justify-between px-2 py-3">
                    <button
                      onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Önceki
                    </button>
                    <p className="text-sm font-bold text-slate-700 capitalize">
                      {calendarMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                    </p>
                    <button
                      onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Sonraki
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 px-1">
                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((label) => (
                      <div key={label} className="text-[11px] font-semibold text-slate-400 text-center py-1">
                        {label}
                      </div>
                    ))}

                    {calendarDays.map((day) => {
                      const dayKey = toDateKey(day);
                      const dayEvents = monthEventsMap.get(dayKey) ?? [];
                      const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();

                      return (
                        <div
                          key={dayKey}
                          className={`min-h-24 border rounded-lg p-1.5 transition-colors ${
                            isCurrentMonth
                              ? 'bg-white border-slate-200 hover:border-slate-300'
                              : 'bg-slate-50 border-slate-100 text-slate-300'
                          }`}
                        >
                          <p className={`text-[11px] font-semibold mb-1 ${isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}>
                            {day.getDate()}
                          </p>

                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map((event) => {
                              const eventType = normalizeEventType(event.event_type);
                              const meta = TYPE_META[eventType] ?? TYPE_META.other;
                              return (
                                <div
                                  key={`${event.id}-${dayKey}`}
                                  title={event.title}
                                  className={`w-full px-1 py-0.5 rounded-md text-[10px] font-medium text-white ${meta.leftBar}`}
                                >
                                  <span className="block truncate overflow-hidden whitespace-nowrap">
                                    {event.title}
                                  </span>
                                </div>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <p className="text-[10px] text-slate-400 font-medium">+{dayEvents.length - 3}</p>
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

          {/* ── Alt bilgi ────────────────────────────────── */}
          {!loading && allEvents.length > 0 && (
            <p className="text-center text-xs text-slate-400 mt-4">
              Eksik veya yanlış bilgi mi var?{' '}
              <button
                onClick={() => setIsCalendarModalOpen(true)}
                className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
              >
                Düzeltme öner
              </button>
            </p>
          )}

        </div>
      </div>

      {/* Akademik Takvim PDF Upload Modal */}
      {isCalendarModalOpen && semesterInfo && (
        <CalendarUploadModal
          defaultUniversity={university}
          defaultAcademicYear={semesterInfo.academic_year}
          onClose={() => setIsCalendarModalOpen(false)}
          onSuccess={() => {
            setIsCalendarModalOpen(false);
            loadEvents();
          }}
        />
      )}
    </MainLayout>
  );
};
