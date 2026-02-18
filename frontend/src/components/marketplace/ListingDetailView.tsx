import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ListingDetailViewProps {
  listing: any;
  onBack: () => void;
  onContact: (sellerId: string) => void;
}

export const ListingDetailView: React.FC<ListingDetailViewProps> = ({ 
  listing, 
  onBack,
  onContact 
}) => {
  const baseUrl = "http://localhost:8000";
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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
                  className={`w-16 h-16 rounded-lg border-2 overflow-hidden ${activeImageIndex === index ? 'border-indigo-600' : 'border-transparent'}`}
                >
                  <img src={`${baseUrl}${img}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:w-1/2 p-8 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-widest">{listing.category}</span>
              <span className="text-xs text-gray-400">{listing.created_at ? formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: tr }) : ''}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 leading-tight uppercase">{listing.title}</h1>
            <div className="text-2xl font-bold text-indigo-600 mb-6">{Number(listing.price).toLocaleString('tr-TR')} TL</div>
            <div className="space-y-4 mb-8">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">İlan Açıklaması</h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">U</div>
              <div>
                <h4 className="font-bold text-gray-900 uppercase text-sm">Üniversite Öğrencisi</h4>
                <p className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">Kampüs İçi Satıcı</p>
              </div>
            </div>
            <button 
              onClick={() => onContact(listing.seller_id)}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all text-sm uppercase tracking-wider"
            >
              <span>💬</span> Satıcıyla İletişime Geç
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};