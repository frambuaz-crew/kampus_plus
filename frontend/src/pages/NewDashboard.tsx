import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Bot,
  ShoppingBag,
  BookOpen,
  ArrowRight,
  MessageSquare,
  ThumbsUp,
  Eye,
  MapPin,
  Clock,
  MessageCircle,
  Tag,
  Sparkles,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getImageUrl } from '../utils/imageUrl';
import { getStudentDashboard } from '../api/dashboard';
import type { DashboardResponse, FeedItem, EventItem, SemesterInfo } from '../api/dashboard';
import { Badge } from '../components/ui/badge';
import { AvatarImage } from '../components/ui/avatar';

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const careerTypeColors: Record<string, string> = {
  job: 'bg-blue-100 text-blue-800',
  internship: 'bg-green-100 text-green-800',
  startup: 'bg-violet-100 text-violet-800',
  project: 'bg-amber-100 text-amber-800',
};

const careerTypeLabels: Record<string, string> = {
  job: 'İş İlanı',
  internship: 'Staj',
  startup: 'Startup',
  project: 'Proje',
};

const eventTypeLabels: Record<string, string> = {
  exam: 'Sınav',
  registration: 'Kayıt',
  holiday: 'Tatil',
  other: 'Etkinlik',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const utcDateStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
  const diff = Math.floor((Date.now() - new Date(utcDateStr).getTime()) / 1000);
  if (diff < 60) return 'Az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dak önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

function formatEventDate(dateStr: string): { day: string; month: string } {
  const [, m, d] = dateStr.split('-');
  return {
    day: String(parseInt(d, 10)),
    month: MONTHS_TR[parseInt(m, 10) - 1] ?? '',
  };
}

function formatDisplayDate(dateStr: string): string {
  const [year, m, d] = dateStr.split('-');
  return `${parseInt(d, 10)} ${MONTHS_TR[parseInt(m, 10) - 1]} ${year}`;
}

function computeSemesterProgress(info: SemesterInfo): { percent: number; daysLeft: number } {
  const now = Date.now();
  const [sy, sm, sd] = info.start_date.split('-').map(Number);
  const [ey, em, ed] = info.end_date.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd).getTime();
  const end = new Date(ey, em - 1, ed).getTime();
  if (now <= start) return { percent: 0, daysLeft: Math.ceil((end - now) / 86400000) };
  if (now >= end) return { percent: 100, daysLeft: 0 };
  const percent = Math.round(((now - start) / (end - start)) * 100);
  const daysLeft = Math.ceil((end - now) / 86400000);
  return { percent, daysLeft };
}

// ─── Stat card type ───────────────────────────────────────────────────────────

// ─── Main Component ───────────────────────────────────────────────────────────

export const NewDashboard: React.FC = () => {
  const navigate = useNavigate();

  const userRaw = localStorage.getItem('user');
  const userObj = userRaw ? (JSON.parse(userRaw) as { first_name?: string; university_id?: string }) : null;
  const firstName = userObj?.first_name || 'Öğrenci';
  const userUniversityId = userObj?.university_id;

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getStudentDashboard();
        setDashboard(data);
      } catch {
        // silently ignore — UI shows zeros / empty states
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const unread = dashboard?.unread_message_count ?? 0;
  const activeListings = dashboard?.active_listing_count ?? 0;
  const aiRemaining = dashboard?.ai_messages_remaining ?? 0;
  const courseNotesCount = dashboard?.course_notes_count ?? 0;


  const feed = dashboard?.recent_feed ?? [];
  const semesterInfo = dashboard?.semester_info ?? null;

  // Filter events by user university
  const upcomingEvents = (dashboard?.upcoming_events ?? []).filter(e => {
    // If user has no university set, show all (or handle as empty)
    if (!userUniversityId) return true;
    // Only show if it matches user university or has no university_id (global)
    return !e.university_id || e.university_id === userUniversityId;
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-10 max-w-7xl relative z-10">
        <header className="mb-10 animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px w-8 bg-sky-500/50" />
            <span className="text-[10px] font-black text-sky-600 uppercase tracking-[0.3em]">Hızlı Bakış</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            Hoş geldin, <span className="text-gradient">{firstName}</span>! 👋
          </h1>
        </header>

        {/* ─── Quick Stats (Grid of 3) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            {
              label: 'Pazar İlanlarım',
              value: activeListings,
              sub: 'Aktif yayında olan ilan',
              icon: <Tag className="w-5 h-5" />,
              color: 'bg-amber-50 text-amber-600',
              route: '/dashboard/marketplace'
            },
            {
              label: 'AI Kredisi',
              value: aiRemaining,
              sub: 'Kalan mesaj hakkın',
              icon: <Sparkles className="w-5 h-5" />,
              color: 'bg-purple-50 text-purple-600',
              route: '/dashboard/ai-assistant'
            },
            {
              label: 'Ders Notlarım',
              value: courseNotesCount,
              sub: 'Toplam paylaşılan not',
              icon: <BookOpen className="w-5 h-5" />,
              color: 'bg-sky-50 text-sky-600',
              route: '/dashboard/course-notes'
            }
          ].map((s, idx) => (
            <Card
              key={idx}
              onClick={() => navigate(s.route)}
              className="group p-7 rounded-[2.5rem] border-none bg-white shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-sky-200/30 transition-all duration-500 cursor-pointer overflow-hidden relative"
            >
              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", s.color)}>
                  {React.cloneElement(s.icon as React.ReactElement, { className: "w-6 h-6" })}
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 transition-transform group-hover:translate-x-1" />
              </div>
              <div className="relative z-10">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{s.label}</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-1 truncate">{s.value}</h3>
                <p className="text-xs font-bold text-slate-400 italic">{s.sub}</p>
              </div>
              <div className={cn("absolute -bottom-4 -right-4 w-20 h-20 rounded-full blur-3xl opacity-20", s.color.split(' ')[1].replace('text-', 'bg-'))} />
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up delay-200">
          <div className="lg:col-span-8 space-y-6">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Kampüs <span className="text-sky-600">Akışı</span></h2>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-slate-100 rounded-[2.5rem] animate-pulse" />
                ))}
              </div>
            ) : feed.length === 0 ? (
              <Card className="p-16 text-center rounded-[3rem] border-dashed border-2 border-slate-200 bg-transparent shadow-none">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Buralar Biraz Sessiz...</h3>
                <Button className="mt-8 bg-slate-900 text-white rounded-2xl px-8 h-12 font-bold hover:bg-slate-800 transition-all">Bir Şeyler Paylaş</Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {feed.map((item) => (
                  <React.Fragment key={item.id}>
                    {item.type === 'forum' && <ForumFeedCard item={item} navigate={navigate} />}
                    {item.type === 'marketplace' && <MarketplaceFeedCard item={item} navigate={navigate} />}
                    {item.type === 'career' && <CareerFeedCard item={item} navigate={navigate} />}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* ─── Right Widgets ─── */}
          <div className="lg:col-span-4 space-y-6">
            {/* Upcoming Events */}
            <Card className="p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border-none bg-white">
              <div className="flex items-center justify-between mb-8">
                <h4 className="font-black text-slate-900">Yaklaşanlar</h4>
                <Button variant="ghost" className="text-sky-600 font-black text-[10px] tracking-widest uppercase hover:bg-sky-50" onClick={() => navigate('/dashboard/academic-calendar')}>
                  TÜMÜ <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-6">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.slice(0, 3).map((event) => {
                    const { day, month } = formatEventDate(event.start_date);
                    return (
                      <div key={event.id} className="group flex items-center gap-5 cursor-pointer" onClick={() => navigate('/dashboard/academic-calendar')}>
                        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 group-hover:bg-sky-500 transition-colors">
                          <span className="text-lg font-black text-slate-900 group-hover:text-white leading-none">{day}</span>
                          <span className="text-[10px] font-black text-slate-400 group-hover:text-sky-100 uppercase mt-1">{month}</span>
                        </div>
                        <div className="flex-1">
                          <h5 className="text-sm font-black text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">{event.title}</h5>
                          <Badge className="mt-2 bg-sky-50 text-sky-600 border-none px-3 py-0.5 font-bold text-[9px] uppercase tracking-tighter">
                            {eventTypeLabels[event.event_type || 'other'] || 'Etkinlik'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 font-medium italic text-center py-4">Yakın zamanda etkinlik yok.</p>
                )}
              </div>
            </Card>

            {/* Semester Progress */}
            {semesterInfo && (() => {
              const { percent, daysLeft } = computeSemesterProgress(semesterInfo);
              return (
                <Card className="p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border-none bg-white group">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-black text-slate-900">{semesterInfo.title}</h4>
                    <Badge className="bg-sky-50 text-sky-600 border-none px-3 py-1 font-bold text-[10px]">AKTİF DÖNEM</Badge>
                  </div>
                  <div className="relative h-4 bg-slate-50 rounded-full mb-3 overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-1000 shadow-lg"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      İLERLEME: %{percent}
                    </p>
                    <p className="text-xs font-black text-sky-600">
                      {daysLeft > 0 ? `${daysLeft} gün kaldı` : 'Dönem tamamlandı'}
                    </p>
                  </div>
                </Card>
              );
            })()}

            {/* AI Assistant Card */}
            <Card className="p-1 rounded-[2.5rem] bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-600 shadow-xl shadow-indigo-200/40 border-none group overflow-hidden">
              <div className="bg-white rounded-[2.3rem] p-7 h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-100">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 leading-none">AI Asistan</h4>
                    <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mt-1 inline-block">7/24 Kampüs Rehberi</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-medium mb-5 leading-relaxed italic">
                  "Kampüs hakkında ne öğrenmek istersin?"
                </p>
                <div className="relative mb-3">
                  <Input
                    placeholder="Merak ettiğini sor..."
                    className="h-14 pl-5 pr-12 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:border-sky-500 transition-all font-medium text-sm"
                    onFocus={() => navigate('/dashboard/ai-assistant')}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-sky-500 rounded-lg flex items-center justify-center shadow-md">
                    <ArrowRight className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Çevrimiçi</span>
                </div>
              </div>
            </Card>

            {/* Course Notes CTA */}
            <Card className="p-8 rounded-[2.5rem] bg-slate-900 text-white border-none shadow-2xl shadow-slate-900/20 group relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-sky-400" />
                  </div>
                  <h4 className="font-black">Ders Notları</h4>
                </div>
                <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed">
                  Kampüsteki en iyi ders notlarını keşfet veya kendi notlarını paylaşarak topluluğa katkı sağla.
                </p>
                <Button
                  variant="outline"
                  className="w-full h-12 bg-white/5 border-white/10 text-white rounded-2xl font-bold hover:bg-white hover:text-slate-900 transition-all group"
                  onClick={() => navigate('/dashboard/course-notes')}
                >
                  Notları Keşfet
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl" />
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

// ─── Feed Card Components ─────────────────────────────────────────────────────

function ForumFeedCard({ item, navigate }: { item: FeedItem; navigate: (p: string) => void }) {
  const initial = item.author_name[0]?.toUpperCase() || 'A';
  const tags = Array.isArray(item.tags) ? item.tags : [];

  return (
    <Card
      className="p-6 bg-white hover:shadow-2xl hover:shadow-sky-100/50 transition-all duration-300 rounded-[2rem] border-none group cursor-pointer"
      onClick={() => navigate(`/dashboard/forum/${item.id}`)}
    >
      <div className="flex items-start gap-4 mb-4">
        <Avatar className="h-12 w-12 shrink-0 rounded-2xl shadow-sm ring-4 ring-slate-50 transition-transform group-hover:scale-105">
          <AvatarFallback className="text-sm font-black bg-sky-100 text-sky-600 rounded-2xl">{initial}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-black text-slate-900 text-sm tracking-tight">{item.author_name}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{timeAgo(item.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-sky-50 text-sky-600 border-none font-black text-[10px] px-2 py-0.5 rounded-lg">FORUM</Badge>
          </div>
        </div>
        <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-sky-50 transition-colors">
          <MessageCircle className="w-5 h-5 text-slate-300 group-hover:text-sky-500" />
        </div>
      </div>

      <h4 className="font-black text-lg mb-4 line-clamp-2 text-slate-800 group-hover:text-sky-600 transition-colors leading-snug">{item.title}</h4>

      <div className="flex items-center justify-between pt-5 border-t border-slate-50">
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-[10px] font-black px-3 py-1 rounded-lg bg-slate-50 text-slate-500 border border-slate-100 uppercase tracking-tighter">
              #{tag}
            </span>
          ))}
          {tags.length > 2 && <span className="text-[10px] font-bold text-slate-300 mt-1">+{tags.length - 2}</span>}
        </div>
        <div className="flex items-center gap-3 text-slate-300">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-tighter group-hover:text-sky-500 transition-colors">
            Konuyu Aç <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Card>
  );
}

function MarketplaceFeedCard({ item, navigate }: { item: FeedItem; navigate: (p: string) => void }) {
  const imageUrl = item.image_url ? getImageUrl(item.image_url) : undefined;

  return (
    <Card
      className="p-5 bg-white hover:shadow-2xl hover:shadow-amber-100/50 transition-all duration-300 rounded-[2rem] border-none group cursor-pointer overflow-hidden"
      onClick={() => navigate(`/dashboard/marketplace/${item.id}`)}
    >
      <div className="flex gap-6">
        <div className="w-28 h-28 rounded-[1.5rem] bg-slate-50 overflow-hidden shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-500">
          {imageUrl ? (
            <img src={imageUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-10 w-10 text-slate-200" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              {item.price && (
                <div className="px-3 py-1 bg-amber-50 rounded-xl border border-amber-100 shadow-sm">
                  <span className="text-xl font-black text-amber-600">
                    ₺{parseFloat(item.price).toLocaleString('tr-TR')}
                  </span>
                </div>
              )}
              <Badge className="bg-slate-50 text-slate-400 border-none font-black text-[10px] px-2 py-1 rounded-lg">PAZAR</Badge>
            </div>
            <h4 className="font-black text-base text-slate-800 mb-2 line-clamp-1 group-hover:text-amber-600 transition-colors">{item.title}</h4>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 rounded-lg">
                <AvatarFallback className="text-[10px] font-black bg-slate-100 text-slate-500 rounded-lg">{item.author_name[0]}</AvatarFallback>
              </Avatar>
              <span className="font-bold text-slate-500 truncate max-w-[100px]">{item.author_name}</span>
            </div>
            <span className="font-black uppercase tracking-tighter">{timeAgo(item.created_at)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CareerFeedCard({ item, navigate }: { item: FeedItem; navigate: (p: string) => void }) {
  const listingType = item.listing_type ?? '';

  return (
    <Card
      className="p-7 bg-white hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-300 rounded-[2rem] border-none group cursor-pointer relative overflow-hidden"
      onClick={() => navigate(`/dashboard/career/${item.id}`)}
    >
      {/* Decorative tag */}
      <div className={cn("absolute top-0 right-0 px-6 py-2 rounded-bl-[1.5rem] font-black text-[10px] tracking-widest text-white shadow-lg",
        listingType === 'job' ? "bg-blue-500" :
          listingType === 'internship' ? "bg-green-500" :
            listingType === 'startup' ? "bg-indigo-500" : "bg-amber-500"
      )}>
        {careerTypeLabels[listingType]?.toUpperCase() || 'KARİYER'}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
          <Briefcase className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{timeAgo(item.created_at)}</p>
          <h4 className="font-black text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">{item.title}</h4>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {item.company_name && (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-white group-hover:border-indigo-100 transition-all">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" />
            <span className="font-black text-xs text-slate-700">{item.company_name}</span>
          </div>
        )}
        {item.sector && (
          <span className="px-3 py-2 rounded-xl bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-tighter border border-slate-50">
            {item.sector}
          </span>
        )}
        {item.location && (
          <span className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-tighter ml-auto">
            <MapPin className="h-3.5 w-3.5 text-red-400" />{item.location}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-slate-50">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 rounded-lg">
            <AvatarFallback className="text-[10px] font-black bg-slate-100 text-slate-500 rounded-lg">{item.author_name[0]}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-bold text-slate-400 italic">Yayınlayan: {item.author_name}</span>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95">
          <MessageSquare className="h-3.5 w-3.5" />
          ŞİMDİ BAŞVUR
        </button>
      </div>
    </Card>
  );
}
