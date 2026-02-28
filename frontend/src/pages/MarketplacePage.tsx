import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../api/config';
import { MainLayout } from '../components/layout/MainLayout';
import { ListingCard } from '../components/marketplace/ListingCard';
import { NewListingForm } from '../components/marketplace/NewListingForm';
import { ListingDetailView } from '../components/marketplace/ListingDetailView';

// --- GÜNCEL TİP TANIMI (SARI YENİ) ---
export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  status: string;
  image_urls: string | null;
  created_at: string;
  creator?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    university: string;
  };
}

export const MarketplacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [listings, setListings] = useState<Listing[]>([]); // any yerine Listing[] (SARI YENİ)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null); // any yerine Listing | null (SARI YENİ)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

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

  useEffect(() => {
    if (id && view === 'list' && listings.length > 0) {
      const found = listings.find(l => l.id === id);
      if (found) {
        setSelectedListing(found);
        setView('detail');
      }
    }
  }, [id, listings, view]);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/marketplace/');
      const sortedData = (response.data || []).sort((a: Listing, b: Listing) =>
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

  const handleListingClick = (listing: Listing) => {
    setSelectedListing(listing);
    setView('detail');
  };

  const filteredListings = categoryFilter
    ? listings.filter((l: Listing) => l.category === categoryFilter)
    : listings;

  return (
    <MainLayout>
      <div className="w-full px-8 xl:px-16 py-8">
        <div className="max-w-[1920px] mx-auto">
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

          {view === 'new' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <button onClick={() => setView('list')} className="mb-4 text-indigo-600 font-bold underline flex items-center">← Geri Dön</button>
              <NewListingForm onSubmit={handleCreateListing} onCancel={() => setView('list')} isSubmitting={isSubmitting} />
            </div>
          ) : view === 'detail' && selectedListing ? (
            <div className="animate-in fade-in zoom-in-95">
              <button
                onClick={() => {
                  if ((location.state as any)?.from) {
                    navigate((location.state as any).from, { state: { tab: (location.state as any).tab } });
                  } else {
                    setView('list');
                    if (id) navigate('/dashboard/marketplace');
                  }
                }}
                className="mb-6 text-indigo-600 font-bold underline flex items-center"
              >
                ← Geri Dön
              </button>
              <ListingDetailView
                listing={selectedListing}
                onBack={() => {
                  setView('list');
                  if (id) navigate('/dashboard/marketplace');
                }}
                onDelete={handleDeleteListing}
                currentUserId={currentUserId}
                onContact={(creator) => console.log("İletişim kurulacak kişi:", creator)} // SARI YENİ
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredListings.map((item: Listing) => (
                <div key={item.id} onClick={() => handleListingClick(item)} className="cursor-pointer">
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