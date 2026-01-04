/**
 * Dashboard - Ana Sayfa
 * 
 * Spec: 004-dashboard/spec.md
 * 
 * İçerik:
 * 1. Hero Section (Dinamik selamlaşma)
 * 2. Bugün Derslerim Widget
 * 3. Yaklaşan Etkinlikler Widget
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MainLayout } from '../components/layout/MainLayout';

export const NewDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dinamik selamlaşma - Spec'e göre (004-dashboard)
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '🌅 Günaydın';
    if (hour >= 12 && hour < 18) return '☀️ İyi günler';
    if (hour >= 18 && hour < 22) return '🌆 İyi akşamlar';
    return '🌙 İyi geceler';
  };

  return (
    <MainLayout>
      <div className="w-full px-8 xl:px-16 py-8">
        <div className="max-w-[1920px] mx-auto space-y-8">
          
          {/* Hero Section */}
          <div className="min-h-[400px] flex items-center justify-center bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl shadow-lg text-white relative overflow-hidden">
            {/* Gradient animasyon arka plan */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 animate-gradient-shift bg-[length:200%_200%]"></div>
            
            <div className="relative z-10 text-center max-w-4xl px-8">
              <h1 className="text-5xl font-bold mb-4">
                {getGreeting()}, {user?.first_name}!
              </h1>
              <p className="text-xl text-white/90">
                Bugün ne öğrenmek istersin?
              </p>
            </div>
          </div>

          {/* Akademik Widget'lar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Bugün Derslerim Widget */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📅</span>
                BUGÜN DERSLERİM
              </h2>
              
              {/* TODO: API'den bugünün dersleri çekilecek (006-academic-features) */}
              <div className="text-center py-12 text-gray-500">
                <span className="text-4xl block mb-3">📭</span>
                <p className="font-medium mb-2">Henüz Veri Yok</p>
                <p className="text-sm mb-4">
                  Üniversitenizin ders programı verilerine henüz erişemedik.
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  💡 Ders programınızı paylaşarak diğer öğrencilere yardımcı olabilirsiniz!
                </p>
                <button
                  onClick={() => navigate('/dashboard/course-schedule')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  📤 Katkıda Bulun
                </button>
              </div>

              {/* Veri varsa gösterilecek (gelecekte) */}
              {/* 
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  Pazartesi, 15 Eylül 2025
                </p>
                <div className="border-l-4 border-indigo-500 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">📚 10:00-10:45 Biology</p>
                      <p className="text-sm text-gray-600">📍 MB120 • Prof. Dr. Ahmet Yılmaz</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/dashboard/course-schedule')}
                  className="w-full mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                >
                  📅 Tüm Haftalık Programım
                </button>
              </div>
              */}
            </div>

            {/* Yaklaşan Etkinlikler Widget */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">⏰</span>
                YAKLAŞAN ETKİNLİKLER
              </h2>
              
              {/* TODO: API'den yaklaşan etkinlikler çekilecek (006-academic-features) */}
              <div className="text-center py-12 text-gray-500">
                <span className="text-4xl block mb-3">📭</span>
                <p className="font-medium mb-2">Henüz Veri Yok</p>
                <p className="text-sm mb-4">
                  Üniversitenizin akademik takvim verilerine henüz erişemedik.
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  💡 Akademik takviminizi paylaşarak diğer öğrencilere yardımcı olabilirsiniz!
                </p>
                <button
                  onClick={() => navigate('/dashboard/academic-calendar')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  📤 Katkıda Bulun
                </button>
              </div>

              {/* Veri varsa gösterilecek (gelecekte) */}
              {/* 
              <div className="space-y-3">
                <div className="border-l-4 border-red-500 pl-4 py-2">
                  <p className="text-xs text-red-600 font-semibold mb-1">🔴 3 gün kaldı:</p>
                  <p className="font-semibold text-gray-900">📝 Ara Sınav Haftası</p>
                  <p className="text-sm text-gray-600">8-16 Kasım 2025</p>
                </div>
                <div className="border-l-4 border-yellow-500 pl-4 py-2">
                  <p className="text-xs text-yellow-600 font-semibold mb-1">🟡 12 gün kaldı:</p>
                  <p className="font-semibold text-gray-900">⚠️ Dersten Çekilme Son Gün</p>
                  <p className="text-sm text-gray-600">31 Ekim 2025</p>
                </div>
                <button
                  onClick={() => navigate('/dashboard/academic-calendar')}
                  className="w-full mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                >
                  ⏰ Tüm Akademik Takvim
                </button>
              </div>
              */}
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

