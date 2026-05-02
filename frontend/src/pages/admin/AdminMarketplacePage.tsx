import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag, Flag, Package, Tag, Eye, Trash2, X,
  User, Calendar, RefreshCw, AlertCircle, DollarSign, Info,
} from 'lucide-react';
import {
  getAdminMarketplaceListings,
  deleteMarketplaceListing,
} from '../../api/marketplace';
import type { MarketplaceListing } from '../../api/marketplace';

type Tab = 'reports' | 'listings' | 'categories';

const tabs = [
  { key: 'reports' as Tab,    label: 'Raporlananlar', icon: <Flag size={16} /> },
  { key: 'listings' as Tab,   label: 'İlanlar',       icon: <Package size={16} /> },
  { key: 'categories' as Tab, label: 'Kategoriler',   icon: <Tag size={16} /> },
];

const CONDITION_LABELS: Record<string, string> = {
  new: 'Sıfır',
  like_new: 'Yeni Gibi',
  good: 'İyi',
  fair: 'Orta',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: 'Aktif', className: 'bg-green-500/10 text-green-400' },
  sold:   { label: 'Satıldı', className: 'bg-gray-500/10 text-gray-400' },
  expired:{ label: 'Süresi Doldu', className: 'bg-yellow-500/10 text-yellow-400' },
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
// İLAN İNCELE MODALI
// ============================================================================
const ListingInspectModal: React.FC<{ listing: MarketplaceListing; onClose: () => void }> = ({
  listing,
  onClose,
}) => {
  const sellerName = listing.creator
    ? `${listing.creator.first_name ?? ''} ${listing.creator.last_name ?? ''}`.trim() || 'Anonim'
    : 'Anonim';
  const sellerUsername = listing.creator?.username ? `@${listing.creator.username}` : null;

  let imageUrls: string[] = [];
  try {
    if (listing.image_urls) imageUrls = JSON.parse(listing.image_urls) as string[];
  } catch { /* ignore malformed JSON */ }

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

        {/* Meta */}
        <div className="px-6 py-3 border-b border-gray-800 flex flex-wrap gap-x-5 gap-y-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <User size={12} className="text-gray-500" />
            <span className="font-semibold text-gray-300">{sellerName}</span>
            {sellerUsername && <span className="text-gray-600">{sellerUsername}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar size={12} className="text-gray-500" />
            {new Date(listing.created_at).toLocaleDateString('tr-TR', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <DollarSign size={12} className="text-gray-500" />
            <span className="font-bold text-green-400">
              {Number(listing.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
              {listing.category}
            </span>
            <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
              {CONDITION_LABELS[listing.condition] ?? listing.condition}
            </span>
            <span className={`px-2 py-0.5 rounded-full font-semibold ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Images */}
        {imageUrls.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-800 flex gap-2 overflow-x-auto shrink-0">
            {imageUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`İlan görseli ${i + 1}`}
                className="h-20 w-20 object-cover rounded-lg border border-gray-700 shrink-0"
              />
            ))}
          </div>
        )}

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
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminMarketplaceListings();
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
      await deleteMarketplaceListing(listingId);
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
            <Package size={16} className="text-blue-400" />
            <span className="text-sm font-semibold text-gray-300">Tüm İlanlar</span>
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
            <Package size={40} className="text-gray-600 mb-3" />
            <p className="text-sm text-gray-600">Henüz ilan bulunmuyor.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {listings.map(listing => {
              const statusInfo = STATUS_LABELS[listing.status] ?? { label: listing.status, className: 'bg-gray-700 text-gray-400' };
              const sellerName = listing.creator
                ? `${listing.creator.first_name ?? ''} ${listing.creator.last_name ?? ''}`.trim() || 'Anonim'
                : 'Anonim';
              return (
                <div
                  key={listing.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-200 truncate">{listing.title}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      <span>{sellerName}</span>
                      <span>•</span>
                      <span className="text-green-400 font-semibold">
                        {Number(listing.price).toLocaleString('tr-TR')} ₺
                      </span>
                      <span>•</span>
                      <span>{listing.category}</span>
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
export const AdminMarketplacePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('listings');

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <ShoppingBag size={22} className="text-red-500" />
          <h1 className="text-2xl font-black text-white tracking-tight">Marketplace Yönetimi</h1>
        </div>
        <p className="text-sm text-gray-500">Raporlanan ilanları inceleyin, aktif ilanları ve kategorileri yönetin.</p>
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
            description="Kullanıcıların raporladığı ilanları inceleyin ve gerekli işlemleri yapın."
          />
        )}
        {activeTab === 'listings' && <ListingsTab />}
        {activeTab === 'categories' && (
          <ComingSoon
            icon={<Tag size={32} />}
            title="Kategori Yönetimi"
            description="Marketplace kategorilerini ekleyin veya düzenleyin."
          />
        )}
      </div>
    </div>
  );
};
