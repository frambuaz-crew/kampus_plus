import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import type { MarketplaceCreator, MarketplaceListing } from '../../types/marketplace';
import { getImageUrl } from '../../utils/imageUrl';

interface ListingDetailViewProps {
  listing: MarketplaceListing;
  onBack: () => void;
  onContact: (creator: MarketplaceCreator | null | undefined) => void;
  onDelete?: (listingId: string) => Promise<void>;
  currentUserId?: string;
}

export const ListingDetailView: React.FC<ListingDetailViewProps> = ({
  listing,
  onBack,
  onContact,
  onDelete,
  currentUserId,
}) => {
  const baseUrl = 'http://localhost:8000';
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const isOwner = currentUserId === listing.seller_id;

  const getImages = () => {
    try {
      if (!listing.image_urls) {
        return [] as string[];
      }
      const parsed =
        typeof listing.image_urls === 'string'
          ? (JSON.parse(listing.image_urls) as string[])
          : listing.image_urls;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [] as string[];
    }
  };

  const images = getImages();
  const creatorProfilePath = listing.creator?.username
    ? `/dashboard/profile/${listing.creator.username}`
    : '/dashboard/profile';

  return (
    <div className="mx-auto max-w-5xl animate-in zoom-in-95 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl duration-300 fade-in">
      <div className="flex flex-col lg:flex-row">
        <div className="bg-gray-50 p-4 lg:w-1/2">
          <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-inner">
            {images.length > 0 ? (
              <img
                src={`${baseUrl}${images[activeImageIndex].startsWith('/')
                    ? images[activeImageIndex]
                    : `/${images[activeImageIndex]}`
                  }`}
                className="h-full w-full object-contain"
                alt={listing.title}
              />
            ) : (
              <div className="text-8xl">📦</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              {images.map((img, index) => (
                <button
                  key={img + index}
                  onClick={() => setActiveImageIndex(index)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-all ${activeImageIndex === index
                      ? 'border-indigo-600 ring-2 ring-indigo-50'
                      : 'border-transparent opacity-60'
                    }`}
                >
                  <img
                    src={`${baseUrl}${img.startsWith('/') ? img : `/${img}`}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between p-8 lg:w-1/2">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-4 text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800"
            >
              ← Geri Dön
            </button>
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-700">
                {listing.category}
              </span>
              <span className="text-xs text-gray-400">
                {listing.created_at
                  ? formatDistanceToNow(new Date(listing.created_at), {
                    addSuffix: true,
                    locale: tr,
                  })
                  : ''}
              </span>
            </div>
            <h1 className="mb-2 text-3xl font-extrabold uppercase leading-tight tracking-tight text-gray-900">
              {listing.title}
            </h1>
            <div className="mb-6 text-2xl font-bold text-indigo-600">
              {Number(listing.price).toLocaleString('tr-TR')} TL
            </div>
            <div className="mb-8 space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                İlan Açıklaması
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {listing.description}
              </p>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-tighter text-gray-400">
                  Ürün Durumu
                </p>
                <p className="text-xs font-semibold text-gray-700">{listing.condition || 'İkinci El'}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-tighter text-gray-400">Konum</p>
                <p className="text-xs font-semibold uppercase text-gray-700">
                  {listing.creator?.university || 'Kampüs İçi'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <Link
              to={creatorProfilePath}
              className="group mb-6 flex cursor-pointer items-center justify-between rounded-xl p-2 transition-all hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                {listing.creator?.profile_picture_url ? (
                  <>
                    <img
                      src={getImageUrl(listing.creator.profile_picture_url)}
                      alt={listing.creator.first_name || 'Satıcı'}
                      className="h-12 w-12 rounded-full border-2 border-indigo-100 object-cover shadow-md transition-transform group-hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold uppercase text-white shadow-md transition-transform group-hover:scale-110" style={{ display: 'none' }}>
                      {listing.creator?.first_name ? listing.creator.first_name[0] : 'U'}
                    </div>
                  </>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold uppercase text-white shadow-md transition-transform group-hover:scale-110">
                    {listing.creator?.first_name ? listing.creator.first_name[0] : 'U'}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold uppercase text-gray-900 transition-colors group-hover:text-indigo-600">
                    {listing.creator
                      ? `${listing.creator.first_name} ${listing.creator.last_name}`
                      : 'İlan Sahibi'}
                  </h4>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    {listing.creator?.university || 'Kampüs İçi Satıcı'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-gray-300 transition-colors group-hover:text-indigo-600">
                Profilini Gör ❯
              </span>
            </Link>

            <div className="flex flex-col gap-3">
              {!isOwner ? (
                <button
                  onClick={() => onContact(listing.creator)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-100 transition-all active:scale-95 hover:bg-indigo-700"
                >
                  <span>💬</span> Satıcıyla İletişime Geç
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (window.confirm('Bu ilanı kalıcı olarak kaldırmak istediğinize emin misiniz?')) {
                      void onDelete?.(listing.id);
                    }
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-4 text-sm font-bold uppercase tracking-wider text-red-600 transition-all active:scale-95 hover:bg-red-100"
                >
                  <span>🗑️</span> İlanı Kaldır
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
