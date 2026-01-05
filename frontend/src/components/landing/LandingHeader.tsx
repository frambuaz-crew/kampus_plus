/**
 * Landing Header Component
 * 
 * Spec: 001-landing-page/spec.md
 * 
 * Public landing page header:
 * - Logo (sol) - tıklanabilir, ana sayfaya döner
 * - Login ve Register butonları (sağ üst)
 * - Sticky/fixed positioning
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header 
      className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm"
      aria-label="Site header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo - Sol */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => navigate('/')}
            role="button"
            tabIndex={0}
            aria-label="Ana sayfaya dön"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/');
              }
            }}
          >
            <span className="text-3xl md:text-4xl group-hover:scale-110 transition-transform">
              📚
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
              KAMPÜS+
            </h1>
          </div>

          {/* Actions - Sağ Üst */}
          <nav className="flex items-center space-x-3 md:space-x-4" aria-label="Main navigation">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label="Giriş yap"
            >
              Giriş Yap
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-4 md:px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label="Kayıt ol"
            >
              Kayıt Ol
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

