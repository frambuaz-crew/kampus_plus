/**
 * Global Search Page
 * 
 * Spec: 019-global-search/spec.md
 * 
 * Platform geneli arama sayfası
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';

export const GlobalSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      navigate(`/dashboard/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <MainLayout>
      <div className="w-full px-8 xl:px-16 py-8">
        <div className="max-w-[1920px] mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-3">🔍</span>
            Arama
          </h1>
          
          {/* Search Form */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Konu, kullanıcı veya içerik ara..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Ara
              </button>
            </form>
          </div>

          {/* Results */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            {query ? (
              <div className="text-center py-16">
                <span className="text-6xl block mb-4">🔍</span>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Arama Özelliği Yakında
                </h2>
                <p className="text-gray-600 mb-4">
                  Arama sorgusu: <strong>"{query}"</strong>
                </p>
                <p className="text-sm text-gray-500">
                  Platform geneli arama özelliği şu anda geliştirilme aşamasında.
                </p>
              </div>
            ) : (
              <div className="text-center py-16">
                <span className="text-6xl block mb-4">🔍</span>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Ne Aramak İstersiniz?
                </h2>
                <p className="text-gray-600">
                  Yukarıdaki arama kutusuna sorgunuzu girin.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

