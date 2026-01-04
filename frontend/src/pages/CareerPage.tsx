/**
 * Career Page
 * 
 * Spec: 008-career-page/spec.md
 * 
 * İş, staj ve proje ilanları sayfası
 */

import React from 'react';
import { MainLayout } from '../components/layout/MainLayout';

export const CareerPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="w-full px-8 xl:px-16 py-8">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <span className="mr-3">💼</span>
              Kariyer
            </h1>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
              + İlan Oluştur
            </button>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="text-center py-16">
              <span className="text-6xl block mb-4">💼</span>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Kariyer Özelliği Yakında
              </h2>
              <p className="text-gray-600 mb-6">
                İş, staj ve proje ilanları özelliği şu anda geliştirilme aşamasında.
              </p>
              <p className="text-sm text-gray-500">
                İş ilanları paylaşabilir, startup ekibi oluşturabilir ve proje arkadaşı bulabilirsiniz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

