/**
 * Landing Page - Ana Sayfa
 * 
 * Spec: 001-landing-page/spec.md
 * 
 * Public ana sayfa - kimlik doğrulaması gerektirmez
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Sticky */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div 
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => navigate('/')}
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">📚</span>
              <h1 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                KAMPÜS+
              </h1>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Giriş Yap
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Kayıt Ol
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Gradient Animation Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 animate-gradient-shift bg-[length:200%_200%]"></div>
        
        {/* Content */}
        <div className="relative z-10 text-center max-w-4xl px-8 py-20">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            KAMPÜS+ ile Öğrenme Deneyiminizi Dönüştürün
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8">
            7/24 aktif yapay zeka asistanı ile tüm sorularınıza hızlı cevap
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform"
          >
            Hemen Kayıt Ol
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-600">
            © 2025 KAMPÜS+ - Tüm hakları saklıdır
          </p>
        </div>
      </footer>

      {/* CSS Animation */}
      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-shift {
          animation: gradient-shift 15s ease infinite;
        }
      `}</style>
    </div>
  );
};

