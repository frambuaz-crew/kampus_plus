import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../api/config';
import { MainLayout } from '../components/layout/MainLayout';
import { ListingCard } from '../components/marketplace/ListingCard';
import { NewListingForm } from '../components/marketplace/NewListingForm';
import { ListingDetailView } from '../components/marketplace/ListingDetailView';
import type { MarketplaceListing } from '../types/marketplace';

interface BackState {
  from?: string;
  tab?: string;
}

export const MarketplacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

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

  useEffect(() => {
    void loadListings();
  }, []);

  useEffect(() => {
    if (!id || listings.length === 0) return;

    const found = listings.find((listing) => listing.id === id);
    if (found) {
      setSelectedListing(found);
      setView('detail');
    }
  }, [id, listings]);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<MarketplaceListing[]>('/marketplace/');
      const sortedData = (response.data || []).sort(
        (left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime(),
      );
      setListings(sortedData);
    } catch {
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
      if (id) {
        navigate('/dashboard/marketplace', { replace: true });
      }
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
      setView('list');
      await loadListings();
    } catch {
      setError('İlan oluşturulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleListingClick = (listing: MarketplaceListing) => {
    setSelectedListing(listing);
    setView('detail');
    navigate(`/dashboard/marketplace/${listing.id}`, { state: location.state });
  };

  const goBackFromDetail = () => {
    const state = (location.state as BackState | null) || null;
    if (state?.from) {
      navigate(state.from, { state: state.tab ? { tab: state.tab } : undefined });
      return;
    }

    setView('list');
    setSelectedListing(null);
    if (id) {
      navigate('/dashboard/marketplace', { replace: true });
    }
  };

  const filteredListings = categoryFilter
    ? listings.filter((listing) => listing.category === categoryFilter)
    : listings;

  return (
    <MainLayout>
      <div className="w-full px-8 py-8 xl:px-16">
        <div className="mx-auto max-w-[1920px]">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <h1 className="flex items-center text-3xl font-bold text-gray-900">
              <span className="mr-3">🛒</span> Kampüs Pazar
            </h1>
            <div className="flex items-center gap-3">
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
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
                  className="rounded-lg bg-indigo-600 px-6 py-2.5 font-bold text-white shadow-md"
                >
                  + İlan Ver
                </button>
              )}
            </div>
          </div>

          {error && <div className="mb-6 animate-pulse rounded-lg bg-red-50 p-4 text-red-700">⚠️ {error}</div>}

          {view === 'new' ? (
            <div className="animate-in slide-in-from-bottom-4 fade-in">
              <button
                onClick={() => setView('list')}
                className="mb-4 flex items-center font-bold text-indigo-600 underline"
              >
                ← Geri Dön
              </button>
              <NewListingForm onSubmit={handleCreateListing} onCancel={() => setView('list')} isSubmitting={isSubmitting} />
            </div>
          ) : view === 'detail' && selectedListing ? (
            <div className="animate-in zoom-in-95 fade-in">
              <button
                onClick={goBackFromDetail}
                className="mb-6 flex items-center font-bold text-indigo-600 underline"
              >
                ← Geri Dön
              </button>
              <ListingDetailView
                listing={selectedListing}
                onBack={goBackFromDetail}
                onDelete={handleDeleteListing}
                currentUserId={currentUserId || undefined}
                onContact={(creator) => {
                  console.log('İletişim kurulacak kişi:', creator);
                }}
              />
            </div>
          ) : loading ? (
            <div className="py-20 text-center text-gray-500">İlanlar yükleniyor...</div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredListings.map((item) => (
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
