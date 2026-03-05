import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import axios from 'axios';
import { Link } from 'react-router-dom';
import type { MarketplaceListing } from '../../types/marketplace';
import { apiClient } from '../../api/config';
import { getImageUrl } from '../../utils/imageUrl';

interface ListingCardProps {
  listing: MarketplaceListing;
}

interface FavoriteRecord {
  target_id: string;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const baseUrl = 'http://localhost:8000';

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        const response = await apiClient.get('/users/favorites/all');
        const favorites = response.data?.favorites as FavoriteRecord[] | undefined;
        if (favorites) {
          setIsFavorite(favorites.some((fav) => fav.target_id === listing.id));
        }
      } catch (error) {
        console.error('[ListingCard] Error checking initial favorites', error);
      }
    };

    void checkFavoriteStatus();
  }, [listing.id]);

  const toggleFavorite = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();

    if (!localStorage.getItem('user')) {
      alert('Favorilere eklemek için giriş yapmalısınız.');
      return;
    }

    try {
      const response = await apiClient.post('/users/favorites/toggle', {
        target_type: 'marketplace_listing',
        target_id: listing.id,
      });

      if (response.data?.success) {
        setIsFavorite(response.data.action === 'added');
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        alert('Favorilere eklemek için giriş yapmalısınız.');
      } else {
        console.error('[ListingCard] Favori işlemi detaylı hata:', error);
      }
    }
  };

  const getFirstImage = () => {
    if (!listing.image_urls) {
      return null;
    }

    try {
      const images =
        typeof listing.image_urls === 'string'
          ? (JSON.parse(listing.image_urls) as string[])
          : listing.image_urls;

      if (Array.isArray(images) && images.length > 0) {
        const firstPath = images[0];
        const cleanPath = firstPath.startsWith('/') ? firstPath : `/${firstPath}`;
        return `${baseUrl}${cleanPath}`;
      }

      return null;
    } catch {
      return null;
    }
  };

  const mainImage = getFirstImage();
  const creatorProfilePath = listing.creator?.username
    ? `/dashboard/profile/${listing.creator.username}`
    : '/dashboard/profile';

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
      <button
        onClick={toggleFavorite}
        className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 shadow-sm backdrop-blur-sm transition-transform hover:scale-110"
      >
        <span className={isFavorite ? 'text-xl text-red-500' : 'text-xl text-gray-400'}>
          {isFavorite ? '❤️' : '🤍'}
        </span>
      </button>

      <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gray-50 text-gray-400">
        {mainImage ? (
          <img
            src={mainImage}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://via.placeholder.com/400?text=Gorsel+Yok';
            }}
          />
        ) : (
          <span className="text-5xl transition-transform group-hover:scale-110">📦</span>
        )}

        <div className="absolute bottom-3 left-3">
          <span className="rounded bg-indigo-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            {listing.category || 'Eşya'}
          </span>
        </div>
      </div>

      <div className="p-4">
        <Link
          to={creatorProfilePath}
          className="mb-3 flex w-fit items-center gap-2 transition-opacity hover:opacity-80"
          onClick={(e) => e.stopPropagation()}
        >
          {listing.creator?.profile_picture_url ? (
            <img
              src={getImageUrl(listing.creator.profile_picture_url)}
              alt={listing.creator.first_name || 'Seller'}
              className="h-7 w-7 rounded-full border border-indigo-200 object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-indigo-200 bg-indigo-100 text-[11px] font-bold uppercase text-indigo-600">
              {listing.creator?.first_name
                ? listing.creator.first_name[0].toUpperCase()
                : 'U'}
            </div>
          )}

          <div className="flex flex-col">
            <span className="mb-0.5 text-xs font-bold leading-none text-gray-800">
              {listing.creator
                ? `${listing.creator.first_name} ${listing.creator.last_name}`
                : 'Üniversite Öğrencisi'}
            </span>
            <span className="text-[10px] uppercase leading-none text-gray-400">
              {listing.creator?.university || 'Kampüs İçi'}
            </span>
          </div>
        </Link>

        <div className="mb-1 flex items-start justify-between">
          <h3 className="flex-1 truncate text-sm font-bold uppercase text-gray-900" title={listing.title}>
            {listing.title}
          </h3>
          <span className="ml-2 text-sm font-extrabold text-indigo-600">
            {Number(listing.price).toLocaleString('tr-TR')} TL
          </span>
        </div>

        <p className="mb-4 line-clamp-1 text-xs text-gray-500">{listing.description}</p>

        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400">
              📅{' '}
              {listing.created_at
                ? formatDistanceToNow(new Date(listing.created_at), {
                    addSuffix: true,
                    locale: tr,
                  })
                : 'Yeni eklendi'}
            </span>

            <span className="text-[10px] font-medium uppercase text-orange-600">
              🏷️ {listing.condition || 'İkinci El'}
            </span>
          </div>

          <button className="text-xs font-bold uppercase tracking-tight text-indigo-600 transition-colors hover:text-indigo-800">
            İncele →
          </button>
        </div>
      </div>
    </div>
  );
};