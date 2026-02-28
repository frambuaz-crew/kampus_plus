import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/config";
import { getImageUrl } from "../../utils/imageUrl";

interface ListingCardProps {
  listing: any;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const baseUrl = "http://localhost:8000";

  // Check initial favorite status
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        const response = await apiClient.get("/users/favorites/all");
        if (response.data && response.data.favorites) {
          const isFav = response.data.favorites.some(
            (fav: any) => fav.target_id === listing.id
          );
          setIsFavorite(isFav);
          console.log(`[ListingCard] Initial favorite status for ${listing.id}:`, isFav);
        }
      } catch (error) {
        console.error("[ListingCard] Error checking initial favorites", error);
      }
    };

    checkFavoriteStatus();
  }, [listing.id]);

  const toggleFavorite = async (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("[ListingCard] Kalp butonuna tıklandı! Event:", e);
    e.stopPropagation();
    e.preventDefault();

    const userId = localStorage.getItem("user");
    if (!userId) {
      alert("Favorilere eklemek için giriş yapmalısınız.");
      return;
    }

    try {
      const payload = {
        target_type: "marketplace_listing",
        target_id: listing.id
      };

      console.log("[ListingCard] İstek atılıyor payload:", payload);
      const response = await apiClient.post("/users/favorites/toggle", payload);
      console.log("[ListingCard] Backend API Yanıtı:", response.data);

      if (response.data && response.data.success) {
        setIsFavorite(response.data.action === "added");
        console.log(`[ListingCard] State güncellendi. Yeni favori durumu: ${response.data.action === "added"}`);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        alert("Favorilere eklemek için giriş yapmalısınız.");
      } else {
        console.error("[ListingCard] Favori işlemi detaylı hata:", error.response || error);
      }
    }
  };

  const getFirstImage = () => {
    if (!listing || !listing.image_urls) return null;

    try {
      const images =
        typeof listing.image_urls === "string"
          ? JSON.parse(listing.image_urls)
          : listing.image_urls;

      if (Array.isArray(images) && images.length > 0) {
        const firstPath = images[0];
        const cleanPath = firstPath.startsWith("/")
          ? firstPath
          : "/" + firstPath;

        return baseUrl + cleanPath;
      }

      return null;
    } catch (e) {
      return null;
    }
  };

  const mainImage = getFirstImage();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group relative">
      <button
        onClick={toggleFavorite}
        className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-transform"
      >
        <span
          className={isFavorite ? "text-red-500 text-xl" : "text-gray-400 text-xl"}
        >
          {isFavorite ? "❤️" : "🤍"}
        </span>
      </button>

      <div className="h-48 bg-gray-50 flex items-center justify-center text-gray-400 relative overflow-hidden">
        {mainImage ? (
          <img
            src={mainImage}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://via.placeholder.com/400?text=Gorsel+Yok";
            }}
          />
        ) : (
          <span className="text-5xl group-hover:scale-110 transition-transform">
            📦
          </span>
        )}

        <div className="absolute bottom-3 left-3">
          <span className="bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm">
            {listing.category || "Eşya"}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* PROFİL LİNKİ GÜNCELLEMESİ (SARI YENİ) */}
        <Link
          to={`/dashboard/profile/${listing.creator?.username}`}
          className="flex items-center gap-2 mb-3 cursor-pointer hover:opacity-80 transition-opacity w-fit"
          onClick={(e) => e.stopPropagation()} // Kart detayının açılmasını engeller
        >
          {listing.creator?.profile_picture_url ? (
            <img
              src={getImageUrl(listing.creator.profile_picture_url)}
              alt={listing.creator.first_name || 'Seller'}
              className="w-7 h-7 rounded-full object-cover border border-indigo-200"
            />
          ) : (
            <div className="w-7 h-7 flex-shrink-0 bg-indigo-100 rounded-full flex items-center justify-center text-[11px] font-bold text-indigo-600 border border-indigo-200 uppercase overflow-hidden">
              {listing.creator?.first_name
                ? listing.creator.first_name[0].toUpperCase()
                : "U"}
            </div>
          )}

          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-800 leading-none mb-0.5">
              {listing.creator
                ? `${listing.creator.first_name} ${listing.creator.last_name}`
                : "Üniversite Öğrencisi"}
            </span>
            <span className="text-[10px] text-gray-400 leading-none uppercase">
              {listing.creator?.university || "Kampüs İçi"}
            </span>
          </div>
        </Link>

        <div className="flex justify-between items-start mb-1">
          <h3
            className="font-bold text-gray-900 truncate flex-1 uppercase text-sm"
            title={listing.title}
          >
            {listing.title}
          </h3>

          <span className="text-indigo-600 font-extrabold ml-2 text-sm">
            {Number(listing.price).toLocaleString("tr-TR")} TL
          </span>
        </div>

        <p className="text-gray-500 text-xs mb-4 line-clamp-1">
          {listing.description}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400">
              📅{" "}
              {listing.created_at
                ? formatDistanceToNow(new Date(listing.created_at), {
                  addSuffix: true,
                  locale: tr,
                })
                : "Yeni eklendi"}
            </span>

            <span className="text-[10px] font-medium text-orange-600 uppercase">
              🏷️ {listing.condition || "İkinci El"}
            </span>
          </div>

          <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-tight">
            İncele →
          </button>
        </div>
      </div>
    </div>
  );
};