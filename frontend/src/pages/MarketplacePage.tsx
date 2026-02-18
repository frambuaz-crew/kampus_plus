import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/config';
import { MainLayout } from '../components/layout/MainLayout';
import { ListingCard } from '../components/marketplace/ListingCard';
import { NewListingForm } from '../components/marketplace/NewListingForm';
import { ListingDetailView } from '../components/marketplace/ListingDetailView';

export const MarketplacePage: React.FC = () => {
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtreleme state'leri
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);
      // Backend'den verileri çekiyoruz
      const response = await apiClient.get('/marketplace/');
      
      // Yeniden eskiye sıralama
      const sortedData = (response.data || []).sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setListings(sortedData);
    } catch (err) {
      console.error('İlanlar yüklenemedi:', err);
      setError('İlanlar şu an getirilemiyor.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Multipart/form-data desteği ile gönderim
      await apiClient.post('/marketplace/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setView('list');
      await loadListings();
    } catch (err) {
      console.error('İlan oluşturulamadı:', err);
      setError('İlan oluşturulurken bir hata oluştu. Lütfen görsel boyutlarını kontrol edin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleListingClick = (listing: any) => {
    setSelectedListing(listing);
    setView('detail');
  };

  // Filtrelenmiş listeyi hesapla
  const filteredListings = categoryFilter 
    ? listings.filter((l: any) => l.category === categoryFilter)
    : listings;

  return (
    <MainLayout>
      <div className="w-full px-8 xl:px-16 py-8">
        <div className="max-w-[1920px] mx-auto">
          
          {/* Sayfa Başlığı ve Kontroller */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <span className="mr-3">🛒</span>
                Kampüs Pazar
              </h1>
              <p className="text-gray-500 text-sm mt-1">Üniversitendeki güvenli alışveriş noktası.</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Kategori Filtresi */}
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={view !== 'list'}
              >
                <option value="">Tüm Kategoriler</option>
                <option value="Kitap">Kitap</option>
                <option value="Elektronik">Elektronik</option>
                <option value="Eşya">Eşya</option>
                <option value="Giyim">Giyim</option>
                <option value="Hobi">Hobi</option>
                <option value="Diğer">Diğer</option>
              </select>

              {view === 'list' && (
                <button 
                  onClick={() => setView('new')}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold shadow-md active:scale-95"
                >
                  + İlan Ver
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium animate-bounce">
              ⚠️ {error}
            </div>
          )}

          {/* Dinamik Görünüm Yönetimi */}
          {view === 'new' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button 
                onClick={() => setView('list')}
                className="mb-4 text-indigo-600 font-bold hover:underline flex items-center"
              >
                ← İlanlara Geri Dön
              </button>
              <NewListingForm 
                onSubmit={handleCreateListing}
                onCancel={() => setView('list')}
                isSubmitting={isSubmitting}
              />
            </div>
          ) : view === 'detail' && selectedListing ? (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <button 
                onClick={() => setView('list')}
                className="mb-6 text-indigo-600 font-bold hover:underline flex items-center"
              >
                ← İlanlara Geri Dön
              </button>
              <ListingDetailView 
                listing={selectedListing} 
                onBack={() => setView('list')}
                onContact={(sellerId) => {
                  console.log("Mesajlaşma başlatılıyor Satıcı ID:", sellerId);
                  // Chat modülü entegrasyonu buraya gelecek
                }}
              />
            </div>
          ) : (
            <>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="bg-gray-100 animate-pulse h-80 rounded-xl"></div>
                  ))}
                </div>
              ) : filteredListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredListings.map((item: any) => (
                    <div key={item.id} onClick={() => handleListingClick(item)}>
                      <ListingCard listing={item} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-20 text-center">
                  <span className="text-7xl block mb-6">🔍</span>
                  <h2 className="text-2xl font-bold text-gray-900">Aradığın ilanı bulamadık</h2>
                  <p className="text-gray-500 mt-2 max-w-md mx-auto">
                    {categoryFilter 
                      ? `${categoryFilter} kategorisinde henüz ilan yok. Filtreyi temizleyebilirsin.`
                      : "Henüz hiç ilan verilmemiş. İlk ilanı sen vermek ister misin?"}
                  </p>
                  {categoryFilter && (
                    <button 
                      onClick={() => setCategoryFilter('')}
                      className="mt-6 text-indigo-600 font-bold hover:underline"
                    >
                      Filtreyi Temizle
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};