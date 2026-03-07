/**
 * Career Page
 *
 * Spec: 008-career-page/spec.md
 * Design: Figma export + KAMPUS+ integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Briefcase,
  GraduationCap,
  Rocket,
  Users,
  MapPin,
  Building2,
  Clock,
  TrendingUp,
  Eye,
  ArrowLeft,
  Check,
  Sparkles,
  Info,
  Flag,
  ExternalLink,
  Bookmark,
} from 'lucide-react';
import { apiClient } from '../api/config';
import { getImageUrl } from '../utils/imageUrl';
import { MainLayout } from '../components/layout/MainLayout';

// ─── Types ────────────────────────────────────────────────────────────────────────────

type ListingType = 'job' | 'internship' | 'startup' | 'project';
type SortOrder = 'newest' | 'oldest';

interface FavoriteRecord {
  target_id: string;
}

interface BackState {
  from?: string;
  tab?: string;
}

const isUnauthorizedError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { status?: number } }).response?.status === 'number' &&
    (error as { response?: { status?: number } }).response?.status === 401
  );
};

interface CareerListing {
  id: string;
  listing_type: ListingType;
  title: string;
  description: string;
  sector: string;
  location: string;
  company_name?: string;
  external_link?: string;
  salary_range?: string;
  required_position?: string;
  duration?: 'short_term' | 'long_term';
  payment_type?: string;
  status: 'active' | 'archived' | 'deleted';
  view_count: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    username: string;
    full_name?: string;
    university?: string;
    department?: string;
    profile_picture_url?: string;
  };
}

interface NewListingForm {
  listing_type: ListingType | '';
  title: string;
  description: string;
  sector: string;
  location: string;
  company_name: string;
  external_link: string;
  salary_range: string;
  required_position: string;
  duration: 'short_term' | 'long_term' | '';
  payment_type: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ListingType, {
  label: string; labelFull: string; desc: string;
  Icon: React.FC<{ className?: string }>;
  gradient: string; bgLight: string; textColor: string; borderActive: string; badgeBg: string;
}> = {
  job: { label: 'İş İlanı', labelFull: 'İş İlanı', desc: 'Tam veya yarı zamanlı pozisyon', Icon: Briefcase, gradient: 'from-blue-500 to-blue-600', bgLight: 'bg-blue-50', textColor: 'text-blue-700', borderActive: 'border-blue-500', badgeBg: 'bg-blue-100' },
  internship: { label: 'Staj', labelFull: 'Staj İlanı', desc: 'Öğrencilere özel staj fırsatı', Icon: GraduationCap, gradient: 'from-emerald-500 to-teal-600', bgLight: 'bg-emerald-50', textColor: 'text-emerald-700', borderActive: 'border-emerald-500', badgeBg: 'bg-emerald-100' },
  startup: { label: 'Startup', labelFull: 'Startup Ekibi', desc: 'Girişim için kurucu ortak ara', Icon: Rocket, gradient: 'from-violet-500 to-purple-600', bgLight: 'bg-violet-50', textColor: 'text-violet-700', borderActive: 'border-violet-500', badgeBg: 'bg-violet-100' },
  project: { label: 'Proje', labelFull: 'Proje Arkadaşı', desc: 'Proje geliştirmek için ekip', Icon: Users, gradient: 'from-amber-500 to-amber-600', bgLight: 'bg-amber-50', textColor: 'text-amber-700', borderActive: 'border-amber-500', badgeBg: 'bg-amber-100' },
};

const SECTORS = ['Yazılım', 'Mühendislik', 'Tasarım', 'Pazarlama', 'Veri Bilimi', 'Diğer'];
const LOCATIONS = ['Remote', 'Ankara', 'İstanbul', 'İzmir', 'Konya', 'Diğer'];
const PAYMENT_TYPES = [
  { value: 'paid', label: 'Üretli' },
  { value: 'unpaid', label: 'Ücretsiz' },
  { value: 'project_based', label: 'Proje Bazlı' },
  { value: 'equity', label: 'Hisse Ortaklığı' },
  { value: 'learning', label: 'Öğrenme Amaçlı' },
];
const PAYMENT_LABELS: Record<string, string> = {
  paid: 'Üretli', unpaid: 'Ücretsiz', project_based: 'Proje Bazlı', equity: 'Hisse Ortaklığı', learning: 'Öğrenme Amaçlı',
};
const DURATION_LABELS: Record<string, string> = {
  short_term: 'Kısa Vadeli (1-3 ay)', long_term: 'Uzun Vadeli (3+ ay)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dakönce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)} hafta önce`;
  return `${Math.floor(diff / 2592000)} ay önce`;
}

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}

// ─── FormField (module-level to prevent focus loss) ──────────────────────────────

const FormField: React.FC<{ label: string; required?: boolean; hint?: string; counter?: string; error?: string; children: React.ReactNode }> = ({
  label, required, hint, counter, error, children,
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <label className="text-sm font-semibold text-slate-900">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {counter && <span className="text-xs text-slate-500">{counter}</span>}
    </div>
    {children}
    {hint && !error && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
    {error && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">⚠ {error}</p>}
  </div>
);

// ─── Listing Card ──────────────────────────────────────────────────────────────────

const ListingCard: React.FC<{ listing: CareerListing; onClick: () => void }> = ({ listing, onClick }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        const response = await apiClient.get("/users/favorites/all");
        if (response.data && response.data.favorites) {
          const isFav = response.data.favorites.some(
            (fav: FavoriteRecord) => fav.target_id === listing.id
          );
          setIsFavorite(isFav);
        }
      } catch (error) {
        console.error("Error checking favorites", error);
      }
    };
    checkFavoriteStatus();
  }, [listing.id]);

  const toggleFavorite = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const payload = {
        target_type: "career_listing",
        target_id: listing.id
      };
      const response = await apiClient.post("/users/favorites/toggle", payload);
      if (response.data && response.data.success) {
        setIsFavorite(response.data.action === "added");
      }
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        alert("Favorilere eklemek için giriş yapmalısınız.");
      }
    }
  };

  const cfg = TYPE_CONFIG[listing.listing_type];
  const TypeIcon = cfg.Icon;
  const subtitle = (listing.listing_type === 'job' || listing.listing_type === 'internship')
    ? listing.company_name
    : listing.required_position;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer group relative"
    >
      <button
        onClick={toggleFavorite}
        className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex items-center justify-center"
        title={isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}
      >
        <Bookmark className={`w-5 h-5 ${isFavorite ? 'fill-indigo-600 text-indigo-600' : ''}`} />
      </button>

      <div className="flex items-start justify-between mb-4 pr-10">
        <div className={`flex items-center gap-2 px-3 py-1.5 ${cfg.bgLight} border rounded-lg`} style={{ borderColor: 'transparent' }}>
          <TypeIcon className={`w-4 h-4 ${cfg.textColor}`} />
          <span className={`text-xs font-semibold ${cfg.textColor}`}>{cfg.labelFull}</span>
        </div>
        <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3" />
          {timeAgo(listing.created_at)}
        </span>
      </div>

      <h3 className="text-base font-semibold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2 pr-2">
        {listing.title}
      </h3>

      {subtitle && (
        <p className="text-sm text-slate-600 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="truncate">{subtitle}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
          <MapPin className="w-3 h-3" />{listing.location}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
          {listing.sector}
        </span>
        {listing.salary_range && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
            {listing.salary_range}
          </span>
        )}
        {listing.payment_type && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
            {PAYMENT_LABELS[listing.payment_type] || listing.payment_type}
          </span>
        )}
        {listing.duration && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
            {DURATION_LABELS[listing.duration] || listing.duration}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <Link
          to={`/dashboard/profile/${listing.creator?.username}`}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {listing.creator?.profile_picture_url ? (
            <>
              <img
                src={getImageUrl(listing.creator.profile_picture_url)}
                alt={listing.creator.username || 'Creator'}
                className="w-8 h-8 rounded-lg object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 items-center justify-center text-white text-xs font-semibold" style={{ display: 'none' }}>
                {listing.creator?.username?.charAt(0).toUpperCase() || '?'}
              </div>
            </>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
              {listing.creator?.username?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div className="text-xs">
            <p className="font-semibold text-slate-900">
              {listing.creator ? `${listing.creator.full_name || listing.creator.username}` : "İlan Sahibi"}
            </p>
            <p className="text-slate-500 font-medium tracking-wide">
              {listing.creator?.university || "Kampüs İçi Öğrenci"}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-1 text-slate-400 text-xs">
          <Eye className="w-3.5 h-3.5" />
          {listing.view_count}
        </div>
      </div>
    </div>
  );
};

// ─── Detail View ──────────────────────────────────────────────────────────────────

const ListingDetailView: React.FC<{
  listing: CareerListing;
  onBack: () => void;
  currentUserId: string | null;
  onDelete: (id: string) => void;
}> = ({ listing, onBack, currentUserId, onDelete }) => {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[listing.listing_type];
  const TypeIcon = cfg.Icon;
  const isOwner = currentUserId && listing.creator?.id === currentUserId;
  const [reportReason, setReportReason] = useState('');
  const [showReportBox, setShowReportBox] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        const response = await apiClient.get("/users/favorites/all");
        if (response.data && response.data.favorites) {
          const isFav = response.data.favorites.some(
            (fav: FavoriteRecord) => fav.target_id === listing.id
          );
          setIsFavorite(isFav);
        }
      } catch (error) {
        console.error("Error checking favorites", error);
      }
    };
    checkFavoriteStatus();
  }, [listing.id]);

  const toggleFavorite = async () => {
    try {
      const payload = {
        target_type: "career_listing",
        target_id: listing.id
      };
      const response = await apiClient.post("/users/favorites/toggle", payload);
      if (response.data && response.data.success) {
        setIsFavorite(response.data.action === "added");
      }
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        alert("Favorilere eklemek için giriş yapmalısınız.");
      }
    }
  };

  const isJobOrInternship = listing.listing_type === 'job' || listing.listing_type === 'internship';

  const handleApply = async () => {
    if (!applyMsg.trim()) return;
    try {
      setApplyLoading(true);
      const res = await apiClient.post(`/career/listings/${listing.id}/apply`, { message_text: applyMsg });
      const convId = res.data?.conversation_id;
      setApplySuccess(true);
      if (convId) navigate(`/dashboard/messages/${convId}`);
    } catch { alert('Başvuru gönderilemedi.'); }
    finally { setApplyLoading(false); }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    try {
      await apiClient.post(`/career/listings/${listing.id}/report`, { reason: reportReason });
      setReportSent(true); setShowReportBox(false);
    } catch { alert('Rapor gönderilemedi.'); }
  };

  return (
    <div className="max-w-3xl">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors mb-6 font-medium text-sm">
        <ArrowLeft className="w-4 h-4" /> Kariyer'e Dön
      </button>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className={`h-1.5 bg-gradient-to-r ${cfg.gradient}`} />

        <div className={`p-7 border-b ${cfg.bgLight}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3 ${cfg.bgLight}`}>
                <TypeIcon className={`w-4 h-4 ${cfg.textColor}`} />
                <span className={`text-xs font-bold ${cfg.textColor}`}>{cfg.labelFull}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">{listing.title}</h1>
              {listing.company_name && (
                <p className="text-slate-600 mt-1 font-medium flex items-center gap-2"><Building2 className="w-4 h-4" /> {listing.company_name}</p>
              )}
              {listing.required_position && (
                <p className="text-slate-600 mt-1 font-medium">Aranan: {listing.required_position}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleFavorite}
                className={`p-2 rounded-full transition-colors flex items-center justify-center ${isFavorite ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600'}`}
                title={isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}
              >
                <Bookmark className={`w-5 h-5 ${isFavorite ? 'fill-indigo-600' : ''}`} />
              </button>
              {isOwner && (
                <button onClick={() => { if (window.confirm('İlanı silmek istiyor musunuz?')) onDelete(listing.id); }}
                  className="text-sm text-red-500 hover:text-red-700 font-medium whitespace-nowrap mt-1">
                  Sil
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 text-sm bg-white/80 px-3 py-1 rounded-full"><MapPin className="w-3.5 h-3.5" />{listing.location}</span>
            <span className="inline-flex items-center gap-1.5 text-sm bg-white/80 px-3 py-1 rounded-full">{listing.sector}</span>
            {listing.salary_range && <span className="inline-flex items-center gap-1.5 text-sm bg-white/80 px-3 py-1 rounded-full">{listing.salary_range}</span>}
            {listing.payment_type && <span className="inline-flex items-center gap-1.5 text-sm bg-white/80 px-3 py-1 rounded-full">{PAYMENT_LABELS[listing.payment_type] || listing.payment_type}</span>}
            {listing.duration && <span className="inline-flex items-center gap-1.5 text-sm bg-white/80 px-3 py-1 rounded-full">{DURATION_LABELS[listing.duration] || listing.duration}</span>}
            <span className="inline-flex items-center gap-1.5 text-sm bg-white/80 px-3 py-1 rounded-full"><Clock className="w-3.5 h-3.5" />{timeAgo(listing.created_at)}</span>
          </div>
        </div>

        <div className="p-7 space-y-6">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-xs text-slate-500 uppercase font-bold mb-3 tracking-wide">İlan Veren</p>
            <Link to={`/dashboard/profile/${listing.creator?.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity w-fit">
              {listing.creator?.profile_picture_url ? (
                <>
                  <img
                    src={getImageUrl(listing.creator.profile_picture_url)}
                    alt={listing.creator.username || 'Creator'}
                    className="w-10 h-10 rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 items-center justify-center text-white font-bold" style={{ display: 'none' }}>
                    {listing.creator?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                </>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">
                  {listing.creator?.username?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900">
                  {listing.creator ? `${listing.creator.full_name || listing.creator.username}` : "İlan Sahibi"}
                </p>
                {listing.creator?.university && <p className="text-sm text-slate-500">{listing.creator.university}</p>}
                {listing.creator?.department && <p className="text-sm text-slate-500">{listing.creator.department}</p>}
              </div>
            </Link>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase font-bold mb-3 tracking-wide">Açıklama</p>
            <div className="text-slate-700 leading-relaxed whitespace-pre-line text-sm">{listing.description}</div>
          </div>

          {!isOwner && (
            <div className="border-t border-slate-100 pt-6">
              {isJobOrInternship ? (
                /* External apply button for job/internship */
                <div className={`rounded-xl border-2 ${cfg.borderActive} ${cfg.bgLight} p-5`}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center flex-shrink-0`}>
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className={`font-semibold ${cfg.textColor}`}>Harici Başvuru</p>
                      <p className="text-xs text-slate-500 mt-0.5">İlan sahibinin belirlediği platforma yönlendirileceksiniz</p>
                    </div>
                  </div>
                  <a href={listing.external_link} target="_blank" rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r ${cfg.gradient} text-white font-semibold rounded-lg hover:shadow-lg transition-all text-sm`}>
                    <ExternalLink className="w-4 h-4" /> İlana Başvur
                  </a>
                </div>
              ) : applySuccess ? (
                /* Success state */
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Check className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-800">Mesajınız gönderildi!</p>
                    <p className="text-sm text-emerald-600 mt-0.5">@{listing.creator?.username} size yanıt verecek. Mesajlar sayfasına yönlendiriliyorsunuz…</p>
                  </div>
                </div>
              ) : (
                /* Apply form */
                <div className={`rounded-xl border-2 ${cfg.borderActive} ${cfg.bgLight} overflow-hidden`}>
                  {/* Card header */}
                  <div className={`px-5 py-4 bg-gradient-to-r ${cfg.gradient}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                        <cfg.Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">
                          {listing.listing_type === 'startup' ? 'İlgileniyorum' : 'Katılmak İstiyorum'}
                        </p>
                        <p className="text-white/75 text-xs">
                          @{listing.creator?.username} adlı kullanıcıya mesaj gönder
                        </p>
                      </div>
                      {/* Recipient avatar */}
                      <div className="ml-auto w-9 h-9 rounded-lg bg-white/25 flex items-center justify-center text-white font-bold text-base">
                        {listing.creator?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    </div>
                  </div>

                  {/* Message area */}
                  <div className="p-5 bg-white">
                    <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                      Mesajınız
                    </label>
                    <textarea
                      value={applyMsg}
                      onChange={(e) => setApplyMsg(e.target.value.slice(0, 500))}
                      placeholder={
                        listing.listing_type === 'startup'
                          ? 'Kendinizi tanıtın, bu girişimde hangi rolde yer almak istediğinizi ve neler katabileceğinizi yazın…'
                          : 'Kendinizi tanıtın ve projeye neden katılmak istediğinizi açıklayın…'
                      }
                      rows={4}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent focus:bg-white resize-none transition-all"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-slate-400">
                        {applyMsg.length < 20 && applyMsg.length > 0 ? 'Biraz daha detay verin' : '\u00a0'}
                      </p>
                      <span className={`text-xs font-medium ${applyMsg.length >= 20 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {applyMsg.length}/500
                      </span>
                    </div>

                    <button
                      onClick={handleApply}
                      disabled={applyMsg.trim().length < 5 || applyLoading}
                      className={`w-full mt-3 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${applyMsg.trim().length >= 5 && !applyLoading
                        ? `bg-gradient-to-r ${cfg.gradient} text-white hover:shadow-lg hover:scale-[1.01]`
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                      {applyLoading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Gönderiliyor…
                        </>
                      ) : (
                        <>
                          <cfg.Icon className="w-4 h-4" />
                          {listing.listing_type === 'startup' ? 'İlgileniyorum — Mesaj Gönder' : 'Katılmak İstiyorum — Mesaj Gönder'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-slate-100 pt-4">
            {reportSent ? (
              <p className="text-sm text-emerald-600 flex items-center gap-2"><Check className="w-4 h-4" /> Raporunuz alındı.</p>
            ) : showReportBox ? (
              <div className="space-y-2">
                <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Uygunsuzluk nedenini açıklayın..."
                  rows={2}
                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
                <div className="flex gap-2">
                  <button onClick={handleReport} className="text-sm px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium">Raporu Gönder</button>
                  <button onClick={() => setShowReportBox(false)} className="text-sm px-4 py-1.5 text-slate-500 hover:text-slate-700">İptal</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowReportBox(true)} className="text-sm text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5" /> Uygunsuz İlan Bildir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── New Listing Form ───────────────────────────────────────────────────────────────

const NewListingFormView: React.FC<{
  onCancel: () => void;
  onSuccess: () => void;
}> = ({ onCancel, onSuccess }) => {
  const [form, setForm] = useState<NewListingForm>({
    listing_type: '', title: '', description: '', sector: '', location: '',
    company_name: '', external_link: '', salary_range: '',
    required_position: '', duration: '', payment_type: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof NewListingForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (key: keyof NewListingForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof NewListingForm, string>> = {};
    if (!form.listing_type) e.listing_type = 'İlan türü seçiniz.';
    if (form.title.length < 10 || form.title.length > 100) e.title = 'Başlık 10-100 karakter arasında olmalıdır.';
    if (form.description.length < 50) e.description = 'Açıklama en az 50 karakter olmalıdır.';
    if (!form.sector) e.sector = 'Sektör seçiniz.';
    if (!form.location) e.location = 'Lokasyon seçiniz.';
    if ((form.listing_type === 'job' || form.listing_type === 'internship') && !form.external_link)
      e.external_link = 'Başvuru linki zorunludur.';
    if ((form.listing_type === 'startup' || form.listing_type === 'project') && !form.required_position)
      e.required_position = 'Aranan pozisyon zorunludur.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      const payload: Record<string, string> = {};
      Object.entries(form).forEach(([k, v]) => { if (v) payload[k] = v; });
      await apiClient.post('/career/listings', payload);
      setSuccess(true);
    } catch { alert('İlan oluşturulamadı. Lütfen tekrar deneyin.'); }
    finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setSuccess(false);
    setForm({ listing_type: '', title: '', description: '', sector: '', location: '', company_name: '', external_link: '', salary_range: '', required_position: '', duration: '', payment_type: '' });
    setErrors({});
  };

  const isJobOrInternship = form.listing_type === 'job' || form.listing_type === 'internship';
  const isStartupOrProject = form.listing_type === 'startup' || form.listing_type === 'project';
  const selectedCfg = form.listing_type ? TYPE_CONFIG[form.listing_type as ListingType] : null;

  const step2Ready = !!form.listing_type;
  const step3Ready = step2Ready && !!form.title && !!form.description && !!form.sector && !!form.location;

  const isFormValid = () => {
    if (!form.listing_type || !form.title || !form.description || !form.sector || !form.location) return false;
    if (isJobOrInternship) return !!form.external_link;
    if (isStartupOrProject) return !!form.required_position;
    return false;
  };

  const inputCls = (err?: string) =>
    `w-full px-4 py-3 bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all ${err ? 'border-red-300 bg-red-50' : 'border-slate-300'}`;

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${selectedCfg?.gradient || 'from-indigo-600 to-purple-600'}`} />
            <div className="p-8 text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${selectedCfg?.gradient || 'from-indigo-600 to-purple-600'} flex items-center justify-center`}>
                <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">İlan Başarıyla Yayınlandı!</h2>
              <p className="text-slate-600 mb-8">Tüm öğrenciler tarafından görülebilir.</p>
              <div className="space-y-3">
                <button onClick={onSuccess} className={`w-full px-6 py-3 bg-gradient-to-r ${selectedCfg?.gradient || 'from-indigo-600 to-purple-600'} text-white rounded-lg font-semibold hover:shadow-lg transition-all`}>
                  İlanları Görüntüle
                </button>
                <button onClick={resetForm} className="w-full px-6 py-3 bg-slate-100 text-slate-900 rounded-lg font-semibold hover:bg-slate-200 transition-colors">
                  Yeni İlan Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onCancel} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-6 font-medium text-sm">
        <ArrowLeft className="w-4 h-4" /> Geri Dön
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${selectedCfg?.gradient || 'from-indigo-600 to-purple-600'}`}>
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Yeni İlan Oluştur</h1>
          <p className="text-sm text-slate-600">Admin onayı gerekmez, hemen yayına alınır</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* SECTION 1 — Type */}
        <div className="bg-white rounded-xl border border-slate-200 p-7 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-sm">1</span>
            </div>
            <h2 className="text-base font-semibold text-slate-900">İlan Türünü Seçin</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(Object.entries(TYPE_CONFIG) as [ListingType, typeof TYPE_CONFIG[ListingType]][]).map(([type, cfg]) => {
              const IconComp = cfg.Icon;
              const isSelected = form.listing_type === type;
              return (
                <button key={type} type="button" onClick={() => set('listing_type', type)}
                  className={`relative text-left p-5 border-2 rounded-xl transition-all ${isSelected ? `${cfg.borderActive} ${cfg.bgLight} shadow-md` : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}>
                  {isSelected && (
                    <div className={`absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}>
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isSelected ? `bg-gradient-to-br ${cfg.gradient}` : 'bg-slate-100'}`}>
                      <IconComp className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold mb-1 ${isSelected ? cfg.textColor : 'text-slate-900'}`}>{cfg.labelFull}</div>
                      <div className="text-xs text-slate-500">{cfg.desc}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {errors.listing_type && <p className="text-xs text-red-500 mt-3">⚠ {errors.listing_type}</p>}
        </div>

        {/* SECTION 2 — Basic Info (visible after type selected) */}
        {step2Ready && (
          <div className="bg-white rounded-xl border border-slate-200 p-7 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-indigo-600 font-bold text-sm">2</span>
              </div>
              <h2 className="text-base font-semibold text-slate-900">Temel Bilgiler</h2>
            </div>

            <div className="space-y-5">
              <FormField label="İlan Başlığı" required counter={`${form.title.length}/100`}
                hint="Net ve açıklayıcı bir başlık yazın" error={errors.title}>
                <input type="text" value={form.title} onChange={(e) => set('title', e.target.value.slice(0, 100))}
                  placeholder="Örn: Senior Frontend Developer Aranıyor"
                  className={inputCls(errors.title)} />
              </FormField>

              <FormField label="Açıklama" required counter={`${form.description.length}/2000`}
                hint="Minimum 50 karakter gerekli" error={errors.description}>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value.slice(0, 2000))}
                  placeholder="İş tanımını, gereksinimlerinizi ve sunduklarınızı detaylı açıklayın..."
                  rows={5} className={`${inputCls(errors.description)} resize-none`} />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField label="Sektör" required error={errors.sector}>
                  <select value={form.sector} onChange={(e) => set('sector', e.target.value)} className={inputCls(errors.sector)}>
                    <option value="">Seçiniz</option>
                    {SECTORS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="Lokasyon" required error={errors.location}>
                  <select value={form.location} onChange={(e) => set('location', e.target.value)} className={inputCls(errors.location)}>
                    <option value="">Seçiniz</option>
                    {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </FormField>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3 — Type-specific fields (visible after basics filled) */}
        {step3Ready && (
          <div className="bg-white rounded-xl border border-slate-200 p-7 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-indigo-600 font-bold text-sm">3</span>
              </div>
              <h2 className="text-base font-semibold text-slate-900">Ek Detaylar</h2>
            </div>

            {isJobOrInternship && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField label="Şirket Adı" hint="Opsiyonel">
                    <input type="text" value={form.company_name} onChange={(e) => set('company_name', e.target.value)}
                      placeholder="Örn: TechCorp A.Ş." className={inputCls()} />
                  </FormField>
                  <FormField label="Maaş Aralığı" hint="Opsiyonel">
                    <input type="text" value={form.salary_range} onChange={(e) => set('salary_range', e.target.value)}
                      placeholder="Örn: 25.000 - 35.000 TL" className={inputCls()} />
                  </FormField>
                </div>
                <FormField label="Başvuru Linki" required hint="LinkedIn, Kariyer.net, şirket sitesi vb." error={errors.external_link}>
                  <div className="relative">
                    <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="url" value={form.external_link} onChange={(e) => set('external_link', e.target.value)}
                      placeholder="https://linkedin.com/jobs/..." className={`${inputCls(errors.external_link)} pl-10`} />
                  </div>
                </FormField>
              </div>
            )}

            {isStartupOrProject && (
              <div className="space-y-5">
                <FormField label="Aranan Pozisyon / Beceri" required error={errors.required_position}>
                  <input type="text" value={form.required_position} onChange={(e) => set('required_position', e.target.value)}
                    placeholder="Örn: CTO, UI Designer, Backend Developer" className={inputCls(errors.required_position)} />
                </FormField>

                {form.listing_type === 'project' && (
                  <FormField label="Proje Süresi">
                    <div className="flex gap-3">
                      {(['short_term', 'long_term'] as const).map((d) => (
                        <label key={d} className={`flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${form.duration === d ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-200 hover:border-slate-300 text-slate-600'
                          }`}>
                          <input type="radio" name="duration" value={d} checked={form.duration === d} onChange={() => set('duration', d)} className="sr-only" />
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${form.duration === d ? 'border-amber-500' : 'border-slate-300'}`}>
                            {form.duration === d && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                          </div>
                          <span className="text-xs font-semibold">{d === 'short_term' ? 'Kısa Vadeli' : 'Uzun Vadeli'}</span>
                        </label>
                      ))}
                    </div>
                  </FormField>
                )}

                <FormField label="Ödeme Durumu">
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_TYPES.filter((p) =>
                      form.listing_type === 'startup'
                        ? ['paid', 'unpaid', 'project_based', 'equity'].includes(p.value)
                        : ['paid', 'unpaid', 'learning'].includes(p.value)
                    ).map((p) => (
                      <button key={p.value} type="button" onClick={() => set('payment_type', p.value)}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl border-2 transition-all ${form.payment_type === p.value ? 'border-violet-400 bg-violet-50 text-violet-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </FormField>
              </div>
            )}
          </div>
        )}

        {/* SUBMIT SECTION */}
        {step2Ready && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
            <div className="flex items-start gap-3 mb-5">
              <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700">
                İlanınız yayınlandıktan sonra tüm KAMPÜ S+ kullanıcıları tarafından görüntülenebilecek. Admin onayı gerektirmez.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <button type="button" onClick={onCancel} className="px-6 py-2.5 text-slate-700 font-medium hover:text-slate-900 transition-colors text-sm">
                İptal
              </button>
              <button type="submit" disabled={!isFormValid() || submitting}
                className={`px-8 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 text-sm ${isFormValid() && !submitting
                  ? `bg-gradient-to-r ${selectedCfg?.gradient || 'from-indigo-600 to-purple-600'} text-white hover:shadow-lg hover:scale-[1.02]`
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}>
                {submitting ? (
                  <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Yayınlanıyor...</>
                ) : (
                  <><Sparkles className="w-4 h-4" />İlanı Yayınla</>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────────────

export const CareerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [listings, setListings] = useState<CareerListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<CareerListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<ListingType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;

  const currentUser = getCurrentUser();
  const currentUserId: string | null = currentUser?.id || currentUser?.user_id || null;

  const loadListings = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE, sort: sortOrder };
      if (activeCategory !== 'all') params.listing_type = activeCategory;
      if (search) params.search = search;
      const res = await apiClient.get('/career/listings', { params });
      setListings(res.data?.items || res.data || []);
    } catch {
      setError('İlanlar yüklenemedi. Lütfen daha sonra tekrar deneyin.');
      setListings([]);
    } finally { setLoading(false); }
  }, [activeCategory, sortOrder, search, page]);

  useEffect(() => { if (view === 'list') loadListings(); }, [view, loadListings]);

  useEffect(() => {
    if (id && view === 'list' && listings.length > 0) {
      const found = listings.find(l => l.id === id);
      if (found) {
        setSelectedListing(found);
        setView('detail');
      }
    }
  }, [id, listings, view]);

  const handleListingClick = (listing: CareerListing) => { setSelectedListing(listing); setView('detail'); };
  const handleDelete = async (id: string) => {
    try { await apiClient.delete(`/career/listings/${id}`); setView('list'); await loadListings(); }
    catch { alert('İlan silinemedi.'); }
  };
  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); setSearch(searchInput); setPage(1); };

  const categories: { type: ListingType | 'all'; label: string; Icon: React.FC<{ className?: string }>; count: number }[] = [
    { type: 'all', label: 'Tüm İlanlar', Icon: TrendingUp, count: listings.length },
    { type: 'job', label: 'İş İlanları', Icon: Briefcase, count: listings.filter((l) => l.listing_type === 'job').length },
    { type: 'internship', label: 'Staj Fırsatları', Icon: GraduationCap, count: listings.filter((l) => l.listing_type === 'internship').length },
    { type: 'startup', label: 'Startup Ekipleri', Icon: Rocket, count: listings.filter((l) => l.listing_type === 'startup').length },
    { type: 'project', label: 'Proje Arkadaşları', Icon: Users, count: listings.filter((l) => l.listing_type === 'project').length },
  ];

  return (
    <MainLayout>
      <div className="w-full px-6 xl:px-10 py-8">
        <div className="max-w-[1920px] mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">KAMPÜS+ Kariyer</h1>
              <p className="text-sm text-slate-500 mt-0.5">Üniversite Öğrencileri İçin Fırsatlar</p>
            </div>
            {view === 'list' && (
              <button onClick={() => setView('new')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all text-sm">
                <Plus className="w-4 h-4" /> İlan Oluştur
              </button>
            )}
          </div>

          {/* New Listing */}
          {view === 'new' && (
            <NewListingFormView onCancel={() => setView('list')} onSuccess={() => { setView('list'); loadListings(); }} />
          )}

          {/* Detail */}
          {view === 'detail' && selectedListing && (
            <ListingDetailView
              listing={selectedListing}
              onBack={() => {
                const state = (location.state as BackState | null) || null;
                if (state?.from) {
                  navigate(state.from, { state: state.tab ? { tab: state.tab } : undefined });
                } else {
                  setView('list');
                  if (id) navigate('/dashboard/career');
                }
              }}
              currentUserId={currentUserId}
              onDelete={handleDelete}
            />
          )}

          {/* List */}
          {view === 'list' && (
            <>
              {/* Search */}
              <div className="mb-6">
                <form onSubmit={handleSearchSubmit} className="relative max-w-2xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="İlan, şirket veya pozisyon ara..."
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm text-sm" />
                </form>
              </div>

              {/* Stats bar */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Toplam İlan</p>
                      <p className="text-2xl font-bold text-slate-900">{listings.length}</p>
                    </div>
                    <div className="w-11 h-11 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">İş & Staj</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {listings.filter((l) => l.listing_type === 'job' || l.listing_type === 'internship').length}
                      </p>
                    </div>
                    <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Startup & Proje</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {listings.filter((l) => l.listing_type === 'startup' || l.listing_type === 'project').length}
                      </p>
                    </div>
                    <div className="w-11 h-11 bg-violet-100 rounded-lg flex items-center justify-center">
                      <Rocket className="w-5 h-5 text-violet-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category tabs + sort */}
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {categories.map(({ type, label, Icon, count }) => {
                    const isActive = activeCategory === type;
                    return (
                      <button key={type} onClick={() => { setActiveCategory(type); setPage(1); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all text-sm ${isActive
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                          }`}>
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <select value={sortOrder} onChange={(e) => { setSortOrder(e.target.value as SortOrder); setPage(1); }}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="newest">↓ Yeni İlanlar</option>
                  <option value="oldest">↑ Eski İlanlar</option>
                </select>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                  ⚠️ {error}
                </div>
              )}

              {/* Grid */}
              {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                      <div className="flex justify-between mb-4"><div className="h-7 bg-slate-200 rounded-lg w-24" /><div className="h-4 bg-slate-100 rounded w-16" /></div>
                      <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" /><div className="h-4 bg-slate-100 rounded w-1/2 mb-4" />
                      <div className="flex gap-2 mb-4"><div className="h-6 bg-slate-100 rounded-md w-20" /><div className="h-6 bg-slate-100 rounded-md w-16" /></div>
                      <div className="h-px bg-slate-100 mb-4" />
                      <div className="flex items-center gap-2"><div className="w-8 h-8 bg-slate-200 rounded-lg" /><div className="h-3 bg-slate-200 rounded w-28" /></div>
                    </div>
                  ))}
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">İlan bulunamadı</h3>
                  <p className="text-slate-500 mb-6">Farklı kategori veya arama kriteri deneyin</p>
                  <button onClick={() => setView('new')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all text-sm">
                    <Plus className="w-4 h-4" /> İlk İlanı Oluştur
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} onClick={() => handleListingClick(listing)} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {listings.length >= PAGE_SIZE && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-slate-50">
                    ← Önceki
                  </button>
                  <span className="text-sm text-slate-600 px-3">Sayfa {page}</span>
                  <button onClick={() => setPage((p) => p + 1)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
                    Sonraki →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};
