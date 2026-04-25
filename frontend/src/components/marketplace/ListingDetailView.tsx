import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, MessageCircle, Trash2, MapPin, Tag } from 'lucide-react';
import type { MarketplaceCreator, MarketplaceListing } from '../../types/marketplace';
import { getImageUrl } from '../../utils/imageUrl';
import { Badge } from '../ui/badge';

interface ListingDetailViewProps {
  listing: MarketplaceListing;
  onBack: () => void;
  onContact: (creator: MarketplaceCreator | null | undefined) => void;
  onDelete?: (listingId: string) => Promise<void>;
  currentUserId?: string;
}

const conditionColors: Record<string, string> = {
  'Sıfır': 'bg-green-100 text-green-700',
  'Az Kullanılmış': 'bg-sky-100 text-sky-700',
  'Kullanılmış': 'bg-amber-100 text-amber-700',
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

export const ListingDetailView: React.FC<ListingDetailViewProps> = ({
  listing,
  onBack,
  onContact,
  onDelete,
  currentUserId,
}) => {
  const [activeIdx, setActiveIdx] = useState(0);

  const isOwner = currentUserId === listing.seller_id;

  const getImages = (): string[] => {
    try {
      if (!listing.image_urls) return [];
      const parsed =
        typeof listing.image_urls === 'string'
          ? (JSON.parse(listing.image_urls) as string[])
          : listing.image_urls;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const images = getImages();
  const activeImage = images[activeIdx] ? getImageUrl(images[activeIdx]) : undefined;
  const creatorProfilePath = listing.creator?.username
    ? `/dashboard/profile/${listing.creator.username}`
    : '/dashboard/profile';

  const sellerName = listing.creator
    ? `${listing.creator.first_name} ${listing.creator.last_name}`.trim()
    : listing.seller_name || 'İlan Sahibi';
  const sellerInitial = sellerName[0]?.toUpperCase() || 'U';

  const timeAgo = listing.created_at
    ? formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: tr })
    : '';

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex flex-col lg:flex-row">

        {/* Left – images */}
        <div className="lg:w-[45%] bg-slate-50 p-5 flex flex-col gap-4">
          {/* Main image */}
          <div className="aspect-square w-full rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
            {activeImage ? (
              <img
                src={activeImage}
                alt={listing.title}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-300">
                <ShoppingBag className="w-16 h-16" />
                <span className="text-sm">Fotoğraf yok</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 justify-center flex-wrap">
              {images.map((img, i) => {
                const thumbUrl = getImageUrl(img);
                return (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      activeIdx === i
                        ? 'border-[#0ea5e9] ring-2 ring-sky-100'
                        : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {thumbUrl ? (
                      <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-slate-300" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right – info */}
        <div className="lg:w-[55%] p-7 flex flex-col justify-between">
          <div>
            {/* Back + meta row */}
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0ea5e9] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Geri Dön
              </button>
              <span className="text-xs text-slate-400">{timeAgo}</span>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {listing.category && (
                <Badge className={`text-xs border-0 font-medium ${categoryColors[listing.category] || categoryColors['Diğer']}`}>
                  <Tag className="w-3 h-3 mr-1" />
                  {listing.category}
                </Badge>
              )}
              {listing.condition && (
                <Badge className={`text-xs border-0 font-medium ${conditionColors[listing.condition] || 'bg-slate-100 text-slate-600'}`}>
                  {listing.condition}
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-3">
              {listing.title}
            </h1>

            {/* Price */}
            <div className="text-3xl font-bold text-[#0ea5e9] mb-6">
              ₺{Number(listing.price).toLocaleString('tr-TR')}
            </div>

            {/* Description */}
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                İlan Açıklaması
              </p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {listing.description || 'Açıklama girilmemiş.'}
              </p>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Ürün Durumu
                </p>
                <p className="text-sm font-semibold text-slate-700">{listing.condition || 'Belirtilmemiş'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3" /> Konum
                </p>
                <p className="text-sm font-semibold text-slate-700 leading-tight">
                  {listing.creator?.university || 'Kampüs İçi'}
                </p>
              </div>
            </div>
          </div>

          {/* Seller + CTA */}
          <div className="border-t border-slate-100 pt-5">
            <Link
              to={creatorProfilePath}
              className="group flex items-center justify-between rounded-xl p-3 hover:bg-slate-50 transition-colors mb-4"
            >
              <div className="flex items-center gap-3">
                {listing.creator?.profile_picture_url ? (
                  <img
                    src={getImageUrl(listing.creator.profile_picture_url)}
                    alt={sellerName}
                    className="w-11 h-11 rounded-full object-cover border-2 border-sky-100"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-sky-100 text-[#0369a1] flex items-center justify-center font-bold text-base">
                    {sellerInitial}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-[#0ea5e9] transition-colors">
                    {sellerName}
                  </p>
                  {listing.creator?.university && (
                    <p className="text-xs text-slate-400">{listing.creator.university}</p>
                  )}
                </div>
              </div>
              <span className="text-xs text-slate-400 group-hover:text-[#0ea5e9] transition-colors">
                Profilini Gör ›
              </span>
            </Link>

            {!isOwner ? (
              <button
                onClick={() => onContact(listing.creator)}
                className="w-full flex items-center justify-center gap-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Satıcıyla İletişime Geç
              </button>
            ) : (
              <button
                onClick={() => {
                  if (window.confirm('Bu ilanı kalıcı olarak kaldırmak istediğinize emin misiniz?')) {
                    void onDelete?.(listing.id);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                İlanı Kaldır
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
