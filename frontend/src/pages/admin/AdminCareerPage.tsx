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
  job:        { label: 'İş İlanı',  className: 'bg-blue-500/10 text-blue-400' },
  internship: { label: 'Staj',      className: 'bg-purple-500/10 text-purple-400' },
  startup:    { label: 'Startup',   className: 'bg-orange-500/10 text-orange-400' },
  project:    { label: 'Proje',     className: 'bg-teal-500/10 text-teal-400' },
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active:  { label: 'Aktif',        className: 'bg-green-500/10 text-green-400' },
  deleted: { label: 'Silindi',      className: 'bg-red-500/10 text-red-400' },
  expired: { label: 'Süresi Doldu', className: 'bg-yellow-500/10 text-yellow-400' },
};

const ComingSoon: React.FC<{ title: string; description: string; icon: React.ReactNode }> = ({
  title, description, icon,
}) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4 text-gray-500">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-gray-300 mb-2">{title}</h3>
    <p className="text-sm text-gray-600 max-w-sm">{description}</p>
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
  const typeInfo = LISTING_TYPE_LABELS[listing.listing_type] ?? { label: listing.listing_type, className: 'bg-gray-700 text-gray-400' };
  const statusInfo = STATUS_LABELS[listing.status] ?? { label: listing.status, className: 'bg-gray-700 text-gray-400' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Eye size={16} className="text-blue-400 shrink-0 mt-0.5" />
            <h2 className="text-base font-bold text-white leading-snug truncate">{listing.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Meta — badges */}
        <div className="px-6 py-3 border-b border-gray-800 flex flex-wrap gap-2 shrink-0">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${typeInfo.className}`}>
            {typeInfo.label}
          </span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
          {listing.payment_type && (
            <span className="text-[11px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
              {listing.payment_type}
            </span>
          )}
          {listing.sector && (
            <span className="text-[11px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
              {listing.sector}
            </span>
          )}
        </div>

        {/* Meta — details */}
        <div className="px-6 py-3 border-b border-gray-800 flex flex-col gap-2 shrink-0">
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {/* Creator */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <User size={12} className="text-gray-500" />
              <span className="font-semibold text-gray-300">{creatorName}</span>
              {creatorUsername && <span className="text-gray-600">{creatorUsername}</span>}
            </div>
            {/* Date */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Calendar size={12} className="text-gray-500" />
              {new Date(listing.created_at).toLocaleDateString('tr-TR', {
                day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {/* Company */}
            {listing.company_name && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Building2 size={12} className="text-gray-500" />
                <span>{listing.company_name}</span>
              </div>
            )}
            {/* Location */}
            {listing.location && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <MapPin size={12} className="text-gray-500" />
                <span>{listing.location}</span>
              </div>
            )}
            {/* External link */}
            {listing.external_link && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Link size={12} className="text-gray-500" />
                <a
                  href={listing.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline truncate max-w-[240px]"
                  onClick={e => e.stopPropagation()}
                >
                  {listing.external_link}
                </a>
              </div>
            )}
          </div>
          {/* Extra fields */}
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {listing.salary_range && (
              <span className="text-xs text-gray-500">
                <span className="text-gray-600">Maaş:</span> <span className="text-green-400 font-semibold">{listing.salary_range}</span>
              </span>
            )}
            {listing.required_position && (
              <span className="text-xs text-gray-500">
                <span className="text-gray-600">Aranan pozisyon:</span> {listing.required_position}
              </span>
            )}
            {listing.duration && (
              <span className="text-xs text-gray-500">
                <span className="text-gray-600">Süre:</span> {listing.duration}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Açıklama</p>
          {listing.description ? (
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
          ) : (
            <p className="text-sm text-gray-600 italic">Açıklama girilmemiş.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
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
      // Backend soft-deletes; remove from admin view entirely for cleanliness
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
        <div className="w-8 h-8 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {selectedListing && (
        <ListingInspectModal listing={selectedListing} onClose={() => setSelectedListing(null)} />
      )}

      <div>
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-blue-400" />
            <span className="text-sm font-semibold text-gray-300">Tüm Kariyer İlanları</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-semibold">
              {listings.length} ilan
            </span>
            <button
              onClick={fetchListings}
              className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 text-sm text-red-400 flex items-center gap-2 bg-red-500/10 p-3 rounded-lg">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase size={40} className="text-gray-600 mb-3" />
            <p className="text-sm text-gray-600">Henüz kariyer ilanı bulunmuyor.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {listings.map(listing => {
              const typeInfo = LISTING_TYPE_LABELS[listing.listing_type] ?? { label: listing.listing_type, className: 'bg-gray-700 text-gray-400' };
              const statusInfo = STATUS_LABELS[listing.status] ?? { label: listing.status, className: 'bg-gray-700 text-gray-400' };
              const creatorName = listing.creator?.full_name || listing.creator?.username || 'Anonim';
              return (
                <div
                  key={listing.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-200 truncate">{listing.title}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${typeInfo.className}`}>
                        {typeInfo.label}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      <span>{creatorName}</span>
                      {listing.company_name && <><span>•</span><span>{listing.company_name}</span></>}
                      {listing.location && <><span>•</span><span>{listing.location}</span></>}
                      <span>•</span>
                      <span>{new Date(listing.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedListing(listing)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
                    >
                      <Eye size={12} /> İncele
                    </button>
                    <button
                      onClick={() => void handleDelete(listing.id)}
                      disabled={deleting === listing.id}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={12} /> {deleting === listing.id ? '...' : 'Sil'}
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
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Briefcase size={22} className="text-red-500" />
          <h1 className="text-2xl font-black text-white tracking-tight">Kariyer Yönetimi</h1>
        </div>
        <p className="text-sm text-gray-500">Raporlanan iş ilanlarını, aktif ilanları ve başvuruları yönetin.</p>
      </div>

      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-red-600 text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
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
