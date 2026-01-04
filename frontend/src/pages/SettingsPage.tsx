/**
 * SettingsPage Component
 * 
 * Spec: 011-settings/spec.md
 * 
 * Kullanıcı ayarları sayfası:
 * - Şifre değiştirme
 * - Tema seçimi (Dark/Light Mode)
 * - İletişim formu
 * - Hesap silme (soft-delete)
 * 
 * NOT: Profil bilgileri (username, bio, profile picture) ProfilePage'de yönetilir.
 */

import React from 'react';
import { MainLayout } from '../components/layout/MainLayout';

export const SettingsPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">⚙️ Ayarlar</h1>
          <p className="text-gray-600 mt-2">
            Hesap ayarlarınızı buradan yönetebilirsiniz.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Ayarlar Sayfası Geliştiriliyor
            </h2>
            <p className="text-gray-600">
              Bu sayfa yakında kullanıma açılacak.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

