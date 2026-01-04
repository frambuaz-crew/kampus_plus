/**
 * Messages Chat Page
 * 
 * Spec: 013-messages/spec.md
 * 
 * Mesajlaşma detay sayfası
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';

export const MessagesChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <MainLayout>
      <div className="w-full px-8 xl:px-16 py-8">
        <div className="max-w-[1920px] mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-3">💬</span>
            Mesajlaşma
          </h1>
          
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="text-center py-16">
              <span className="text-6xl block mb-4">💬</span>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Mesajlaşma Özelliği Yakında
              </h2>
              <p className="text-gray-600 mb-4">
                Konuşma ID: <strong>{id}</strong>
              </p>
              <p className="text-sm text-gray-500">
                Mesajlaşma detay sayfası şu anda geliştirilme aşamasında.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

