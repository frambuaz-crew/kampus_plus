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
  Trash2,
} from 'lucide-react';
import { apiClient } from '../api/config';
import { getImageUrl } from '../utils/imageUrl';
import { parseUtcDate, formatRelativeTimeTr } from '../utils/dateUtils';
import { MainLayout } from '../components/layout/MainLayout';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

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
  application_count: number;
  created_at: string;
  updated_at: string;
  posted_by?: string;
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
  visibility: 'public' | 'university';
}

// ─── Constants ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ListingType, {
  label: string; labelFull: string; desc: string;
  Icon: React.FC<{ className?: string }>;
  gradient: string; bgLight: string; textColor: string; borderActive: string; badgeBg: string;
}> = {
  job: { label: 'İş İlanı', labelFull: 'İş İlanı', desc: 'Tam veya yarı zamanlı pozisyon', Icon: Briefcase, gradient: 'from-[#0ea5e9] to-[#0284c7]', bgLight: 'bg-sky-50', textColor: 'text-[#0369a1]', borderActive: 'border-[#0ea5e9]', badgeBg: 'bg-sky-100' },
  internship: { label: 'Staj', labelFull: 'Staj İlanı', desc: 'Öğrencilere özel staj fırsatı', Icon: GraduationCap, gradient: 'from-emerald-500 to-teal-600', bgLight: 'bg-emerald-50', textColor: 'text-emerald-700', borderActive: 'border-emerald-500', badgeBg: 'bg-emerald-100' },
  startup: { label: 'Startup', labelFull: 'Startup Ekibi', desc: 'Girişim için kurucu ortak ara', Icon: Rocket, gradient: 'from-violet-500 to-purple-600', bgLight: 'bg-violet-50', textColor: 'text-violet-700', borderActive: 'border-violet-500', badgeBg: 'bg-violet-100' },
  project: { label: 'Proje', labelFull: 'Proje Arkadaşı', desc: 'Proje geliştirmek için ekip', Icon: Users, gradient: 'from-amber-500 to-amber-600', bgLight: 'bg-amber-50', textColor: 'text-amber-700', borderActive: 'border-amber-500', badgeBg: 'bg-amber-100' },
};

const SECTORS = ['Yazılım', 'Mühendislik', 'Tasarım', 'Pazarlama', 'Veri Bilimi', 'Diğer'];
const LOCATIONS = ['Remote', 'Ankara', 'İstanbul', 'İzmir', 'Konya', 'Diğer'];
const PAYMENT_TYPES = [
  { value: 'paid', label: 'Ücretli' },
  { value: 'unpaid', label: 'Ücretsiz' },
  { value: 'project_based', label: 'Proje Bazlı' },
  { value: 'equity', label: 'Hisse Ortaklığı' },
  { value: 'learning', label: 'Öğrenme Amaçlı' },
];
const PAYMENT_LABELS: Record<string, string> = {
  paid: 'Ücretli', unpaid: 'Ücretsiz', project_based: 'Proje Bazlı', equity: 'Hisse Ortaklığı', learning: 'Öğrenme Amaçlı',
};
const DURATION_LABELS: Record<string, string> = {
  short_term: 'Kısa Vadeli (1-3 ay)', long_term: 'Uzun Vadeli (3+ ay)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────────────────

// Use centralized helper for relative time formatting

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

const ListingCard: React.FC<{ 
  listing: CareerListing; 
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClick: () => void; 
  onApply: (e: React.MouseEvent) => void 
}> = ({ listing, isFavorite, onToggleFavorite, onClick, onApply }) => {


  const toggleFavorite = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleFavorite(listing.id);
  };

  const cfg = TYPE_CONFIG[listing.listing_type];
  const TypeIcon = cfg.Icon;
  const subtitle = (listing.listing_type === 'job' || listing.listing_type === 'internship')
    ? listing.company_name
    : listing.required_position;
  const creatorName = listing.creator?.full_name || listing.creator?.username || 'İlan Sahibi';
  const creatorInitial = creatorName.charAt(0).toUpperCase();

  return (
    <Card
      onClick={onClick}
      className="hover:shadow-md transition-all duration-200 cursor-pointer group border border-slate-200"
    >
      <div className="p-4 sm:p-5 flex flex-col gap-3">
        {/* Top row: icon + title/badge + type */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${cfg.bgLight} flex items-center justify-center shrink-0 mt-0.5`}>
            <TypeIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${cfg.textColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap mb-0.5">
              <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-[#0ea5e9] transition-colors">
                {listing.title}
              </h3>
              <Badge className={`${cfg.bgLight} ${cfg.textColor} border-0 text-[10px] font-medium shrink-0`}>
                {cfg.label}
              </Badge>
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {listing.description}
        </p>

        {/* Meta tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            <Building2 className="w-3 h-3" />{listing.sector}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            <MapPin className="w-3 h-3" />{listing.location}
          </span>
          {listing.salary_range && (
            <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-md">
              {listing.salary_range}
            </span>
          )}
          {listing.payment_type && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {PAYMENT_LABELS[listing.payment_type] || listing.payment_type}
            </span>
          )}
        </div>

        {/* Footer: user info + stats + actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Left: creator */}
          <Link
            to={`/dashboard/profile/${listing.creator?.username}`}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity min-w-0 flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="h-5 w-5 shrink-0">
              {listing.creator?.profile_picture_url && (
                <AvatarImage src={getImageUrl(listing.creator.profile_picture_url)} />
              )}
              <AvatarFallback className="text-[9px] bg-sky-100 text-[#0369a1] font-semibold">
                {creatorInitial}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-slate-400 truncate">
              {listing.creator?.username || creatorName}
            </span>
          </Link>

          {/* Right: stats + actions */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              {formatRelativeTimeTr(listing.created_at)}
            </span>
            <button
              onClick={toggleFavorite}
              className={`p-1.5 rounded-md transition-colors ${isFavorite ? 'text-[#0ea5e9] bg-sky-50' : 'text-slate-300 hover:text-[#0ea5e9] hover:bg-sky-50'}`}
              title={isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? 'fill-[#0ea5e9]' : ''}`} />
            </button>
            <Button
              size="sm"
              className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white h-7 px-3 text-xs"
              onClick={onApply}
            >
              Başvur
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// ─── Detail View ──────────────────────────────────────────────────────────────────

const ListingDetailView: React.FC<{
  listing: CareerListing;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onBack: () => void;
  currentUserId: string | null;
  onDelete: (id: string) => void;
}> = ({ listing, isFavorite, onToggleFavorite, onBack, currentUserId, onDelete }) => {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[listing.listing_type];
  const TypeIcon = cfg.Icon;
  const isOwner = currentUserId && listing.creator?.id === currentUserId;
  const [reportReason, setReportReason] = useState('');
  const [showReportBox, setShowReportBox] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const toggleFavorite = async () => {
    onToggleFavorite(listing.id);
  };

  const [showApplyDialog, setShowApplyDialog] = useState(false);

  const isJobOrInternship = listing.listing_type === 'job' || listing.listing_type === 'internship';

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    try {
      await apiClient.post(`/career/listings/${listing.id}/report`, { reason: reportReason });
      setReportSent(true); setShowReportBox(false);
    } catch { alert('Rapor gönderilemedi.'); }
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kariyer'e Dön
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* ── Sol: Ana İçerik ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Başlık Kartı */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className={`h-1.5 w-full bg-gradient-to-r ${cfg.gradient}`} />
            <div className="p-4 sm:p-8">
              <div className="flex items-start justify-between mb-5">
                <span className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full ${cfg.badgeBg} ${cfg.textColor}`}>
                  <TypeIcon className="w-3.5 h-3.5" />
                  {cfg.labelFull}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleFavorite}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isFavorite ? 'bg-sky-50 text-[#0ea5e9]' : 'text-slate-400 hover:bg-slate-100'}`}
                    title={isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                  >
                    <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-[#0ea5e9]' : ''}`} />
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => { if (window.confirm('İlanı silmek istiyor musunuz?')) onDelete(listing.id); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 mb-4 leading-tight">{listing.title}</h1>

              <div className="space-y-2 mb-6">
                {listing.company_name && (
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="font-medium">{listing.company_name}</span>
                  </div>
                )}
                {listing.required_position && (
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <TypeIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>Aranan: {listing.required_position}</span>
                  </div>
                )}
                {listing.location && (
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>{listing.location}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-5 border-t border-slate-100">
                {listing.sector && <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">{listing.sector}</span>}
                {listing.payment_type && <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">{PAYMENT_LABELS[listing.payment_type] || listing.payment_type}</span>}
                {listing.salary_range && <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full">{listing.salary_range}</span>}
                {listing.duration && <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">{DURATION_LABELS[listing.duration] || listing.duration}</span>}
                <span className="text-xs font-medium text-slate-400 px-3 py-1.5 rounded-full bg-slate-50 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />{formatRelativeTimeTr(listing.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Açıklama */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Açıklama</h2>
            <p className="text-sm text-slate-700 leading-7 whitespace-pre-line">{listing.description}</p>
          </div>

          {/* Rapor */}
          <div className="px-1">
            {reportSent ? (
              <p className="text-sm text-emerald-600 flex items-center gap-2"><Check className="w-4 h-4" /> Raporunuz alındı.</p>
            ) : showReportBox ? (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Uygunsuzluk nedenini kısaca açıklayın..." rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200" />
                <div className="flex gap-2">
                  <button onClick={handleReport} className="text-sm px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium">Gönder</button>
                  <button onClick={() => setShowReportBox(false)} className="text-sm px-4 py-1.5 text-slate-400 hover:text-slate-600">İptal</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowReportBox(true)} className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5" /> Uygunsuz İlan Bildir
              </button>
            )}
          </div>
        </div>

        {/* ── Sağ: Sidebar ── */}
        <div className="space-y-4">

          {/* CTA / Links */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            {!isOwner && (
              <button
                onClick={() => setShowApplyDialog(true)}
                className="w-full py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <cfg.Icon className="w-4 h-4" />
                {listing.listing_type === 'startup' ? 'İlgileniyorum' : listing.listing_type === 'project' ? 'Katılmak İstiyorum' : 'Başvur'}
              </button>
            )}

            {listing.external_link && (
              <a 
                href={listing.external_link.startsWith('http') ? listing.external_link : `https://${listing.external_link}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4 text-slate-400" /> 
                {listing.listing_type === 'job' || listing.listing_type === 'internship' ? 'Harici Platform' : 'Proje/Startup Linki'}
              </a>
            )}
          </div>

          {/* İlan Veren */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">İlan Veren</p>
            <Link to={`/dashboard/profile/${listing.creator?.username}`} className="flex items-center gap-3 group">
              {listing.creator?.profile_picture_url ? (
                <img src={getImageUrl(listing.creator.profile_picture_url)} alt={listing.creator.username || ''}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[#0ea5e9] flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  {listing.creator?.username?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 group-hover:text-[#0ea5e9] transition-colors truncate">
                  {listing.creator?.full_name || listing.creator?.username || 'İlan Sahibi'}
                </p>
                {listing.creator?.university && <p className="text-xs text-slate-500 truncate mt-0.5">{listing.creator.university}</p>}
                {listing.creator?.department && <p className="text-xs text-slate-400 truncate">{listing.creator.department}</p>}
              </div>
            </Link>
          </div>

          {/* Detaylar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Detaylar</p>
            <div className="space-y-3">
              {listing.location && (
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" /><span>{listing.location}</span>
                </div>
              )}
              {listing.sector && (
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" /><span>{listing.sector}</span>
                </div>
              )}
              {listing.payment_type && (
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-slate-400 flex-shrink-0" /><span>{PAYMENT_LABELS[listing.payment_type] || listing.payment_type}</span>
                </div>
              )}
              {listing.duration && (
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" /><span>{DURATION_LABELS[listing.duration] || listing.duration}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showApplyDialog && <ApplyDialog listing={listing} onClose={() => setShowApplyDialog(false)} />}
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
    visibility: 'public',
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
    const t = form.title.trim();
    const d = form.description.trim();
    if (!t) e.title = 'Başlık giriniz.';
    else if (t.length < 5) e.title = 'Başlık en az 5 karakter olmalıdır.';
    else if (t.length > 100) e.title = 'Başlık en fazla 100 karakter olabilir.';
    if (!d) e.description = 'Açıklama giriniz.';
    else if (d.length < 10) e.description = 'Açıklama en az 10 karakter olmalıdır.';
    else if (d.length > 2000) e.description = 'Açıklama en fazla 2000 karakter olabilir.';
    if (!form.sector) e.sector = 'Sektör giriniz.';
    if (!form.location) e.location = 'Lokasyon giriniz.';
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
      Object.entries(form).forEach(([k, v]) => {
        if (v) payload[k] = v;
      });
      payload.title = form.title.trim();
      payload.description = form.description.trim();
      await apiClient.post('/career/listings', payload);
      setSuccess(true);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: unknown }; status?: number } };
      const detail = ax.response?.data?.detail;
      let msg = 'İlan oluşturulamadı. Lütfen tekrar deneyin.';
      if (Array.isArray(detail)) {
        const parts = detail
          .map((item: { msg?: string }) => (typeof item?.msg === 'string' ? item.msg : ''))
          .filter(Boolean);
        if (parts.length) msg = parts.join(' ');
      } else if (typeof detail === 'string') {
        msg = detail;
      }
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setForm({ listing_type: '', title: '', description: '', sector: '', location: '', company_name: '', external_link: '', salary_range: '', required_position: '', duration: '', payment_type: '', visibility: 'public' });
    setErrors({});
  };

  const isJobOrInternship = form.listing_type === 'job' || form.listing_type === 'internship';
  const isStartupOrProject = form.listing_type === 'startup' || form.listing_type === 'project';
  const selectedCfg = form.listing_type ? TYPE_CONFIG[form.listing_type as ListingType] : null;

  const step2Ready = !!form.listing_type;
  const step3Ready = step2Ready && !!form.title && !!form.description && !!form.sector && !!form.location;

  const isFormValid = () => {
    const t = form.title.trim();
    const d = form.description.trim();
    if (!form.listing_type || !t || !d || !form.sector || !form.location) return false;
    if (t.length < 5 || t.length > 100 || d.length < 10 || d.length > 2000) return false;
    if (isStartupOrProject) return !!form.required_position.trim();
    return true;
  };

  const inputCls = (err?: string) =>
    `w-full px-4 py-3 bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-sm transition-all ${err ? 'border-red-300 bg-red-50' : 'border-slate-300'}`;

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

  const inputStyle = (hasError?: string) =>
    `w-full border ${hasError ? 'border-red-300' : 'border-slate-200'} rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/15 transition-all`;

  const typeOrder: ListingType[] = ['job', 'internship', 'project', 'startup'];

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-1">

      {/* İlan Tipi */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          İlan Tipi <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {typeOrder.map((type) => {
            const cfg = TYPE_CONFIG[type];
            const isSelected = form.listing_type === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => set('listing_type', type)}
                className={`py-2.5 px-2 text-sm font-medium rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-[#0ea5e9] text-[#0ea5e9] bg-sky-50'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
        {errors.listing_type && <p className="text-xs text-red-500 mt-1.5">⚠ {errors.listing_type}</p>}
      </div>

      {/* Başlık */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Başlık <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set('title', e.target.value.slice(0, 100))}
          placeholder="Pozisyon başlığını girin"
          className={inputStyle(errors.title)}
        />
        <p className="mt-1 text-xs text-slate-500">{form.title.trim().length}/100 · en az 5 karakter</p>
        {errors.title && <p className="text-xs text-red-500 mt-1">⚠ {errors.title}</p>}
      </div>

      {/* Açıklama */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Açıklama <span className="text-red-400">*</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value.slice(0, 2000))}
          placeholder="İlan hakkında detaylı bilgi verin"
          rows={4}
          className={`${inputStyle(errors.description)} resize-none`}
        />
        <p className="mt-1 text-xs text-slate-500">{form.description.trim().length}/2000 · en az 10 karakter</p>
        {errors.description && <p className="text-xs text-red-500 mt-1">⚠ {errors.description}</p>}
      </div>

      {/* Sektör + Lokasyon */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            Sektör <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.sector}
            onChange={(e) => set('sector', e.target.value)}
            placeholder="Örn: Yazılım"
            className={inputStyle(errors.sector)}
            list="sectors-list"
          />
          <datalist id="sectors-list">
            {SECTORS.map((s) => <option key={s} value={s} />)}
          </datalist>
          {errors.sector && <p className="text-xs text-red-500 mt-1">⚠ {errors.sector}</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            Lokasyon <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="Örn: İstanbul"
            className={inputStyle(errors.location)}
            list="locations-list"
          />
          <datalist id="locations-list">
            {LOCATIONS.map((l) => <option key={l} value={l} />)}
          </datalist>
          {errors.location && <p className="text-xs text-red-500 mt-1">⚠ {errors.location}</p>}
        </div>
      </div>

      {/* Job / Internship ek alanlar */}
      {isJobOrInternship && (
        <>
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Şirket Adı</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => set('company_name', e.target.value)}
              placeholder="Şirket adını girin"
              className={inputStyle()}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Maaş Aralığı</label>
            <input
              type="text"
              value={form.salary_range}
              onChange={(e) => set('salary_range', e.target.value)}
              placeholder="Örn: ₺25.000 - ₺35.000"
              className={inputStyle()}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Harici Başvuru Linki <span className="text-slate-400 font-normal text-xs">(opsiyonel)</span></label>
            <input
              type="url"
              value={form.external_link}
              onChange={(e) => set('external_link', e.target.value)}
              placeholder="https://..."
              className={inputStyle(errors.external_link)}
            />
            {errors.external_link && <p className="text-xs text-red-500 mt-1">⚠ {errors.external_link}</p>}
          </div>
        </>
      )}

      {/* Startup / Project ek alanlar */}
      {isStartupOrProject && (
        <>
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Aranan Pozisyon <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.required_position}
              onChange={(e) => set('required_position', e.target.value)}
              placeholder="Örn: Frontend Developer, UI Designer"
              className={inputStyle(errors.required_position)}
            />
            {errors.required_position && <p className="text-xs text-red-500 mt-1">⚠ {errors.required_position}</p>}
          </div>
          {/* Startup için harici link (opsiyonel) */}
          {form.listing_type === 'startup' && (
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">Harici Link <span className="text-slate-400 font-normal text-xs">(opsiyonel)</span></label>
              <input
                type="url"
                value={form.external_link}
                onChange={(e) => set('external_link', e.target.value)}
                placeholder="https://..."
                className={inputStyle(errors.external_link)}
              />
              {errors.external_link && <p className="text-xs text-red-500 mt-1">⚠ {errors.external_link}</p>}
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Ödeme Durumu</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_TYPES.filter((p) =>
                form.listing_type === 'startup'
                  ? ['paid', 'unpaid', 'project_based', 'equity'].includes(p.value)
                  : ['paid', 'unpaid', 'learning'].includes(p.value)
              ).map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set('payment_type', p.value)}
                  className={`px-4 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                    form.payment_type === p.value
                      ? 'border-[#0ea5e9] bg-sky-50 text-[#0369a1]'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Görünürlük */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Görünürlük
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set('visibility', 'public')}
            className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all ${
              form.visibility === 'public'
                ? 'border-[#0ea5e9] bg-sky-50 text-[#0ea5e9]'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Herkese Açık
          </button>
          <button
            type="button"
            onClick={() => set('visibility', 'university')}
            className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all ${
              form.visibility === 'university'
                ? 'border-[#0ea5e9] bg-sky-50 text-[#0ea5e9]'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Sadece Üniversitem
          </button>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={!isFormValid() || submitting}
          className="flex-1 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg text-sm font-semibold transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Yayınlanıyor...</>
          ) : 'İlanı Yayınla'}
        </button>
      </div>
    </form>
  );
};

// ─── Apply Dialog ─────────────────────────────────────────────────────────────────

const ApplyDialog: React.FC<{ listing: CareerListing; onClose: () => void }> = ({ listing, onClose }) => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!message.trim() || message.trim().length < 5) {
      setError('Lütfen en az 5 karakterlik bir ön yazı yazın.');
      return;
    }
    const userRaw = localStorage.getItem('user');
    const me = userRaw ? (JSON.parse(userRaw) as { id?: string; user_id?: string }) : null;
    const myId = me?.id || me?.user_id;
    const creatorId = listing.creator?.id || listing.posted_by;
    if (myId && myId === creatorId) { setError('Kendi ilanınıza başvuramazsınız.'); return; }
    try {
      setLoading(true);
      const res = await apiClient.post<{ conversation_id: string; success: boolean }>(
        `/career/listings/${listing.id}/apply`,
        { message_text: message.trim() },
      );
      onClose();
      navigate(`/dashboard/messages/${res.data.conversation_id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Başvuru gönderilemedi. Lütfen tekrar deneyin.');
    } finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Başvur</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">{listing.title}</p>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-semibold text-slate-900 block mb-2">
              Ön Yazınız <span className="text-red-400">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Kendinizi tanıtın, neden bu fırsata başvurduğunuzu belirtin..."
              rows={6}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20 resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-500">⚠ {error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              İptal
            </button>
            <button
              onClick={handleApply}
              disabled={!message.trim() || loading}
              className="flex-1 px-4 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg text-sm font-semibold transition-colors disabled:bg-slate-200 disabled:text-slate-400"
            >
              {loading ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────────────

export const CareerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState<'list' | 'detail'>('list');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [applyListing, setApplyListing] = useState<CareerListing | null>(null);
  const [listings, setListings] = useState<CareerListing[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [selectedListing, setSelectedListing] = useState<CareerListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<ListingType | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'university'>('all');

  const currentUser = getCurrentUser();
  const currentUserId: string | null = currentUser?.id || currentUser?.user_id || null;

  // Fetch ALL listings without server-side category filter so counts stay accurate across tabs.
  // API max limit is 100, so we paginate to collect all results.
  const loadListings = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      let all: CareerListing[] = [];
      let page = 1;
      const pageSize = 100;
      while (true) {
        let scopeParam: string | undefined = undefined;
        if (scopeFilter === 'university') scopeParam = 'university';
        if (scopeFilter === 'public') scopeParam = 'public';

        const res = await apiClient.get('/career/listings', { params: { limit: pageSize, page, sort: sortOrder, scope: scopeParam } });
        const batch: CareerListing[] = res.data?.items || res.data || [];
        all = [...all, ...batch];
        if (batch.length < pageSize) break;
        page++;
      }
      // normalize seeded/old listings if seed reset timestamp exists
      const seedReset = localStorage.getItem('seed_reset_at');
      const normalized = seedReset
        ? all.map((it, idx) => {
            try {
              const orig = new Date(it.created_at).getTime();
              if (Number.isNaN(orig) || Date.now() - orig > 3600_000) {
                return { ...it, created_at: new Date(new Date(seedReset).getTime() + idx * 1000).toISOString() };
              }
            } catch {}
            return it;
          })
        : all;
      setListings(normalized);
    } catch {
      setError('İlanlar yüklenemedi. Lütfen daha sonra tekrar deneyin.');
      setListings([]);
    } finally { setLoading(false); }
  }, [sortOrder, scopeFilter]);

  const loadFavorites = useCallback(async () => {
    try {
      const response = await apiClient.get('/users/favorites/all');
      if (response.data && response.data.favorites) {
        const ids = new Set<string>(response.data.favorites.map((f: FavoriteRecord) => f.target_id));
        setFavoriteIds(ids);
      }
    } catch (err) {
      // ignore favorites loading errors silently
    }
  }, []);

  

  const handleToggleFavorite = async (id: string) => {
    try {
      const payload = { target_type: "career_listing", target_id: id };
      const response = await apiClient.post("/users/favorites/toggle", payload);
      if (response.data && response.data.success) {
        setFavoriteIds(prev => {
          const next = new Set(prev);
          if (response.data.action === "added") next.add(id);
          else next.delete(id);
          return next;
        });
      }
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        alert("Giriş yapmalısınız.");
      }
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    if (view === 'list' && !isNewOpen) {
      loadListings();
    } else if (id && listings.length === 0 && !isNewOpen) {
      // If we land on a detail page directly, we still need listings to find the item
      loadListings();
    }
  }, [view, isNewOpen, loadListings, id, listings.length]);

  useEffect(() => {
    if (!id) {
      // If ID is gone, we must be in list view
      if (view === 'detail') {
        setView('list');
        setSelectedListing(null);
      }
      return;
    }

    if (id && listings.length > 0) {
      const found = listings.find(l => l.id === id);
      if (found && (!selectedListing || selectedListing.id !== id)) {
        setSelectedListing(found);
        setView('detail');
      }
    }
  }, [id, listings, view, selectedListing]);

  const handleListingClick = async (listing: CareerListing) => {
    try {
      // Tekil endpoint: view_count artar + application_count güncel gelir
      const res = await apiClient.get<CareerListing>(`/career/listings/${listing.id}`);
      setSelectedListing(res.data);
    } catch {
      // Apiye ulaşılamazsa mevcut listeyi kullan
      setSelectedListing(listing);
    }
    setView('detail');
    navigate(`/dashboard/career/${listing.id}`);
  };
  const handleDelete = async (id: string) => {
    try { 
      await apiClient.delete(`/career/listings/${id}`); 
      setListings(prev => prev.filter(l => l.id !== id));
      setView('list'); 
      navigate('/dashboard/career', { replace: true });
    }
    catch { alert('İlan silinemedi.'); }
  };
  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); setSearch(searchInput); };

  // Client-side filtering: category + search on full listings list
  const filteredListings = listings.filter((l) => {
    const matchesCategory = activeCategory === 'all' || l.listing_type === activeCategory;
    const q = search.toLowerCase();
    const matchesSearch = !q || l.title.toLowerCase().includes(q) || (l.company_name || '').toLowerCase().includes(q) || (l.required_position || '').toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  // Sort order applied client-side as well
  const sortedListings = [...filteredListings].sort((a, b) =>
    sortOrder === 'newest'
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Category counts always derived from the full (unfiltered) listings list
  const categories: { type: ListingType | 'all'; label: string; Icon: React.FC<{ className?: string }>; count: number }[] = [
    { type: 'all', label: 'Tümü', Icon: TrendingUp, count: listings.length },
    { type: 'job', label: 'İş İlanı', Icon: Briefcase, count: listings.filter((l) => l.listing_type === 'job').length },
    { type: 'internship', label: 'Staj', Icon: GraduationCap, count: listings.filter((l) => l.listing_type === 'internship').length },
    { type: 'project', label: 'Proje Ortağı', Icon: Users, count: listings.filter((l) => l.listing_type === 'project').length },
    { type: 'startup', label: 'Startup', Icon: Rocket, count: listings.filter((l) => l.listing_type === 'startup').length },
  ];

  return (
    <MainLayout>
      <div className="w-full px-3 sm:px-6 xl:px-10 py-4 sm:py-8 pb-24 sm:pb-8">
        <div className="max-w-[1920px] mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Kariyer</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">İş, staj ve proje fırsatları</p>
            </div>
            {view === 'list' && (
              <Button
                onClick={() => setIsNewOpen(true)}
                className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white gap-2"
              >
                <Plus className="w-4 h-4" /> Yeni İlan
              </Button>
            )}
          </div>

          {/* New Listing Dialog */}
          <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">Yeni Kariyer İlanı Oluştur</DialogTitle>
              </DialogHeader>
              <NewListingFormView
                onCancel={() => setIsNewOpen(false)}
                onSuccess={() => { setIsNewOpen(false); loadListings(); }}
              />
            </DialogContent>
          </Dialog>

          {/* Apply Dialog */}
          {applyListing && (
            <ApplyDialog
              listing={applyListing}
              onClose={() => setApplyListing(null)}
            />
          )}

          {/* Detail */}
          {view === 'detail' && selectedListing && (
            <div className="max-w-4xl mx-auto">
              <ListingDetailView
                listing={selectedListing}
                isFavorite={favoriteIds.has(selectedListing.id)}
                onToggleFavorite={handleToggleFavorite}
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
            </div>
          )}


          {/* List */}
          {view === 'list' && (
            <>
              {/* Category tabs — scrollable on mobile */}
              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1 mb-4 overflow-x-auto gap-1 no-scrollbar">
                {categories.map(({ type, label, count }) => {
                  const isActive = activeCategory === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveCategory(type)}
                      className={`flex-shrink-0 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {label}
                      <span className={`text-[10px] sm:text-[11px] font-semibold ${isActive ? 'text-[#0ea5e9]' : 'text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search + Sort row */}
              <div className="flex flex-col md:flex-row gap-3 mb-5">
                <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="İlan ara..."
                    className="pl-9 bg-white"
                  />
                </form>
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
                  <SelectTrigger className="w-full md:w-36 bg-white">
                    <SelectValue placeholder="Sıralama" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Yeni İlanlar</SelectItem>
                    <SelectItem value="oldest">Eski İlanlar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl mb-5 w-fit">
                <button
                  type="button"
                  onClick={() => setScopeFilter('all')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    scopeFilter === 'all' ? "bg-white text-[#0ea5e9] shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Tüm İlanlar
                </button>
                <button
                  type="button"
                  onClick={() => setScopeFilter('university')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    scopeFilter === 'university' ? "bg-white text-[#0ea5e9] shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Sadece Üniversitem
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                  ⚠️ {error}
                </div>
              )}

              {/* List */}
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse flex gap-4">
                      <div className="w-12 h-12 bg-slate-200 rounded-xl shrink-0" />
                      <div className="flex-1">
                        <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                        <div className="h-3 bg-slate-100 rounded w-1/3 mb-3" />
                        <div className="flex gap-2 mb-3">
                          <div className="h-5 bg-slate-100 rounded-md w-20" />
                          <div className="h-5 bg-slate-100 rounded-md w-16" />
                        </div>
                        <div className="h-3 bg-slate-100 rounded w-2/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sortedListings.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {listings.length === 0 ? 'Henüz ilan yok' : 'Eşleşen ilan bulunamadı'}
                  </h3>
                  <p className="text-slate-500 mb-6">
                    {listings.length === 0 ? 'İlk ilanı sen oluştur!' : 'Farklı kategori veya arama kriteri deneyin'}
                  </p>
                  {listings.length === 0 && (
                    <Button onClick={() => setIsNewOpen(true)} className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white gap-2">
                      <Plus className="w-4 h-4" /> İlk İlanı Oluştur
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      isFavorite={favoriteIds.has(listing.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onClick={() => handleListingClick(listing)}
                      onApply={(e) => { e.stopPropagation(); setApplyListing(listing); }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};
