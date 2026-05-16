import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../api/config';
import { getMarketplaceCategories } from '../api/marketplace';
import { MainLayout } from '../components/layout/MainLayout';
import { NewListingForm } from '../components/marketplace/NewListingForm';
import { ListingDetailView } from '../components/marketplace/ListingDetailView';
import type { MarketplaceCategory, MarketplaceListing } from '../types/marketplace';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Search, Plus, ShoppingBag, Heart, ArrowLeft } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

interface BackState {
  from?: string;
  tab?: string;
}

function getFirstImageUrl(imageUrls: string[] | string | null | undefined): string | undefined {
  if (!imageUrls) return undefined;
  if (Array.isArray(imageUrls)) return getImageUrl(imageUrls[0]);
  try {
    const parsed = JSON.parse(imageUrls) as string[];
    if (Array.isArray(parsed) && parsed.length > 0) return getImageUrl(parsed[0]);
  } catch {
    // not JSON, treat as single URL
  }
  return getImageUrl(imageUrls);
}

function timeAgo(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const utcDateStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
  const diff = Math.floor((Date.now() - new Date(utcDateStr).getTime()) / 1000);
  if (diff < 60) return 'Az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dak önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'Sıfır',
  like_new: 'Yeni Gibi',
  good: 'İyi',
  fair: 'Orta',
};

const conditionColors: Record<string, string> = {
  'new': 'bg-green-100 text-green-700',
  'like_new': 'bg-sky-100 text-sky-700',
  'good': 'bg-amber-100 text-amber-700',
  'fair': 'bg-orange-100 text-orange-700',
};

const categoryColors: Record<string, string> = {
  'Kitap': 'bg-blue-100 text-blue-700',
  'Elektronik': 'bg-purple-100 text-purple-700',
  'Giyim': 'bg-pink-100 text-pink-700',
  'Spor': 'bg-green-100 text-green-700',
  'Eşya': 'bg-orange-100 text-orange-700',
  'Hobi': 'bg-rose-100 text-rose-700',
  'Diğer': 'bg-slate-100 text-slate-600',
};

export const MarketplacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState<'list' | 'detail'>('list');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [contactListing, setContactListing] = useState<MarketplaceListing | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'university'>('all');
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const getCurrentUserId = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData) as { id?: string; user_id?: string };
        return parsed.id || parsed.user_id || null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const currentUserId = getCurrentUserId();

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<MarketplaceListing[]>('/marketplace/', {
        params: { scope: scopeFilter === 'all' ? undefined : scopeFilter }
      });
      const sortedData = (response.data || []).sort(
        (left, right) =>
          new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime(),
      );
      setListings(sortedData);
    } catch {
      setError('İlanlar şu an getirilemiyor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadListings();
  }, [scopeFilter]);

  useEffect(() => {
    getMarketplaceCategories()
      .then(res => setCategories(res.categories.filter(c => c.is_active)))
      .catch(() => {});
      
    apiClient.get('/users/favorites/all')
      .then(res => {
        const favIds = new Set<string>(
          (res.data.favorites || [])
            .filter((f: any) => f.target_type === 'marketplace_listing')
            .map((f: any) => f.target_id)
        );
        setFavorites(favIds);
      })
      .catch(() => {});
  }, []);

  const toggleFavorite = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    try {
      const isFav = favorites.has(listingId);
      setFavorites(prev => {
        const next = new Set(prev);
        if (isFav) next.delete(listingId);
        else next.add(listingId);
        return next;
      });
      await apiClient.post('/users/favorites/toggle', {
        target_type: 'marketplace_listing',
        target_id: listingId
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!id) {
      setView('list');
      setSelectedListing(null);
      return;
    }
    if (listings.length > 0) {
      setView('detail');
      setSelectedListing(prev => (prev?.id === id ? prev : listings.find(l => l.id === id) || null));
    }
  }, [id, listings]);

  const handleDeleteListing = async (listingId: string) => {
    try {
      await apiClient.delete(`/marketplace/${listingId}`);
      setListings(prev => prev.filter(l => l.id !== listingId));
      setView('list');
      if (id) navigate('/dashboard/marketplace', { replace: true });
    } catch {
      setError('İlan silinirken bir hata oluştu.');
    }
  };

  const handleCreateListing = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      await apiClient.post('/marketplace/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setIsNewOpen(false);
      await loadListings();
    } catch {
      setError('İlan oluşturulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleListingClick = async (listing: MarketplaceListing) => {
    try {
      const res = await apiClient.get<MarketplaceListing>(`/marketplace/${listing.id}`);
      setSelectedListing(res.data);
    } catch {
      setSelectedListing(listing);
    }
    setView('detail');
    navigate(`/dashboard/marketplace/${listing.id}`, { state: location.state });
  };

  const goBackFromDetail = () => {
    const state = (location.state as BackState | null) || null;
    if (state?.from) {
      navigate(state.from, { state: state.tab ? { tab: state.tab } : undefined });
    } else {
      navigate('/dashboard/marketplace');
    }
  };

  const filteredListings = listings.filter((listing) => {
    const matchesCategory = categoryFilter === 'all' || listing.category_id === categoryFilter;
    const matchesSearch =
      !searchQuery ||
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (listing.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-[#0ea5e9]" />
                {view === 'detail' ? 'İlan Detayı' : 'Pazar'}
              </h1>
              {view === 'list' && (
                <p className="text-xs text-muted-foreground mt-0.5">Kampüsten al-sat yeri</p>
              )}
            </div>
          </div>
          {view === 'list' && (
            <Button
              onClick={() => setIsNewOpen(true)}
              size="sm"
              className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Yeni İlan
            </Button>
          )}
        </div>

        {/* Contact Dialog */}
        <ContactDialog
          listing={contactListing}
          onClose={() => setContactListing(null)}
          onSent={(convId) => { setContactListing(null); navigate(`/dashboard/messages/${convId}`); }}
          onError={(msg) => setError(msg)}
        />

        {/* New Listing Dialog */}
        <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900">Yeni İlan Oluştur</DialogTitle>
              <DialogDescription className="sr-only">Pazar ilanı oluşturma formu</DialogDescription>
            </DialogHeader>
            <NewListingForm
              onSubmit={handleCreateListing}
              onCancel={() => setIsNewOpen(false)}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Detail View */}
        {view === 'detail' && selectedListing && (
          <ListingDetailView
            listing={selectedListing}
            onBack={goBackFromDetail}
            onDelete={handleDeleteListing}
            currentUserId={currentUserId || undefined}
            onContact={(creator) => {
              if (selectedListing) setContactListing(selectedListing);
            }}
            isFavorited={favorites.has(selectedListing.id)}
            onToggleFavorite={(e) => toggleFavorite(e, selectedListing.id)}
          />
        )}

        {/* List View */}
        {view === 'list' && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="İlan ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Tüm Kategoriler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kategoriler</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl mb-6 w-fit">
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

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card animate-pulse">
                    <div className="aspect-square bg-muted rounded-t-xl" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-20">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">İlan bulunamadı</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {searchQuery || categoryFilter !== 'all'
                    ? 'Farklı filtreler deneyin veya aramayı temizleyin.'
                    : 'Henüz ilan yok. İlk ilanı sen ver!'}
                </p>
                <Button
                  onClick={() => setIsNewOpen(true)}
                  size="sm"
                  className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Yeni İlan
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredListings.map((listing) => {
                  const imageUrl = getFirstImageUrl(listing.image_urls);
                  const sellerName = listing.creator
                    ? `${listing.creator.first_name} ${listing.creator.last_name}`.trim()
                    : listing.seller_name || 'Satıcı';
                  const sellerInitial = sellerName[0]?.toUpperCase() || 'S';
                  const price =
                    typeof listing.price === 'number'
                      ? listing.price.toLocaleString('tr-TR')
                      : String(listing.price);

                  return (
                    <Card
                      key={listing.id}
                      className="overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group border border-slate-200"
                      onClick={() => handleListingClick(listing)}
                    >
                      {/* Image */}
                      <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={listing.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <ShoppingBag className="h-10 w-10 text-slate-300" />
                            <span className="text-xs text-slate-400">Fotoğraf yok</span>
                          </div>
                        )}
                        {/* Price badge */}
                        <div className="absolute top-3 right-0 bg-[#0ea5e9] text-white px-3 py-1.5 rounded-l-lg font-bold text-sm shadow-md">
                          ₺{price}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h4 className="font-semibold text-sm text-slate-900 mb-2.5 line-clamp-2 leading-snug group-hover:text-[#0ea5e9] transition-colors">
                          {listing.title}
                        </h4>

                        {/* Category + Condition badges */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {listing.category?.name && (
                            <Badge className={`text-xs border-0 font-medium ${categoryColors[listing.category.name] || categoryColors['Diğer']}`}>
                              {listing.category.name}
                            </Badge>
                          )}
                          {listing.condition && (
                            <Badge className={`text-xs border-0 font-medium ${conditionColors[listing.condition] || 'bg-slate-100 text-slate-600'}`}>
                              {CONDITION_LABELS[listing.condition] || listing.condition}
                            </Badge>
                          )}
                        </div>

                        {/* Seller */}
                        <div className="flex items-center gap-2 mb-3">
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={
                                listing.creator?.profile_picture_url
                                  ? getImageUrl(listing.creator.profile_picture_url)
                                  : undefined
                              }
                            />
                            <AvatarFallback className="text-[10px] bg-sky-100 text-sky-700 font-semibold">{sellerInitial}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">{sellerName}</p>
                            {listing.creator?.university && (
                              <p className="text-[10px] text-slate-400 truncate">{listing.creator.university}</p>
                            )}
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                          <span className="text-[11px] text-slate-400">
                            {timeAgo(listing.created_at)}
                          </span>
                          <button
                            className={`p-1 rounded-md transition-colors ${
                              favorites.has(listing.id)
                                ? 'text-red-500 hover:bg-red-50'
                                : 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                            }`}
                            onClick={(e) => toggleFavorite(e, listing.id)}
                          >
                            <Heart 
                              className="h-4 w-4" 
                              fill={favorites.has(listing.id) ? "currentColor" : "none"} 
                            />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

// ─── Contact Dialog ───────────────────────────────────────────────────────────

const ContactDialog: React.FC<{
  listing: MarketplaceListing | null;
  onClose: () => void;
  onSent: (convId: string) => void;
  onError: (msg: string) => void;
}> = ({ listing, onClose, onSent, onError }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const userRaw = localStorage.getItem('user');
  const me = userRaw ? (JSON.parse(userRaw) as { first_name?: string; last_name?: string }) : null;

  const handleSend = async () => {
    if (!message.trim() || !listing) return;
    try {
      setLoading(true);
      const res = await apiClient.post<{ conversation_id: string; success: boolean }>(
        `/marketplace/${listing.id}/contact`,
        { message_text: message.trim() },
      );
      onSent(res.data.conversation_id);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      onError(msg || 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!listing} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900">
            Satıcıyla İletişime Geç
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {listing?.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mesajınızı yazın..."
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/15 transition-all resize-none"
            autoFocus
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!message.trim() || loading}
              className="flex-1 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg text-sm font-semibold transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
