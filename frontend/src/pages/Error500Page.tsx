/**
 * Error 500 Page
 * 
 * Spec: 020-error-pages/spec.md
 * 
 * Sunucu hatası
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Error500Page: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-red-600 mb-4">500</h1>
        <h2 className="text-3xl font-semibold text-gray-900 mb-4">
          Sunucu Hatası
        </h2>
        <p className="text-gray-600 mb-8">
          Bir şeyler ters gitti. Lütfen daha sonra tekrar deneyin.
        </p>
        <div className="space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Ana Sayfaya Dön
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Sayfayı Yenile
          </button>
        </div>
      </div>
    </div>
  );
};

