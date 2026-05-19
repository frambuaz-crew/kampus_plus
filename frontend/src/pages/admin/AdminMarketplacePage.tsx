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
  active:  { label: 'Aktif',         className: 'bg-green-50 text-green-600 border border-green-100' },
  sold:    { label: 'Satıldı',       className: 'bg-slate-100 text-slate-500 border border-slate-200' },
  expired: { label: 'Süresi Doldu',  className: 'bg-amber-50 text-amber-600 border border-amber-100' },
};

const ComingSoon: React.FC<{ title: string; description: string; icon: React.ReactNode }> = ({
  title, description, icon,
}) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 text-slate-450 shadow-sm animate-pulse">
      {icon}
    </div>
    <h3 className="text-sm font-bold text-slate-800 mb-1">{title}</h3>
    <p className="text-xs text-slate-400 max-w-sm leading-relaxed">{description}</p>
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

  const statusInfo = STATUS_LABELS[listing.status ?? ''] ?? { label: listing.status, className: 'bg-slate-100 text-slate-500' };
  const categoryName = listing.category?.name ?? '—';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Eye size={15} className="text-sky-600 shrink-0 mt-0.5" />
            <h2 className="text-sm font-bold text-slate-900 leading-snug truncate">{listing.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-450 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-x-5 gap-y-2 shrink-0 text-xs text-slate-450 font-bold uppercase tracking-wider text-[10px]">
          <div className="flex items-center gap-1.5">
            <User size={12} className="text-slate-400" />
            <span className="text-slate-700">{sellerName}</span>
            {sellerUsername && <span className="text-sky-600 font-semibold">{sellerUsername}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-slate-400" />
            <span>{listing.created_at ? new Date(listing.created_at).toLocaleDateString('tr-TR', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            }) : '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DollarSign size={12} className="text-slate-450" />
            <span className="text-green-600 font-extrabold">
              {Number(listing.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-lg">{categoryName}</span>
            <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-lg">
              {CONDITION_LABELS[listing.condition ?? ''] ?? listing.condition ?? '—'}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {imageUrls.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-100 flex gap-2 overflow-x-auto shrink-0 bg-slate-50/20">
            {imageUrls.map((url, i) => (
              <img key={i} src={url} alt={`İlan görseli ${i + 1}`}
                className="h-20 w-20 object-cover rounded-xl border border-slate-200 shadow-sm shrink-0" />
            ))}
          </div>
        )}

        <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0 bg-white">
          <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-2">Açıklama Detayı</p>
          {listing.description
            ? <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">{listing.description}</p>
            : <p className="text-sm text-slate-400 italic">Açıklama girilmemiş.</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold bg-slate-100 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-200 hover:text-slate-800 transition-colors">
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
            <Package size={15} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Tüm İlanlar</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-sky-50 text-sky-600 px-2.5 py-1 rounded-full border border-sky-100">
              {listings.length} ilan listelendi
            </span>
            <button onClick={() => void fetchListings()} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 text-xs font-semibold text-red-650 flex items-center gap-2 bg-red-50 border border-red-100 p-3 rounded-xl">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package size={36} className="text-slate-350 mb-3" />
            <p className="text-sm text-slate-400 font-semibold">Henüz ilan bulunmuyor.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {listings.map(listing => {
              const statusInfo = STATUS_LABELS[listing.status ?? ''] ?? { label: listing.status, className: 'bg-slate-100 text-slate-500' };
              const sellerName = listing.creator
                ? `${listing.creator.first_name ?? ''} ${listing.creator.last_name ?? ''}`.trim() || 'Anonim'
                : 'Anonim';
              const categoryName = listing.category?.name ?? '—';
              return (
                <div key={listing.id} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-bold text-slate-800 truncate leading-snug">{listing.title}</p>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                      <span className="text-slate-600">{sellerName}</span>
                      <span>•</span>
                      <span className="text-green-600 font-extrabold">
                        {Number(listing.price).toLocaleString('tr-TR')} ₺
                      </span>
                      <span>•</span>
                      <span>{categoryName}</span>
                      <span>•</span>
                      <span>{listing.created_at ? new Date(listing.created_at).toLocaleDateString('tr-TR') : '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setSelectedListing(listing)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-105 hover:bg-sky-100 transition-colors"
                    >
                      <Eye size={12} /> İncele
                    </button>
                    <button
                      onClick={() => void handleDelete(listing.id)}
                      disabled={deleting === listing.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-50 text-red-650 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">
              {initial ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={e => void handleSubmit(e)} className="px-6 py-5 space-y-4">
          {formError && (
            <div className="flex items-center gap-2 text-xs font-semibold text-red-650 bg-red-50 border border-red-100 p-3 rounded-xl">
              <AlertCircle size={14} className="shrink-0" /> {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-extrabold">Kategori Adı *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Örn: Ev & Yurt Eşyası"
              maxLength={100} required
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-sky-500 font-medium" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-extrabold">İkon (Emoji)</label>
            <input type="text" value={icon} onChange={e => setIcon(e.target.value)} placeholder="Örn: 🛋️"
              maxLength={50}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-sky-500 font-medium" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-extrabold">Açıklama</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Kategori hakkında kısa bir açıklama..." maxLength={500} rows={3}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-sky-500 resize-none font-medium" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-extrabold">Sıralama Önceliği</label>
            <input type="number" value={orderIndex} onChange={e => setOrderIndex(Number(e.target.value))} min={0}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-bold outline-none focus:bg-white focus:border-sky-500" />
          </div>

          <div className="flex items-center justify-between py-1 bg-slate-55 bg-slate-50 border border-slate-100 p-3 rounded-xl">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Yayın Durumu</span>
            <button type="button" onClick={() => setIsActive(v => !v)}
              className={`transition-colors ${isActive ? 'text-green-500' : 'text-slate-400'}`}>
              {isActive ? <ToggleRight size={30} /> : <ToggleLeft size={30} />}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 border border-slate-200 text-slate-650 hover:bg-slate-200 hover:text-slate-800 transition-colors">
              İptal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-sky-600 text-white hover:bg-sky-500 transition-colors disabled:opacity-50 shadow-md shadow-sky-500/10">
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
      setError(`"${cat.name}" kategorisinde ${cat.listing_count} aktif ilan var. Önce ilanları silin veya taşıyın.`);
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
        <div className="w-8 h-8 border-2 border-sky-250 border-t-sky-600 rounded-full animate-spin" />
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
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Tag size={15} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Marketplace Kategorileri</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-sky-50 text-sky-600 px-2.5 py-1 rounded-full border border-sky-100">
              {categories.length} kategori listelendi
            </span>
            <button onClick={() => void fetchCategories()} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
              <RefreshCw size={14} />
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-sky-600 text-white rounded-xl hover:bg-sky-500 transition-colors shadow-md shadow-sky-500/10">
              <Plus size={13} /> Yeni Kategori Ekle
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 text-xs font-semibold text-red-650 flex items-center gap-2 bg-red-50 border border-red-100 p-3.5 rounded-xl">
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError(null)} className="ml-auto hover:text-red-900"><X size={14} /></button>
          </div>
        )}

        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Tag size={36} className="text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-450 mb-1">Henüz kategori yok</h3>
            <p className="text-xs text-slate-450 mb-4">İlk kategoriyi ekleyerek başlayın.</p>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-sky-600 text-white rounded-xl hover:bg-sky-500 transition-colors">
              <Plus size={14} /> Yeni Kategori Ekle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-450">
                  <th className="px-6 py-3 w-16 text-center">İkon</th>
                  <th className="px-6 py-3">Adı / Sıra</th>
                  <th className="px-6 py-3">Açıklama</th>
                  <th className="px-6 py-3 w-24 text-center">İlan Sayısı</th>
                  <th className="px-6 py-3 w-28 text-center">Durum</th>
                  <th className="px-6 py-3 w-28 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map(cat => {
                  const isEmoji = !!cat.icon && (cat.icon.codePointAt(0) ?? 0) > 127;
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-55 bg-slate-50 border border-slate-150 text-base shadow-sm shrink-0 mx-auto">
                          {isEmoji ? cat.icon : '🏷️'}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800 truncate">{cat.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Sıra: #{cat.order_index}</p>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        <span className="line-clamp-2 max-w-sm">{cat.description ?? '—'}</span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{cat.listing_count}</span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          cat.is_active ? 'bg-green-50 border-green-100 text-green-600' : 'bg-slate-100 border-slate-200 text-slate-450'
                        }`}>
                          {cat.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => openEdit(cat)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors" title="Düzenle">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => void handleDelete(cat)} disabled={deleting === cat.id}
                            className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="Sil">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <ShoppingBag size={22} className="text-sky-600 animate-pulse" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Marketplace Yönetimi</h1>
        </div>
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest text-[10px]">Raporlanan ilanları inceleyin, aktif ilanları ve kategorileri yönetin.</p>
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
            description="Kullanıcıların raporladığı ilanları inceleyin ve gerekli işlemleri yapın."
          />
        )}
        {activeTab === 'listings' && <ListingsTab />}
        {activeTab === 'categories' && <CategoriesTab />}
      </div>
    </div>
  );
};
