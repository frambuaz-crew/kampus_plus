import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
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
import { apiClient } from '../api/config';
import { getImageUrl } from '../utils/imageUrl';
import type { ForumTopic } from '../types/forum';
import type { MarketplaceListing } from '../types/marketplace';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CareerItem {
  id: string;
  listing_type: string;
  title: string;
  company_name?: string;
  location?: string;
  sector?: string;
  salary_range?: string;
  created_at: string;
}

interface FeedItem {
  id: string;
  type: 'forum' | 'marketplace' | 'career';
  date: string;
  forum?: ForumTopic;
  marketplace?: MarketplaceListing;
  career?: CareerItem;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const upcomingEvents = [
  { date: '15 Nis', title: 'Yazılım Kariyer Günleri', university: 'İTÜ', daysLeft: 10 },
  { date: '20 Nis', title: 'Vize Sınavları Başlıyor', university: 'Genel', daysLeft: 15 },
  { date: '25 Nis', title: 'AI Workshop', university: 'ODTÜ', daysLeft: 20 },
];

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

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dak önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

function getFirstImageUrl(imageUrls: string[] | string | null | undefined): string | undefined {
  if (!imageUrls) return undefined;
  if (Array.isArray(imageUrls)) return getImageUrl(imageUrls[0]);
  try {
    const parsed = JSON.parse(imageUrls) as string[];
    if (Array.isArray(parsed) && parsed.length > 0) return getImageUrl(parsed[0]);
  } catch { /* single url */ }
  return getImageUrl(imageUrls);
}

// ─── Stat card config ─────────────────────────────────────────────────────────

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

  // User info from localStorage
  const userRaw = localStorage.getItem('user');
  const userObj = userRaw ? (JSON.parse(userRaw) as { first_name?: string; id?: string; user_id?: string }) : null;
  const firstName = userObj?.first_name || 'Öğrenci';
  const currentUserId = userObj?.id || userObj?.user_id;

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [stats, setStats] = useState({ messages: 0, newMessages: 0, friends: 0, myListings: 0, aiMessages: 0 });

  // Load stats
  useEffect(() => {
    const loadStats = async () => {
      const [friendsRes, marketRes, aiRes, messagesRes] = await Promise.allSettled([
        apiClient.get('/friendships/friends'),
        apiClient.get('/marketplace/'),
        apiClient.get('/ai/remaining-messages'),
        apiClient.get('/messages/conversations?limit=1'),
      ]);

      const friendsTotal = friendsRes.status === 'fulfilled'
        ? ((friendsRes.value.data as { total?: number })?.total ?? 0)
        : 0;

      const allListings: MarketplaceListing[] = marketRes.status === 'fulfilled'
        ? (marketRes.value.data as MarketplaceListing[]) || []
        : [];
      const myListings = currentUserId
        ? allListings.filter((l) => l.seller_id === currentUserId || l.creator?.id === currentUserId).length
        : 0;

      const aiRemaining = aiRes.status === 'fulfilled'
        ? ((aiRes.value.data as { remaining_messages?: number })?.remaining_messages ?? 0)
        : 0;

      // Mesaj sayısı: conversations listesindeki total_unread
      let msgCount = 0;
      let newMsgCount = 0;
      if (messagesRes.status === 'fulfilled') {
        const data = messagesRes.value.data as { total?: number; total_unread?: number } | undefined;
        msgCount = data?.total ?? 0;
        newMsgCount = data?.total_unread ?? 0;
      }

      setStats({
        messages: msgCount,
        newMessages: newMsgCount,
        friends: friendsTotal,
        myListings,
        aiMessages: aiRemaining,
      });
    };
    void loadStats();
  }, [currentUserId]);

  useEffect(() => {
    const loadFeed = async () => {
      try {
        setFeedLoading(true);
        const [forumRes, marketRes, careerRes] = await Promise.allSettled([
          apiClient.get('/forum/topics', { params: { limit: 5, sort: 'newest' } }),
          apiClient.get('/marketplace/', { params: { limit: 5 } }),
          apiClient.get('/career/listings', { params: { limit: 5, sort: 'newest' } }),
        ]);

        const items: FeedItem[] = [];

        if (forumRes.status === 'fulfilled') {
          const topics: ForumTopic[] = forumRes.value.data?.topics || forumRes.value.data || [];
          topics.forEach((t) =>
            items.push({ id: `f-${t.id}`, type: 'forum', date: t.created_at, forum: t })
          );
        }

        if (marketRes.status === 'fulfilled') {
          const listings: MarketplaceListing[] = marketRes.value.data || [];
          listings.forEach((l) =>
            items.push({ id: `m-${l.id}`, type: 'marketplace', date: l.created_at || '', marketplace: l })
          );
        }

        if (careerRes.status === 'fulfilled') {
          const careers: CareerItem[] = careerRes.value.data?.items || careerRes.value.data || [];
          careers.forEach((c) =>
            items.push({ id: `c-${c.id}`, type: 'career', date: c.created_at, career: c })
          );
        }

        // Sort all by date descending, take latest 10
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setFeed(items.slice(0, 10));
      } catch {
        // silently ignore
      } finally {
        setFeedLoading(false);
      }
    };

    void loadFeed();
  }, []);

  const statCards: Stat[] = [
    {
      label: 'Mesajlar',
      value: stats.messages,
      sub: stats.newMessages > 0 ? `${stats.newMessages} yeni mesaj` : 'Yeni mesaj yok',
      icon: <MessageCircle className="w-5 h-5" />,
      color: 'bg-sky-50 text-[#0ea5e9]',
      route: '/dashboard/messages',
    },
    {
      label: 'İlanlarım',
      value: stats.myListings,
      sub: 'Aktif ilan',
      icon: <Tag className="w-5 h-5" />,
      color: 'bg-amber-50 text-amber-500',
      route: '/dashboard/marketplace',
    },
    {
      label: 'AI Sohbetler',
      value: stats.aiMessages,
      sub: `Bugün ${stats.aiMessages} mesaj hakkın kaldı`,
      icon: <Sparkles className="w-5 h-5" />,
      color: 'bg-emerald-50 text-emerald-500',
      route: '/dashboard/ai-assistant',
    },
  ];

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

            {feedLoading ? (
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
                  if (item.type === 'forum' && item.forum) {
                    return <ForumFeedCard key={item.id} topic={item.forum} navigate={navigate} />;
                  }
                  if (item.type === 'marketplace' && item.marketplace) {
                    return <MarketplaceFeedCard key={item.id} listing={item.marketplace} navigate={navigate} />;
                  }
                  if (item.type === 'career' && item.career) {
                    return <CareerFeedCard key={item.id} item={item.career} navigate={navigate} />;
                  }
                  return null;
                })}
              </div>
            )}
          </div>

          {/* ─── Widgets ─── */}
          <div className="lg:col-span-4 space-y-4">
            {/* Semester Progress */}
            <Card className="p-5">
              <h4 className="font-semibold text-slate-800 mb-3">Güz Dönemi 2024-2025</h4>
              <div className="space-y-2 text-sm text-slate-500 mb-4">
                <div className="flex justify-between">
                  <span>Başlangıç</span>
                  <span className="font-medium text-slate-700">25 Eylül 2024</span>
                </div>
                <div className="flex justify-between">
                  <span>Bitiş</span>
                  <span className="font-medium text-slate-700">15 Haziran 2025</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                <div className="h-2 rounded-full bg-[#0ea5e9]" style={{ width: '65%' }} />
              </div>
              <p className="text-xs text-slate-500">142 gün kaldı</p>
            </Card>

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
              <div className="space-y-4">
                {upcomingEvents.map((event, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <div className="flex-shrink-0 w-11 h-11 bg-sky-50 rounded-lg flex flex-col items-center justify-center border border-sky-100">
                      <span className="text-sm font-bold text-[#0ea5e9] leading-none">
                        {event.date.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-[#0ea5e9] leading-none mt-0.5">
                        {event.date.split(' ')[1]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{event.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100">{event.university}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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

function ForumFeedCard({ topic, navigate }: { topic: ForumTopic; navigate: (p: string) => void }) {
  const authorName = topic.author
    ? `${topic.author.first_name} ${topic.author.last_name}`.trim() || topic.author.username
    : 'Anonim';
  const initial = authorName[0]?.toUpperCase() || 'A';
  const avatarUrl = topic.author?.profile_picture_url
    ? getImageUrl(topic.author.profile_picture_url)
    : undefined;
  const tags = Array.isArray(topic.tags) ? topic.tags : [];

  return (
    <Card
      className="p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group"
      onClick={() => navigate(`/dashboard/forum/${topic.id}`)}
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
            <span className="font-medium text-slate-800 text-sm">{authorName}</span>
            {topic.author?.university && <span>· {topic.author.university}</span>}
            <span>· {timeAgo(topic.created_at)}</span>
          </div>
        </div>
        <span className="text-xs shrink-0 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">Forum</span>
      </div>

      <h4 className="font-semibold text-sm mb-1.5 line-clamp-2">{topic.title}</h4>
      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{topic.content}</p>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 bg-slate-50">{tag}</span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-slate-400 pt-3 border-t border-slate-100">
        <span className="flex items-center gap-1">
          <ThumbsUp className="h-3.5 w-3.5" />
          {topic.helpful_count}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          {topic.reply_count}
        </span>
        <span className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          {topic.view_count}
        </span>
      </div>
    </Card>
  );
}

function MarketplaceFeedCard({
  listing,
  navigate,
}: {
  listing: MarketplaceListing;
  navigate: (p: string) => void;
}) {
  const imageUrl = getFirstImageUrl(listing.image_urls);
  const sellerName = listing.creator
    ? `${listing.creator.first_name} ${listing.creator.last_name}`.trim()
    : listing.seller_name || 'Satıcı';
  const price =
    typeof listing.price === 'number'
      ? listing.price.toLocaleString('tr-TR')
      : String(listing.price);

  return (
    <Card
      className="p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group"
      onClick={() => navigate(`/dashboard/marketplace/${listing.id}`)}
    >
      <div className="flex gap-4">
        <div className="w-20 h-20 rounded-lg bg-slate-100 overflow-hidden shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-7 w-7 text-slate-300" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-lg font-bold text-slate-800">₺{price}</span>
            <span className="text-[10px] shrink-0 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">Pazar</span>
          </div>
          <h4 className="font-semibold text-sm mb-1 line-clamp-1">{listing.title}</h4>
          {listing.condition && (
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 mb-1.5">
              {listing.condition}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>{sellerName}</span>
            {listing.creator?.university && <span>· {listing.creator.university}</span>}
            {listing.created_at && (
              <span className="ml-auto">{timeAgo(listing.created_at)}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function CareerFeedCard({
  item,
  navigate,
}: {
  item: CareerItem;
  navigate: (p: string) => void;
}) {
  return (
    <Card
      className="p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group"
      onClick={() => navigate(`/dashboard/career/${item.id}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-md font-medium ${careerTypeColors[item.listing_type] || 'bg-slate-100 text-slate-700'}`}
        >
          {careerTypeLabels[item.listing_type] || item.listing_type}
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
          <span className="px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 bg-slate-50">{item.sector}</span>
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
    </Card>
  );
}
