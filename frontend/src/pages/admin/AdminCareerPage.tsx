import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Flag, FileText, CheckSquare, Eye, Trash2, X,
  User, Calendar, RefreshCw, AlertCircle, MapPin, Building2, Link,
} from 'lucide-react';
import { getAdminCareerListings, deleteCareerListing } from '../../api/career';
import type { CareerListing } from '../../api/career';

type Tab = 'reports' | 'listings' | 'applications';

const tabs = [
  { key: 'reports' as Tab,      label: 'Raporlananlar', icon: <Flag size={16} /> },
  { key: 'listings' as Tab,     label: 'İlanlar',       icon: <FileText size={16} /> },
  { key: 'applications' as Tab, label: 'Başvurular',    icon: <CheckSquare size={16} /> },
];

const LISTING_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  job:        { label: 'İş İlanı',  className: 'bg-blue-50 text-blue-600 border border-blue-100' },
  internship: { label: 'Staj',      className: 'bg-purple-50 text-purple-600 border border-purple-100' },
  startup:    { label: 'Startup',   className: 'bg-orange-50 text-orange-600 border border-orange-100' },
  project:    { label: 'Proje',     className: 'bg-teal-50 text-teal-600 border border-teal-100' },
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active:  { label: 'Aktif',        className: 'bg-green-50 text-green-600 border border-green-100' },
  deleted: { label: 'Silindi',      className: 'bg-red-50 text-red-655 border border-red-100' },
  expired: { label: 'Süresi Doldu', className: 'bg-amber-50 text-amber-600 border border-amber-100' },
};

const ComingSoon: React.FC<{ title: string; description: string; icon: React.ReactNode }> = ({
  title, description, icon,
}) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 text-slate-455 shadow-sm animate-pulse">
      {icon}
    </div>
    <h3 className="text-sm font-bold text-slate-800 mb-1">{title}</h3>
    <p className="text-xs text-slate-400 max-w-sm leading-relaxed">{description}</p>
  </div>
);

// ============================================================================
// KARIYER İLANI İNCELE MODALI
// ============================================================================
const ListingInspectModal: React.FC<{ listing: CareerListing; onClose: () => void }> = ({
  listing,
  onClose,
}) => {
  const creatorName = listing.creator?.full_name || listing.creator?.username || 'Anonim';
  const creatorUsername = listing.creator?.username ? `@${listing.creator.username}` : null;
  const typeInfo = LISTING_TYPE_LABELS[listing.listing_type] ?? { label: listing.listing_type, className: 'bg-slate-100 text-slate-500 border border-slate-200' };
  const statusInfo = STATUS_LABELS[listing.status] ?? { label: listing.status, className: 'bg-slate-100 text-slate-500 border border-slate-200' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Eye size={15} className="text-sky-600 shrink-0 mt-0.5" />
            <h2 className="text-sm font-bold text-slate-900 leading-snug truncate">{listing.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-450 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Meta — badges */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-2 shrink-0">
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg ${typeInfo.className}`}>
            {typeInfo.label}
          </span>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
          {listing.payment_type && (
            <span className="text-[10px] font-bold bg-slate-105 bg-slate-100 border border-slate-205 text-slate-500 px-2.5 py-0.5 rounded-lg">
              {listing.payment_type}
            </span>
          )}
          {listing.sector && (
            <span className="text-[10px] font-bold bg-slate-105 bg-slate-100 border border-slate-205 text-slate-500 px-2.5 py-0.5 rounded-lg">
              {listing.sector}
            </span>
          )}
        </div>

        {/* Meta — details */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col gap-2 shrink-0 bg-white">
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-450 font-bold uppercase tracking-wider text-[10px]">
            {/* Creator */}
            <div className="flex items-center gap-1.5">
              <User size={12} className="text-slate-400" />
              <span className="text-slate-700">{creatorName}</span>
              {creatorUsername && <span className="text-sky-600 font-semibold">{creatorUsername}</span>}
            </div>
            {/* Date */}
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="text-slate-400" />
              <span>
                {new Date(listing.created_at).toLocaleDateString('tr-TR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-semibold text-slate-500">
            {/* Company */}
            {listing.company_name && (
              <div className="flex items-center gap-1.5">
                <Building2 size={12} className="text-slate-400" />
                <span className="text-slate-700">{listing.company_name}</span>
              </div>
            )}
            {/* Location */}
            {listing.location && (
              <div className="flex items-center gap-1.5">
                <MapPin size={12} className="text-slate-400" />
                <span>{listing.location}</span>
              </div>
            )}
            {/* External link */}
            {listing.external_link && (
              <div className="flex items-center gap-1.5">
                <Link size={12} className="text-slate-400" />
                <a
                  href={listing.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 hover:text-sky-700 hover:underline truncate max-w-[240px]"
                  onClick={e => e.stopPropagation()}
                >
                  {listing.external_link}
                </a>
              </div>
            )}
          </div>
          {/* Extra fields */}
          {(listing.salary_range || listing.required_position || listing.duration) && (
            <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-100">
              {listing.salary_range && (
                <span className="text-[10px] font-bold bg-green-50 border border-green-100 text-green-700 px-2 py-1 rounded-lg">
                  Maaş: {listing.salary_range}
                </span>
              )}
              {listing.required_position && (
                <span className="text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1 rounded-lg">
                  Pozisyon: {listing.required_position}
                </span>
              )}
              {listing.duration && (
                <span className="text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1 rounded-lg">
                  Süre: {listing.duration}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0 bg-white">
          <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-2">İş / Staj Açıklaması</p>
          {listing.description ? (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">{listing.description}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">Açıklama girilmemiş.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-slate-100 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-200 hover:text-slate-800 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// İLANLAR SEKMESİ
// ============================================================================
const ListingsTab: React.FC = () => {
  const [listings, setListings] = useState<CareerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<CareerListing | null>(null);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminCareerListings();
      setListings(data);
    } catch {
      setError('İlanlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchListings(); }, [fetchListings]);

  const handleDelete = async (listingId: string) => {
    if (!confirm('Bu ilanı silmek istediğinize emin misiniz?')) return;
    try {
      setDeleting(listingId);
      await deleteCareerListing(listingId);
      setListings(prev => prev.filter(l => l.id !== listingId));
      if (selectedListing?.id === listingId) setSelectedListing(null);
    } catch {
      setError('İlan silinemedi.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {selectedListing && (
        <ListingInspectModal listing={selectedListing} onClose={() => setSelectedListing(null)} />
      )}

      <div>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Tüm Kariyer İlanları</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-sky-50 text-sky-600 px-2.5 py-1 rounded-full border border-sky-100">
              {listings.length} aktif ilan
            </span>
            <button
              onClick={() => void fetchListings()}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 text-xs font-semibold text-red-655 flex items-center gap-2 bg-red-50 border border-red-100 p-3 rounded-xl">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Briefcase size={36} className="text-slate-350 mb-3 animate-pulse" />
            <p className="text-sm text-slate-400 font-semibold">Henüz kariyer ilanı bulunmuyor.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {listings.map(listing => {
              const typeInfo = LISTING_TYPE_LABELS[listing.listing_type] ?? { label: listing.listing_type, className: 'bg-slate-100 text-slate-500 border border-slate-200' };
              const statusInfo = STATUS_LABELS[listing.status] ?? { label: listing.status, className: 'bg-slate-100 text-slate-500 border border-slate-200' };
              const creatorName = listing.creator?.full_name || listing.creator?.username || 'Anonim';
              return (
                <div
                  key={listing.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-bold text-slate-800 truncate leading-snug">{listing.title}</p>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${typeInfo.className}`}>
                        {typeInfo.label}
                      </span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                      <span className="text-slate-600">{creatorName}</span>
                      {listing.company_name && <><span>•</span><span>{listing.company_name}</span></>}
                      {listing.location && <><span>•</span><span>{listing.location}</span></>}
                      <span>•</span>
                      <span>{new Date(listing.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setSelectedListing(listing)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-100 transition-colors"
                    >
                      <Eye size={12} /> İncele
                    </button>
                    <button
                      onClick={() => void handleDelete(listing.id)}
                      disabled={deleting === listing.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-50 text-red-655 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={12} /> {deleting === listing.id ? 'Siliniyor…' : 'Sil'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

// ============================================================================
// ANA SAYFA
// ============================================================================
export const AdminCareerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('listings');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Briefcase size={22} className="text-sky-600 animate-pulse" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kariyer Yönetimi</h1>
        </div>
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest text-[10px]">Raporlanan iş ilanlarını, aktif ilanları ve başvuruları yönetin.</p>
      </div>

      <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-100 shadow-sm w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/20'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100/50 shadow-xl shadow-slate-200/40 overflow-hidden">
        {activeTab === 'reports' && (
          <ComingSoon
            icon={<Flag size={32} />}
            title="İlan Moderasyonu"
            description="Kullanıcıların raporladığı kariyer ilanlarını inceleyin ve gerekli işlemleri yapın."
          />
        )}
        {activeTab === 'listings' && <ListingsTab />}
        {activeTab === 'applications' && (
          <ComingSoon
            icon={<CheckSquare size={32} />}
            title="Başvuru Yönetimi"
            description="Gelen başvuruları takip edin ve durumlarını güncelleyin."
          />
        )}
      </div>
    </div>
  );
};
