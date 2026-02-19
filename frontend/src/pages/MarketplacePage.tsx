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
  const [categoryFilter, setCategoryFilter] = useState('');

  // useAuth yerine doğrudan localStorage kullanıyoruz (Hata almanı engeller)
  const getCurrentUserId = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed.id || parsed.user_id;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const currentUserId = getCurrentUserId();

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/marketplace/');
      const sortedData = (response.data || []).sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setListings(sortedData);
    } catch (err) {
      setError('İlanlar şu an getirilemiyor.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      await apiClient.delete(`/marketplace/${listingId}`);
      setView('list');
      await loadListings();
    } catch (err) {
      setError('İlan silinirken bir hata oluştu.');
    }
  };

  const handleCreateListing = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      await apiClient.post('/marketplace/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setView('list');
      await loadListings();
    } catch (err) {
      setError('İlan oluşturulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleListingClick = (listing: any) => {
    setSelectedListing(listing);
    setView('detail');
  };

  const filteredListings = categoryFilter 
    ? listings.filter((l: any) => l.category === categoryFilter)
    : listings;

  return (
    <MainLayout>
      <div className="w-full px-8 xl:px-16 py-8">
        <div className="max-w-[1920px] mx-auto">
          {/* Header ve Filtreler */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <span className="mr-3">🛒</span> Kampüs Pazar
            </h1>
            <div className="flex items-center gap-3">
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
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
                <button onClick={() => setView('new')} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold shadow-md">
                  + İlan Ver
                </button>
              )}
            </div>
          </div>

          {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg animate-pulse">⚠️ {error}</div>}

          {/* Görünüm Yönetimi */}
          {view === 'new' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <button onClick={() => setView('list')} className="mb-4 text-indigo-600 font-bold underline flex items-center">← Geri Dön</button>
              <NewListingForm onSubmit={handleCreateListing} onCancel={() => setView('list')} isSubmitting={isSubmitting} />
            </div>
          ) : view === 'detail' && selectedListing ? (
            <div className="animate-in fade-in zoom-in-95">
              <button onClick={() => setView('list')} className="mb-6 text-indigo-600 font-bold underline flex items-center">← Geri Dön</button>
              <ListingDetailView 
                listing={selectedListing} 
                onBack={() => setView('list')}
                onDelete={handleDeleteListing}
                currentUserId={currentUserId} 
                onContact={(id) => console.log("Satıcı ID:", id)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredListings.map((item: any) => (
                <div key={item.id} onClick={() => handleListingClick(item)}>
                  <ListingCard listing={item} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};