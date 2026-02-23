import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Link } from 'react-router-dom'; // EKLE

interface ListingDetailViewProps {
  listing: any;
  onBack: () => void;
  onContact: (creator: any) => void; // GÜNCELLENDİ (SARI YENİ)
  onDelete?: (listingId: string) => Promise<void>;
  currentUserId?: string;
}

export const ListingDetailView: React.FC<ListingDetailViewProps> = ({ 
  listing, 
  onBack,
  onContact,
  onDelete,
  currentUserId
}) => {
  const baseUrl = "http://localhost:8000";
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // İlan sahibi kontrolü (SARI YENİ - Artık seller_id yerine creator.id de kullanılabilir ama db'den gelen seller_id de duruyor)
  const isOwner = currentUserId === listing.seller_id;

  const getImages = () => {
    try {
      if (!listing || !listing.image_urls) return [];
      const parsed = typeof listing.image_urls === 'string' 
        ? JSON.parse(listing.image_urls) 
        : listing.image_urls;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const images = getImages();

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col lg:flex-row">
        
        {/* Sol Taraf: Fotoğraflar ve Galeri */}
        <div className="lg:w-1/2 bg-gray-50 p-4">
          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-white shadow-inner flex items-center justify-center border border-gray-200">
            {images.length > 0 ? (
              <img 
                src={`${baseUrl}${images[activeImageIndex].startsWith('/') ? images[activeImageIndex] : '/' + images[activeImageIndex]}`} 
                className="w-full h-full object-contain"
                alt={listing.title}
              />
            ) : (
              <div className="text-8xl">📦</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-4 justify-center">
              {images.map((img: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  className={`w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${
                    activeImageIndex === index ? 'border-indigo-600 ring-2 ring-indigo-50' : 'border-transparent opacity-60'
                  }`}
                >
                  <img src={`${baseUrl}${img.startsWith('/') ? img : '/' + img}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sağ Taraf: Detaylar ve Satıcı Bilgisi */}
        <div className="lg:w-1/2 p-8 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                {listing.category}
              </span>
              <span className="text-xs text-gray-400">
                {listing.created_at ? formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: tr }) : ''}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 leading-tight uppercase tracking-tight">
              {listing.title}
            </h1>
            <div className="text-2xl font-bold text-indigo-600 mb-6">
              {Number(listing.price).toLocaleString('tr-TR')} TL
            </div>
            <div className="space-y-4 mb-8">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">İlan Açıklaması</h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter mb-1">Ürün Durumu</p>
                <p className="text-xs font-semibold text-gray-700">{listing.condition || 'İkinci El'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter mb-1">Konum</p>
                <p className="text-xs font-semibold text-gray-700 uppercase">{listing.creator?.university || 'Kampüs İçi'}</p> {/* GÜNCELLENDİ */}
              </div>
            </div>
          </div>

          {/* Satıcı Bilgileri ve Aksiyon Butonları */}
          <div className="pt-6 border-t border-gray-100">
            {/* PROFİL LİNKİ GÜNCELLEMESİ (SARI YENİ) */}
            <Link 
              to={`/dashboard/profile/${listing.creator?.username}`}
              className="flex items-center justify-between mb-6 group cursor-pointer p-2 rounded-xl hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-110 transition-transform uppercase">
                  {listing.creator?.first_name ? listing.creator.first_name[0] : 'U'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors uppercase text-sm">
                    {listing.creator ? `${listing.creator.first_name} ${listing.creator.last_name}` : "İlan Sahibi"}
                  </h4>
                  <p className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">
                    {listing.creator?.university || "Kampüs İçi Satıcı"}
                  </p>
                </div>
              </div>
              <span className="text-gray-300 group-hover:text-indigo-600 transition-colors text-xs font-bold">
                Profilini Gör ❯
              </span>
            </Link>

            <div className="flex flex-col gap-3">
              {!isOwner ? (
                /* Başka birinin ilanıysa: Mesaj Gönder */
                <button 
                  onClick={() => onContact(listing.creator)} // GÜNCELLENDİ (SARI YENİ)
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                >
                  <span>💬</span> Satıcıyla İletişime Geç
                </button>
              ) : (
                /* Kendi ilanıysa: Sil Butonu */
                <button 
                  onClick={() => {
                    if (window.confirm("Bu ilanı kalıcı olarak kaldırmak istediğinize emin misiniz?")) {
                      onDelete?.(listing.id);
                    }
                  }}
                  className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all border border-red-200 flex items-center justify-center gap-2 text-sm uppercase tracking-wider active:scale-95"
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