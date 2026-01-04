/**
 * AI Assistant Page
 * 
 * Spec: 009-ai-assistant/spec.md
 * 
 * AI asistanı ile sohbet sayfası
 */

import React from 'react';
import { MainLayout } from '../components/layout/MainLayout';

export const AIAssistantPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="w-full px-8 xl:px-16 py-8">
        <div className="max-w-[1920px] mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-3">🤖</span>
            AI Asistanım
          </h1>
          
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="text-center py-16">
              <span className="text-6xl block mb-4">🤖</span>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                AI Asistanı Yakında
              </h2>
              <p className="text-gray-600 mb-6">
                AI asistanı özelliği şu anda geliştirilme aşamasında.
              </p>
              <p className="text-sm text-gray-500">
                AI asistanı ile ders programınızı sorgulayabilir, akademik takvimi kontrol edebilir ve forum'da arama yapabilirsiniz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

