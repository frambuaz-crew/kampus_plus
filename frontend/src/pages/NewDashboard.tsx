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
import { getImageUrl } from '../utils/imageUrl';
import { getStudentDashboard } from '../api/dashboard';
import type { DashboardResponse, FeedItem, EventItem, SemesterInfo } from '../api/dashboard';

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

interface Stat {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  route: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const NewDashboard: React.FC = () => {
  const navigate = useNavigate();

  const userRaw = localStorage.getItem('user');
  const userObj = userRaw ? (JSON.parse(userRaw) as { first_name?: string }) : null;
  const firstName = userObj?.first_name || 'Öğrenci';

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

  const statCards: Stat[] = [
    {
      label: 'Mesajlar',
      value: unread,
      sub: unread > 0 ? `${unread} okunmamış mesaj` : 'Okunmamış mesaj yok',
      icon: <MessageCircle className="w-5 h-5" />,
      color: 'bg-sky-50 text-[#0ea5e9]',
      route: '/dashboard/messages',
    },
    {
      label: 'İlanlarım',
      value: activeListings,
      sub: 'Aktif ilan',
      icon: <Tag className="w-5 h-5" />,
      color: 'bg-amber-50 text-amber-500',
      route: '/dashboard/marketplace',
    },
    {
      label: 'AI Sohbetler',
      value: aiRemaining,
      sub: `Bugün ${aiRemaining} mesaj hakkın kaldı`,
      icon: <Sparkles className="w-5 h-5" />,
      color: 'bg-emerald-50 text-emerald-500',
      route: '/dashboard/ai-assistant',
    },
  ];

  const feed = dashboard?.recent_feed ?? [];
  const semesterInfo = dashboard?.semester_info ?? null;
  const upcomingEvents = dashboard?.upcoming_events ?? [];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">

        {/* ─── Welcome Header ─── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Hoş geldin, {firstName}! 👋
          </h1>
          <p className="text-sm text-slate-500">İşte bugünkü kampüs özetin</p>
        </div>

        {/* ─── Stats Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {statCards.map((s) => (
            <Card
              key={s.label}
              className="p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              onClick={() => navigate(s.route)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">{s.label}</span>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                  {s.icon}
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{s.value}</p>
              <p className="text-xs text-slate-400 leading-tight">{s.sub}</p>
            </Card>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ─── Son Gönderiler Feed ─── */}
          <div className="lg:col-span-8 space-y-4">
            <h2 className="text-base font-semibold text-slate-700">Son Gönderiler</h2>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
                    <div className="flex gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-muted rounded w-1/3" />
                        <div className="h-4 bg-muted rounded w-3/4" />
                      </div>
                    </div>
                    <div className="h-3 bg-muted rounded w-full mb-1" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : feed.length === 0 ? (
              <Card className="p-10 text-center">
                <p className="text-muted-foreground text-sm">Henüz gönderi yok.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Forum, Pazar veya Kariyer'e ilk katkıyı sen yap!
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {feed.map((item) => {
                  if (item.type === 'forum') {
                    return <ForumFeedCard key={`forum-${item.id}`} item={item} navigate={navigate} />;
                  }
                  if (item.type === 'marketplace') {
                    return <MarketplaceFeedCard key={`market-${item.id}`} item={item} navigate={navigate} />;
                  }
                  if (item.type === 'career') {
                    return <CareerFeedCard key={`career-${item.id}`} item={item} navigate={navigate} />;
                  }
                  return null;
                })}
              </div>
            )}
          </div>

          {/* ─── Widgets ─── */}
          <div className="lg:col-span-4 space-y-4">
            {/* Semester Progress */}
            {semesterInfo && (() => {
              const { percent, daysLeft } = computeSemesterProgress(semesterInfo);
              return (
                <Card className="p-5">
                  <h4 className="font-semibold text-slate-800 mb-3">{semesterInfo.title}</h4>
                  <div className="space-y-2 text-sm text-slate-500 mb-4">
                    <div className="flex justify-between">
                      <span>Başlangıç</span>
                      <span className="font-medium text-slate-700">
                        {formatDisplayDate(semesterInfo.start_date)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bitiş</span>
                      <span className="font-medium text-slate-700">
                        {formatDisplayDate(semesterInfo.end_date)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-[#0ea5e9]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {daysLeft > 0 ? `${daysLeft} gün kaldı` : 'Dönem tamamlandı'}
                  </p>
                </Card>
              );
            })()}

            {/* Upcoming Events */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-800">Yaklaşan Etkinlikler</h4>
                <button
                  className="text-xs text-[#0ea5e9] hover:underline"
                  onClick={() => navigate('/dashboard/academic-calendar')}
                >
                  Takvimi Gör →
                </button>
              </div>
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-slate-400">Yaklaşan etkinlik bulunamadı.</p>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => {
                    const { day, month } = formatEventDate(event.start_date);
                    const typeLabel = event.event_type
                      ? (eventTypeLabels[event.event_type] ?? event.event_type)
                      : 'Etkinlik';
                    return (
                      <div key={event.id} className="flex gap-3 items-center">
                        <div className="flex-shrink-0 w-11 h-11 bg-sky-50 rounded-lg flex flex-col items-center justify-center border border-sky-100">
                          <span className="text-sm font-bold text-[#0ea5e9] leading-none">{day}</span>
                          <span className="text-[10px] text-[#0ea5e9] leading-none mt-0.5">{month}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{event.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100">
                              {typeLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* AI Quick Ask */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#0ea5e9] flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-semibold text-slate-800">AI Asistanına Sor</h4>
              </div>
              <Input
                placeholder="Hızlı soru sor..."
                className="mb-2 bg-white text-sm"
                onFocus={() => navigate('/dashboard/ai-assistant')}
              />
              <Button
                size="sm"
                className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white"
                onClick={() => navigate('/dashboard/ai-assistant')}
              >
                Sor
              </Button>
            </Card>

            {/* Course Notes CTA */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-[#0ea5e9] shrink-0" />
                <h4 className="font-semibold text-slate-800">Ders Notları</h4>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Diğer öğrencilerin paylaştığı ders notlarına göz at.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate('/dashboard/course-notes')}
              >
                Notları Keşfet
                <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
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
      className="p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group"
      onClick={() => navigate(`/dashboard/forum/${item.id}`)}
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
            <span className="font-medium text-slate-800 text-sm">{item.author_name}</span>
            <span>· {timeAgo(item.created_at)}</span>
          </div>
        </div>
        <span className="text-xs shrink-0 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">Forum</span>
      </div>

      <h4 className="font-semibold text-sm mb-1.5 line-clamp-2">{item.title}</h4>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 bg-slate-50">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-slate-400 pt-3 border-t border-slate-100">
        <span className="flex items-center gap-1">
          <ThumbsUp className="h-3.5 w-3.5" />
          Forum konusu
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Eye className="h-3.5 w-3.5" />
          Görüntüle
        </span>
      </div>
    </Card>
  );
}

function MarketplaceFeedCard({ item, navigate }: { item: FeedItem; navigate: (p: string) => void }) {
  const imageUrl = item.image_url ? getImageUrl(item.image_url) : undefined;

  return (
    <Card
      className="p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group"
      onClick={() => navigate(`/dashboard/marketplace/${item.id}`)}
    >
      <div className="flex gap-4">
        <div className="w-20 h-20 rounded-lg bg-slate-100 overflow-hidden shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-7 w-7 text-slate-300" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            {item.price && (
              <span className="text-lg font-bold text-slate-800">
                ₺{parseFloat(item.price).toLocaleString('tr-TR')}
              </span>
            )}
            <span className="text-[10px] shrink-0 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">Pazar</span>
          </div>
          <h4 className="font-semibold text-sm mb-1 line-clamp-1">{item.title}</h4>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>{item.author_name}</span>
            <span className="ml-auto">{timeAgo(item.created_at)}</span>
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
      className="p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group"
      onClick={() => navigate(`/dashboard/career/${item.id}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-md font-medium ${careerTypeColors[listingType] || 'bg-slate-100 text-slate-700'}`}
        >
          {careerTypeLabels[listingType] || listingType || 'Kariyer'}
        </span>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(item.created_at)}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">Kariyer</span>
        </div>
      </div>

      <h4 className="font-semibold text-sm mb-2 text-slate-800">{item.title}</h4>

      <div className="flex flex-wrap gap-1.5 text-xs text-slate-500">
        {item.company_name && (
          <span className="font-medium text-slate-700">{item.company_name}</span>
        )}
        {item.sector && (
          <span className="px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 bg-slate-50">
            {item.sector}
          </span>
        )}
        {item.location && (
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />{item.location}
          </span>
        )}
        {item.salary_range && (
          <span className="text-green-600 font-medium">{item.salary_range}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
        <span>{item.author_name}</span>
        <span className="flex items-center gap-1 ml-auto">
          <MessageSquare className="h-3 w-3" />
          Başvur
        </span>
      </div>
    </Card>
  );
}
