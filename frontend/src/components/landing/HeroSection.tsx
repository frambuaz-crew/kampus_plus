/**
 * Hero Section Component
 * 
 * Spec: 001-landing-page/spec.md
 * 
 * Landing page hero section:
 * - Ana başlık: "KAMPÜS+ ile Öğrenme Deneyiminizi Dönüştürün"
 * - Alt başlık: "7/24 aktif yapay zeka asistanı ile tüm sorularınıza hızlı cevap"
 * - CTA butonu: "Hemen Kayıt Ol" → /register
 * - Gradient animasyon arka plan
 * - Center aligned
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main 
      className="flex-1 flex items-center justify-center relative overflow-hidden"
      aria-label="Landing page content"
    >
      {/* Gradient Animation Background */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 animate-gradient-shift bg-[length:200%_200%]"
        aria-hidden="true"
      />
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <h1 
          className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 md:mb-6 animate-fade-in-up"
          id="hero-heading"
        >
          KAMPÜS+ ile Öğrenme Deneyiminizi Dönüştürün
        </h1>
        <p 
          className="text-lg sm:text-xl md:text-2xl text-white/90 mb-6 md:mb-8 animate-fade-in-up"
          style={{ animationDelay: '0.2s' }}
        >
          7/24 aktif yapay zeka asistanı ile tüm sorularınıza hızlı cevap
        </p>
        <button
          onClick={() => navigate('/register')}
          className="px-6 md:px-8 py-3 md:py-4 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 transition-all text-base md:text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 animate-fade-in-up"
          style={{ animationDelay: '0.4s' }}
          aria-label="Hemen kayıt ol"
        >
          Hemen Kayıt Ol
        </button>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-shift {
          animation: gradient-shift 15s ease infinite;
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </main>
  );
};

