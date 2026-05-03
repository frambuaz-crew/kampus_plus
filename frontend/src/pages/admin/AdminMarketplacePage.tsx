import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag, Flag, Package, Tag, Eye, Trash2, X,
  User, Calendar, RefreshCw, AlertCircle, DollarSign,
  Plus, Pencil, ToggleLeft, ToggleRight,
} from 'lucide-react';
import {
  getAdminMarketplaceListings,
  deleteMarketplaceListing,
  getMarketplaceCategories,
  createMarketplaceCategory,
  updateMarketplaceCategory,
  deleteMarketplaceCategory,
} from '../../api/marketplace';
import type { MarketplaceListing } from '../../api/marketplace';
import type { MarketplaceCategory, CreateCategoryPayload } from '../../types/marketplace';

type Tab = 'reports' | 'listings' | 'categories';

const tabs = [
  { key: 'reports' as Tab,    label: 'Raporlananlar', icon: <Flag size={16} /> },
  { key: 'listings' as Tab,   label: 'İlanlar',       icon: <Package size={16} /> },
  { key: 'categories' as Tab, label: 'Kategoriler',   icon: <Tag size={16} /> },
];

const CONDITION_LABELS: Record<string, string> = {
  new:      'Sıfır',
  like_new: 'Yeni Gibi',
  good:     'İyi',
  fair:     'Orta',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active:  { label: 'Aktif',         className: 'bg-green-500/10 text-green-400' },
  sold:    { label: 'Satıldı',       className: 'bg-gray-500/10 text-gray-400' },
  expired: { label: 'Süresi Doldu',  className: 'bg-yellow-500/10 text-yellow-400' },
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
  listing, onClose,
}) => {
  const sellerName = listing.creator
    ? `${listing.creator.first_name ?? ''} ${listing.creator.last_name ?? ''}`.trim() || 'Anonim'
    : 'Anonim';
  const sellerUsername = listing.creator?.username ? `@${listing.creator.username}` : null;

  let imageUrls: string[] = [];
  try {
    if (listing.image_urls) imageUrls = JSON.parse(listing.image_urls as string) as string[];
  } catch { /* ignore */ }

  const statusInfo = STATUS_LABELS[listing.status ?? ''] ?? { label: listing.status, className: 'bg-gray-700 text-gray-400' };
  const categoryName = listing.category?.name ?? '—';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Eye size={16} className="text-blue-400 shrink-0 mt-0.5" />
            <h2 className="text-base font-bold text-white leading-snug truncate">{listing.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-800 flex flex-wrap gap-x-5 gap-y-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <User size={12} className="text-gray-500" />
            <span className="font-semibold text-gray-300">{sellerName}</span>
            {sellerUsername && <span className="text-gray-600">{sellerUsername}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar size={12} className="text-gray-500" />
            {listing.created_at ? new Date(listing.created_at).toLocaleDateString('tr-TR', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            }) : '—'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <DollarSign size={12} className="text-gray-500" />
            <span className="font-bold text-green-400">
              {Number(listing.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{categoryName}</span>
            <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
              {CONDITION_LABELS[listing.condition ?? ''] ?? listing.condition ?? '—'}
            </span>
            <span className={`px-2 py-0.5 rounded-full font-semibold ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {imageUrls.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-800 flex gap-2 overflow-x-auto shrink-0">
            {imageUrls.map((url, i) => (
              <img key={i} src={url} alt={`İlan görseli ${i + 1}`}
                className="h-20 w-20 object-cover rounded-lg border border-gray-700 shrink-0" />
            ))}
          </div>
        )}

        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Açıklama</p>
          {listing.description
            ? <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
            : <p className="text-sm text-gray-600 italic">Açıklama girilmemiş.</p>}
        </div>

        <div className="px-6 py-3 border-t border-gray-800 flex justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors">
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
      setListings(await getAdminMarketplaceListings());
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
            <button onClick={fetchListings} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors">
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
              const statusInfo = STATUS_LABELS[listing.status ?? ''] ?? { label: listing.status, className: 'bg-gray-700 text-gray-400' };
              const sellerName = listing.creator
                ? `${listing.creator.first_name ?? ''} ${listing.creator.last_name ?? ''}`.trim() || 'Anonim'
                : 'Anonim';
              const categoryName = listing.category?.name ?? '—';
              return (
                <div key={listing.id} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-800/50 transition-colors">
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
                      <span>{categoryName}</span>
                      <span>•</span>
                      <span>{listing.created_at ? new Date(listing.created_at).toLocaleDateString('tr-TR') : '—'}</span>
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
// KATEGORİ FORMU MODALİ
// ============================================================================
interface CategoryFormModalProps {
  initial?: MarketplaceCategory | null;
  onSave: (data: CreateCategoryPayload) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ initial, onSave, onClose, saving }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '');
  const [orderIndex, setOrderIndex] = useState(initial?.order_index ?? 0);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) { setFormError('Kategori adı zorunludur.'); return; }
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        icon: icon.trim() || null,
        order_index: orderIndex,
        is_active: isActive,
      });
    } catch (err: any) {
      setFormError((err?.response?.data?.error?.message as string | undefined) ?? 'Kaydedilemedi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-orange-400" />
            <h2 className="text-base font-bold text-white">
              {initial ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {formError && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
              <AlertCircle size={14} /> {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ad *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Örn: Elektronik"
              maxLength={100} required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">İkon (Emoji)</label>
            <input type="text" value={icon} onChange={e => setIcon(e.target.value)} placeholder="Örn: 💻"
              maxLength={50}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Açıklama</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Kategori hakkında kısa bir açıklama..." maxLength={500} rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 resize-none" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Sıralama</label>
            <input type="number" value={orderIndex} onChange={e => setOrderIndex(Number(e.target.value))} min={0}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40" />
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-semibold text-gray-300">Aktif</span>
            <button type="button" onClick={() => setIsActive(v => !v)}
              className={`transition-colors ${isActive ? 'text-green-400' : 'text-gray-600'}`}>
              {isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
              İptal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-orange-600 text-white hover:bg-orange-500 transition-colors disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// KATEGORİLER SEKMESİ
// ============================================================================
const CategoriesTab: React.FC = () => {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MarketplaceCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMarketplaceCategories();
      setCategories(res.categories ?? []);
    } catch {
      setError('Kategoriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchCategories(); }, [fetchCategories]);

  const openCreate = () => { setEditTarget(null); setIsModalOpen(true); };
  const openEdit = (cat: MarketplaceCategory) => { setEditTarget(cat); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditTarget(null); };

  const handleSave = async (data: CreateCategoryPayload) => {
    setSaving(true);
    try {
      if (editTarget) {
        const res = await updateMarketplaceCategory(editTarget.id, data);
        setCategories(prev => prev.map(c => c.id === editTarget.id ? res.category : c));
      } else {
        const res = await createMarketplaceCategory(data);
        setCategories(prev => [...prev, res.category]);
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: MarketplaceCategory) => {
    if (cat.listing_count > 0) {
      setError(`"${cat.name}" kategorisinde ${cat.listing_count} ilan var. Önce ilanları silin veya taşıyın.`);
      return;
    }
    if (!confirm(`"${cat.name}" kategorisini silmek istediğinize emin misiniz?`)) return;
    try {
      setDeleting(cat.id);
      await deleteMarketplaceCategory(cat.id);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
    } catch (err: any) {
      setError((err?.response?.data?.error?.message as string | undefined) ?? 'Silinemedi.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {isModalOpen && (
        <CategoryFormModal
          initial={editTarget}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
        />
      )}

      <div>
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-orange-400" />
            <span className="text-sm font-semibold text-gray-300">Marketplace Kategorileri</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full font-semibold">
              {categories.length} kategori
            </span>
            <button onClick={fetchCategories} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors">
              <RefreshCw size={14} />
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition-colors">
              <Plus size={13} /> Yeni Kategori Ekle
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 text-sm text-red-400 flex items-center gap-2 bg-red-500/10 p-3 rounded-lg">
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Tag size={40} className="text-gray-700 mb-3" />
            <h3 className="text-base font-bold text-gray-400 mb-1">Henüz kategori yok</h3>
            <p className="text-sm text-gray-600 mb-4">İlk kategoriyi ekleyerek başlayın.</p>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition-colors">
              <Plus size={14} /> Yeni Kategori Ekle
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {/* Table header */}
            <div className="px-6 py-2.5 grid grid-cols-[3rem_1fr_2fr_6rem_5rem_6rem] gap-4 text-[10px] font-black uppercase tracking-widest text-gray-600">
              <span>İkon</span>
              <span>Ad</span>
              <span>Açıklama</span>
              <span className="text-center">İlan</span>
              <span className="text-center">Durum</span>
              <span className="text-right">İşlem</span>
            </div>

            {categories.map(cat => {
              const isEmoji = !!cat.icon && (cat.icon.codePointAt(0) ?? 0) > 127;
              return (
                <div key={cat.id} className="px-6 py-3.5 grid grid-cols-[3rem_1fr_2fr_6rem_5rem_6rem] gap-4 items-center hover:bg-gray-800/40 transition-colors">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-base overflow-hidden shrink-0">
                    {isEmoji ? cat.icon : '🏷️'}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-200 truncate">{cat.name}</p>
                    <p className="text-[10px] text-gray-600">Sıra: {cat.order_index}</p>
                  </div>

                  <p className="text-xs text-gray-500 truncate">{cat.description ?? '—'}</p>

                  <div className="text-center">
                    <span className="text-sm font-bold text-gray-300">{cat.listing_count}</span>
                  </div>

                  <div className="flex justify-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      cat.is_active ? 'bg-green-500/10 text-green-400' : 'bg-gray-700 text-gray-500'
                    }`}>
                      {cat.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => openEdit(cat)}
                      className="p-1.5 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors" title="Düzenle">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => void handleDelete(cat)} disabled={deleting === cat.id}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50" title="Sil">
                      <Trash2 size={13} />
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
        {activeTab === 'categories' && <CategoriesTab />}
      </div>
    </div>
  );
};
