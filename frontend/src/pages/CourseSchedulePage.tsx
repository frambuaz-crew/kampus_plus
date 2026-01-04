/**
 * Course Schedule Page
 * 
 * Spec: 006-academic-features/spec.md
 * 
 * Ders programı sayfası
 */

import React from 'react';
import { MainLayout } from '../components/layout/MainLayout';

export const CourseSchedulePage: React.FC = () => {
  return (
    <MainLayout>
      <div className="w-full px-8 xl:px-16 py-8">
        <div className="max-w-[1920px] mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-3">📅</span>
            Ders Programım
          </h1>
          
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="text-center py-16">
              <span className="text-6xl block mb-4">📅</span>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Ders Programı Yakında
              </h2>
              <p className="text-gray-600 mb-6">
                Ders programı özelliği şu anda geliştirilme aşamasında.
              </p>
              <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                📤 Katkıda Bulun
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

